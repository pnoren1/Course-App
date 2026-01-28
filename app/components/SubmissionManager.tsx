"use client";

import { useState, useEffect } from 'react';
import { rlsSupabase } from '@/lib/supabase';
import { Assignment, AssignmentSubmission } from '@/lib/types/assignment';
import { SubmissionFile } from '@/lib/types/database.types';
import { UserWithGroup } from '@/lib/services/userService';
import { fileService } from '@/lib/services/fileService';
import FileViewer from './FileViewer';
import SubmissionComments from './SubmissionComments';
import UserGroupDisplay from './UserGroupDisplay';

interface SubmissionWithDetails extends AssignmentSubmission {
  assignment: Assignment;
  user_profile: UserWithGroup;
  files_count: number;
}

interface SubmissionManagerProps {
  submission: SubmissionWithDetails;
  onClose: () => void;
  onStatusUpdate: (submissionId: number, newStatus: string) => Promise<void>;
}

export default function SubmissionManager({ 
  submission, 
  onClose, 
  onStatusUpdate 
}: SubmissionManagerProps) {
  const [files, setFiles] = useState<SubmissionFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<SubmissionFile | null>(null);
  const [updating, setUpdating] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const [downloadingAll, setDownloadingAll] = useState(false);
  const [loadedSubmissionId, setLoadedSubmissionId] = useState<number | null>(null);

  useEffect(() => {
    // רק טען קבצים אם זה submission חדש או אם עדיין לא נטענו קבצים
    if (submission.id !== loadedSubmissionId) {
      loadFiles();
    }
    
    // Add keyboard shortcuts
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [submission.id, loadedSubmissionId, onClose]);

  const refreshFiles = async () => {
    // נקה cache ורענן
    fileService.clearSubmissionCache(submission.id);
    await loadFiles();
  };

  const loadFiles = async () => {
    try {
      setLoading(true);
      const submissionFiles = await fileService.getFilesBySubmission(submission.id);
      setFiles(submissionFiles);
      setLoadedSubmissionId(submission.id);
    } catch (error) {
      console.error('Error loading files:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    try {
      setUpdating(true);
      setUpdatingStatus(newStatus);
      await onStatusUpdate(submission.id, newStatus);
    } catch (error) {
      console.error('Error updating status:', error);
    } finally {
      setUpdating(false);
      setUpdatingStatus(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'submitted': { label: 'הוגשה', color: 'bg-blue-100 text-blue-800' },
      'reviewed': { label: 'נבדקה', color: 'bg-green-100 text-green-800' },
      'needs_revision': { label: 'דורשת תיקון', color: 'bg-yellow-100 text-yellow-800' },
      'approved': { label: 'אושרה', color: 'bg-emerald-100 text-emerald-800' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || 
                  { label: status, color: 'bg-gray-100 text-gray-800' };
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        {config.label}
      </span>
    );
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const downloadAllFiles = async () => {
    if (files.length === 0) return;
    
    try {
      setDownloadingAll(true);
      
      for (const file of files) {
        try {
          // Get signed URL for each file
          const { data: signedUrlData, error } = await rlsSupabase.storage
            .from('assignment-submissions')
            .createSignedUrl(file.storage_path, 3600);

          if (error || !signedUrlData?.signedUrl) {
            console.error('Error getting signed URL for file:', file.original_filename, error);
            continue;
          }

          // Download file using a more reliable method
          const response = await fetch(signedUrlData.signedUrl);
          if (!response.ok) {
            console.error('Failed to fetch file:', file.original_filename, response.statusText);
            continue;
          }
          
          const blob = await response.blob();
          
          // Create download link
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.original_filename;
          a.style.display = 'none';
          
          // Add to DOM, click, and remove
          document.body.appendChild(a);
          a.click();
          
          // Clean up after a short delay
          setTimeout(() => {
            try {
              if (a.parentNode === document.body) {
                document.body.removeChild(a);
              }
              window.URL.revokeObjectURL(url);
            } catch (cleanupError) {
              console.warn('Error during cleanup for file:', file.original_filename, cleanupError);
            }
          }, 100);
          
          // Small delay between downloads to avoid overwhelming the browser
          await new Promise(resolve => setTimeout(resolve, 300));
        } catch (fileError) {
          console.error('Error downloading file:', file.original_filename, fileError);
        }
      }
    } catch (error) {
      console.error('Error downloading files:', error);
    } finally {
      setDownloadingAll(false);
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith('image/')) {
      return (
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    } else if (fileType.includes('pdf')) {
      return (
        <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    } else if (fileType.includes('text') || fileType.includes('document')) {
      return (
        <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    } else {
      return (
        <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
        </svg>
      );
    }
  };

  return (
    <>
      {/* Modal Overlay */}
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200">
            <div className="flex items-center gap-4">
              <div className="inline-flex items-center justify-center w-10 h-10 bg-blue-100 rounded-lg">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900">
                  {submission.assignment.title}
                </h2>
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <span>הגשה של {submission.user_profile?.user_name || 'משתמש לא ידוע'}</span>
                  {submission.user_profile?.email && (
                    <>
                      <span className="text-slate-400">•</span>
                      <span>{submission.user_profile.email}</span>
                    </>
                  )}
                  {submission.user_profile && (
                    <>
                      <span className="text-slate-400">•</span>
                      <UserGroupDisplay 
                        user={submission.user_profile}
                        showOrganization={true}
                        size="sm"
                      />
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="flex h-[calc(90vh-120px)]">
            {/* Left Panel - Files */}
            <div className="w-1/3 p-6 overflow-y-auto border-r border-slate-200">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-slate-900">
                  קבצים ({files.length})
                </h3>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={refreshFiles}
                    disabled={loading}
                    className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    רענן
                  </button>
                  
                  {files.length > 0 && (
                    <button
                      onClick={downloadAllFiles}
                      disabled={downloadingAll}
                      className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg border border-blue-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                    >
                      {downloadingAll ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 718-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          מוריד...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 712-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          הורד הכל
                        </>
                      )}
                    </button>
                  )}
                </div>
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="inline-flex items-center gap-2 text-slate-600">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 818-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    טוען קבצים...
                  </div>
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  לא נמצאו קבצים בהגשה זו
                </div>
              ) : (
                <div className="space-y-2">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-2 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                      onClick={() => setSelectedFile(file)}
                    >
                      {getFileIcon(file.file_type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {file.original_filename}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatFileSize(file.file_size_bytes)}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedFile(file);
                        }}
                        className="p-1.5 text-slate-400 hover:text-slate-600 rounded hover:bg-slate-200"
                        title="צפייה בקובץ"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right Panel - Submission Details */}
            <div className="w-2/3 p-6 overflow-y-auto">
              <div className="space-y-3">
                {/* Status */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-900">סטטוס</span>
                    {getStatusBadge(submission.status)}
                  </div>
                  
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleStatusUpdate('reviewed')}
                      disabled={updating || submission.status === 'reviewed'}
                      className="flex-1 p-1.5 bg-green-50 hover:bg-green-100 text-green-700 rounded border border-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex flex-col items-center"
                      title="סמן כנבדקה"
                    >
                      {updating && updatingStatus === 'reviewed' ? (
                        <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 818-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      )}
                      <span className="text-xs mt-0.5">נבדקה</span>
                    </button>
                    
                    <button
                      onClick={() => handleStatusUpdate('approved')}
                      disabled={updating || submission.status === 'approved'}
                      className="flex-1 p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex flex-col items-center"
                      title="אשר הגשה"
                    >
                      {updating && updatingStatus === 'approved' ? (
                        <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 818-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                      <span className="text-xs mt-0.5">אושרה</span>
                    </button>
                    
                    <button
                      onClick={() => handleStatusUpdate('needs_revision')}
                      disabled={updating || submission.status === 'needs_revision'}
                      className="flex-1 p-1.5 bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded border border-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex flex-col items-center"
                      title="דורש תיקון"
                    >
                      {updating && updatingStatus === 'needs_revision' ? (
                        <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 818-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 714 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                      ) : (
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      )}
                      <span className="text-xs mt-0.5">תיקון</span>
                    </button>
                  </div>
                </div>

                {/* Submission Info */}
                <div className="bg-slate-50 rounded p-2">
                  <div className="text-xs text-slate-600 mb-1">פרטי הגשה</div>
                  <div className="flex items-center justify-between text-xs gap-2">
                    <span className="whitespace-nowrap">
                      {new Date(submission.submission_date).toLocaleDateString('he-IL', {
                        day: '2-digit',
                        month: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <span className="whitespace-nowrap">{files.length} קבצים</span>
                  </div>
                </div>

                {/* Assignment Info */}
                {(submission.assignment.description || submission.assignment.due_date) && (
                  <div className="bg-slate-50 rounded p-2">
                    <div className="text-xs text-slate-600 mb-1">פרטי המטלה</div>
                    <div className="text-xs text-slate-900 space-y-0.5">
                      {submission.assignment.description && (
                        <div>{submission.assignment.description}</div>
                      )}
                      {submission.assignment.due_date && (
                        <div className="text-slate-600">
                          יעד: {new Date(submission.assignment.due_date).toLocaleDateString('he-IL')}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Comments Section */}
                <div>
                  <SubmissionComments submissionId={submission.id} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* File Viewer Modal */}
      {selectedFile && (
        <FileViewer
          file={selectedFile}
          onClose={() => setSelectedFile(null)}
        />
      )}
    </>
  );
}