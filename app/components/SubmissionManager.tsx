"use client";

import { useState, useEffect } from 'react';
import { rlsSupabase } from '@/lib/supabase';
import { Assignment, AssignmentSubmission } from '@/lib/types/assignment';
import { UserProfile, SubmissionFile } from '@/lib/types/database.types';
import { fileService } from '@/lib/services/fileService';
import FileViewer from './FileViewer';
import SubmissionComments from './SubmissionComments';
import UserGroupDisplay from './UserGroupDisplay';

interface SubmissionWithDetails extends AssignmentSubmission {
  assignment: Assignment;
  user_profile: UserProfile;
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

  useEffect(() => {
    loadFiles();
    
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
  }, [submission.id, onClose]);

  const loadFiles = async () => {
    try {
      setLoading(true);
      const submissionFiles = await fileService.getFilesBySubmission(submission.id);
      setFiles(submissionFiles);
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
        // Get signed URL for each file
        const { data: signedUrlData, error } = await rlsSupabase.storage
          .from('assignment-submissions')
          .createSignedUrl(file.storage_path, 3600);

        if (error || !signedUrlData?.signedUrl) {
          console.error('Error getting signed URL for file:', file.original_filename, error);
          continue;
        }

        // Download file
        const response = await fetch(signedUrlData.signedUrl);
        const blob = await response.blob();
        
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.original_filename;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Small delay between downloads
        await new Promise(resolve => setTimeout(resolve, 500));
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
        <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
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
                <p className="text-sm text-slate-600">
                  הגשה של {submission.user_profile?.user_name || 'משתמש לא ידוע'}
                </p>
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
            {/* Left Panel - Submission Details */}
            <div className="w-1/3 border-l border-slate-200 p-6 overflow-y-auto">
              <div className="space-y-6">
                {/* Status */}
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-3">סטטוס הגשה</h3>
                  <div className="flex items-center gap-2 mb-4">
                    {getStatusBadge(submission.status)}
                  </div>
                  
                  <div className="space-y-2">
                    <button
                      onClick={() => handleStatusUpdate('reviewed')}
                      disabled={updating || submission.status === 'reviewed'}
                      className="w-full px-3 py-2 text-sm bg-green-50 hover:bg-green-100 text-green-700 rounded-lg border border-green-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {updating && updatingStatus === 'reviewed' ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          מעדכן...
                        </>
                      ) : (
                        'סמן כנבדקה'
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleStatusUpdate('approved')}
                      disabled={updating || submission.status === 'approved'}
                      className="w-full px-3 py-2 text-sm bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg border border-emerald-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {updating && updatingStatus === 'approved' ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          מעדכן...
                        </>
                      ) : (
                        'אשר הגשה'
                      )}
                    </button>
                    
                    <button
                      onClick={() => handleStatusUpdate('needs_revision')}
                      disabled={updating || submission.status === 'needs_revision'}
                      className="w-full px-3 py-2 text-sm bg-yellow-50 hover:bg-yellow-100 text-yellow-700 rounded-lg border border-yellow-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                    >
                      {updating && updatingStatus === 'needs_revision' ? (
                        <>
                          <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          מעדכן...
                        </>
                      ) : (
                        'דורש תיקון'
                      )}
                    </button>
                  </div>
                </div>

                {/* Submission Info */}
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-3">פרטי הגשה</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-600">תאריך הגשה:</span>
                      <span className="text-slate-900">
                        {new Date(submission.submission_date).toLocaleDateString('he-IL', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-600">מספר קבצים:</span>
                      <span className="text-slate-900">{files.length}</span>
                    </div>
                    <div className="space-y-2">
                      <span className="text-slate-600">משתמש:</span>
                      <div className="text-slate-900">
                        <div className="font-medium">{submission.user_profile?.user_name}</div>
                        <div className="text-xs text-slate-500">{submission.user_profile?.email}</div>
                        {submission.user_profile && (
                          <div className="mt-1">
                            <UserGroupDisplay 
                              user={submission.user_profile}
                              showOrganization={true}
                              size="sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Assignment Info */}
                <div>
                  <h3 className="text-sm font-medium text-slate-700 mb-3">פרטי המטלה</h3>
                  <div className="space-y-2 text-sm">
                    <div>
                      <span className="text-slate-600">תיאור:</span>
                      <p className="text-slate-900 mt-1">
                        {submission.assignment.description || 'אין תיאור'}
                      </p>
                    </div>
                    {submission.assignment.due_date && (
                      <div className="flex justify-between">
                        <span className="text-slate-600">תאריך יעד:</span>
                        <span className="text-slate-900">
                          {new Date(submission.assignment.due_date).toLocaleDateString('he-IL')}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Comments Section */}
                <div>
                  <SubmissionComments submissionId={submission.id} />
                </div>
              </div>
            </div>

            {/* Right Panel - Files */}
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">
                  קבצים ({files.length})
                </h3>
                
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
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        מוריד...
                      </>
                    ) : (
                      <>
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        הורד הכל
                      </>
                    )}
                  </button>
                )}
              </div>
              
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="inline-flex items-center gap-2 text-slate-600">
                    <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    טוען קבצים...
                  </div>
                </div>
              ) : files.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  לא נמצאו קבצים בהגשה זו
                </div>
              ) : (
                <div className="space-y-3">
                  {files.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-4 bg-slate-50 rounded-lg hover:bg-slate-100 cursor-pointer transition-colors"
                      onClick={() => setSelectedFile(file)}
                    >
                      {getFileIcon(file.file_type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {file.original_filename}
                        </p>
                        <p className="text-xs text-slate-500">
                          {formatFileSize(file.file_size_bytes)} • {file.file_type}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedFile(file);
                          }}
                          className="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200"
                          title="צפייה בקובץ"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                          </svg>
                        </button>
                        <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                    </div>
                  ))}
                </div>
              )}
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