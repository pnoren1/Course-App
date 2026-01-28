'use client';

import { useState, useCallback } from 'react';
import { Assignment } from '../../../lib/types/assignment';
import { fileService } from '../../../lib/services/fileService';
import { assignmentService } from '../../../lib/services/assignmentService';

interface FileUploadProps {
  assignment: Assignment;
  submissionId?: number;
  userId: string;
  onUploadComplete: (files: any[]) => void;
  onUploadError?: (errorMessage: string) => void;
  disabled?: boolean;
}

export default function FileUpload({ 
  assignment, 
  submissionId, 
  userId,
  onUploadComplete, 
  onUploadError,
  disabled = false 
}: FileUploadProps) {
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<Map<number, number>>(new Map());
  const [uploadingFiles, setUploadingFiles] = useState<Set<number>>(new Set());
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [uploadedFileNames, setUploadedFileNames] = useState<string[]>([]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const newFiles = Array.from(e.dataTransfer.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setFiles(prev => [...prev, ...newFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0) return;

    try {
      setUploading(true);
      
      let currentSubmissionId = submissionId;
      
      // If no submission exists, create one first
      if (!currentSubmissionId) {
        try {
          const newSubmission = await assignmentService.createSubmission({
            assignment_id: assignment.id,
            user_id: userId,
            submission_date: new Date().toISOString(),
            status: 'submitted'
          });
          currentSubmissionId = newSubmission.id;
        } catch (error) {
          console.error('Error creating submission:', error);
          if (onUploadError) {
            onUploadError('שגיאה ביצירת הגשה חדשה');
          }
          return;
        }
      }
      
      const uploadedFiles = [];
      
      // Upload files one by one to track individual progress
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        try {
          // Mark this file as uploading
          setUploadingFiles(prev => new Set(prev).add(i));
          setUploadProgress(prev => new Map(prev).set(i, 0));
          
          // Simulate progress updates (since Supabase doesn't provide real progress)
          const progressInterval = setInterval(() => {
            setUploadProgress(prev => {
              const current = prev.get(i) || 0;
              if (current < 90) {
                return new Map(prev).set(i, current + Math.random() * 20);
              }
              return prev;
            });
          }, 200);
          
          // Upload the file
          const uploadedFile = await fileService.uploadFiles([file], currentSubmissionId, userId);
          
          // Clear progress interval and set to 100%
          clearInterval(progressInterval);
          setUploadProgress(prev => new Map(prev).set(i, 100));
          
          uploadedFiles.push(...uploadedFile);
          
          // Small delay to show 100% progress
          await new Promise(resolve => setTimeout(resolve, 300));
          
        } catch (error) {
          console.error(`Error uploading file ${file.name}:`, error);
          setUploadProgress(prev => new Map(prev).set(i, -1)); // -1 indicates error
        } finally {
          setUploadingFiles(prev => {
            const newSet = new Set(prev);
            newSet.delete(i);
            return newSet;
          });
        }
      }
      
      onUploadComplete(uploadedFiles);
      setFiles([]);
      setUploadProgress(new Map());
      
      // Show success message with file names
      const fileNames = files.map(f => f.name);
      setUploadedFileNames(fileNames);
      setShowSuccessMessage(true);
      setTimeout(() => {
        setShowSuccessMessage(false);
        setUploadedFileNames([]);
      }, 4000); // Hide after 4 seconds
      
    } catch (error) {
      console.error('Error uploading files:', error);
      if (onUploadError) {
        onUploadError(error instanceof Error ? error.message : 'שגיאה בהעלאת הקבצים');
      }
    } finally {
      setUploading(false);
    }
  };

  const validateFile = (file: File) => {
    const errors: string[] = [];
    
    // Check file type
    if (assignment.allowed_file_types.length > 0) {
      const fileExtension = file.name.split('.').pop()?.toLowerCase();
      if (!fileExtension) {
        errors.push('לא ניתן לזהות את סוג הקובץ');
        return errors;
      }
      
      // Check both with and without dot prefix
      const isAllowed = assignment.allowed_file_types.some(allowedType => {
        const normalizedAllowed = allowedType.toLowerCase().replace(/^\./, '');
        return normalizedAllowed === fileExtension;
      });
      
      if (!isAllowed) {
        errors.push(`סוג קובץ לא מורשה. סוגים מורשים: ${assignment.allowed_file_types.join(', ')}`);
      }
    }
    
    // Check file size
    const maxSizeBytes = assignment.max_file_size_mb * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      errors.push(`הקובץ גדול מדי. גודל מקסימלי: ${assignment.max_file_size_mb}MB`);
    }
    
    return errors;
  };

  return (
    <div className="space-y-4">
      {/* Success Message */}
      {showSuccessMessage && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <div className="flex-1">
              <span className="text-sm font-medium text-green-800 block mb-1">
                הקבצים הועלו בהצלחה!
              </span>
              {uploadedFileNames.length > 0 && (
                <div className="text-xs text-green-700">
                  <span className="font-medium">קבצים שהועלו:</span>
                  <ul className="mt-1 space-y-0.5">
                    {uploadedFileNames.map((fileName, index) => (
                      <li key={index} className="flex items-center gap-1">
                        <span className="w-1 h-1 bg-green-500 rounded-full"></span>
                        {fileName}
                      </li>
                    ))}
                  </ul>
                  <div className="mt-2 text-green-600 font-medium">
                    ↓ הקבצים מופיעים ברשימה למטה
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Upload Area */}
      <div
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
          dragActive 
            ? 'border-blue-400 bg-blue-50' 
            : 'border-gray-300 hover:border-gray-400'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !disabled && document.getElementById('file-input')?.click()}
      >
        <input
          id="file-input"
          type="file"
          multiple
          className="hidden"
          onChange={handleFileSelect}
          disabled={disabled}
        />
        
        <div className="space-y-2">
          <div className="text-gray-600">
            <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
              <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
          <div className="text-sm text-gray-600">
            <span className="font-medium text-blue-600 hover:text-blue-500">לחץ להעלאת קבצים</span>
            {' '}או גרור קבצים לכאן
          </div>
          <div className="text-xs text-gray-500">
            {assignment.allowed_file_types.length > 0 && (
              <div>סוגי קבצים מורשים: {assignment.allowed_file_types.join(', ')}</div>
            )}
            <div>גודל מקסימלי: {assignment.max_file_size_mb}MB</div>
          </div>
        </div>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-900">קבצים נבחרים:</h4>
          {files.map((file, index) => {
            const errors = validateFile(file);
            const progress = uploadProgress.get(index) || 0;
            const isUploading = uploadingFiles.has(index);
            const hasError = progress === -1;
            
            return (
              <div key={index} className={`p-3 rounded-lg border ${
                hasError ? 'border-red-200 bg-red-50' :
                errors.length > 0 ? 'border-red-200 bg-red-50' : 
                'border-gray-200 bg-gray-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="text-sm font-medium text-gray-900">{file.name}</div>
                    <div className="text-xs text-gray-500">
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                    {errors.length > 0 && (
                      <div className="text-xs text-red-600 mt-1">
                        {errors.map((error, i) => <div key={i}>{error}</div>)}
                      </div>
                    )}
                  </div>
                  
                  {!isUploading && !hasError && progress === 0 && (
                    <button
                      onClick={() => removeFile(index)}
                      className="text-red-600 hover:text-red-800 text-sm"
                      disabled={uploading}
                    >
                      הסר
                    </button>
                  )}
                  
                  {hasError && (
                    <div className="text-xs text-red-600 font-medium">
                      שגיאה
                    </div>
                  )}
                  
                  {progress > 0 && progress < 100 && (
                    <div className="text-xs text-blue-600 font-medium">
                      {Math.round(progress)}%
                    </div>
                  )}
                  
                  {progress === 100 && (
                    <div className="text-xs text-green-600 font-medium flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      הועלה
                    </div>
                  )}
                </div>
                
                {/* Progress Bar */}
                {(isUploading || progress > 0) && progress !== -1 && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded-full h-1.5">
                      <div 
                        className={`h-1.5 rounded-full transition-all duration-300 ${
                          progress === 100 ? 'bg-green-500' : 'bg-blue-500'
                        }`}
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Upload Button */}     
      {files.length > 0 && (
        <button
          onClick={handleUpload}
          disabled={uploading || disabled || files.some(file => validateFile(file).length > 0)}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              מעלה קבצים...
            </>
          ) : (
            submissionId ? 'העלה קבצים' : 'הגש מטלה'
          )}
        </button>
      )}
    </div>
  );
}