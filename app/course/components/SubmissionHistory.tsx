'use client';

import { AssignmentSubmission, SubmissionFile } from '../../../lib/types/assignment';
import { fileService } from '../../../lib/services/fileService';
import { useState, useEffect } from 'react';

interface SubmissionHistoryProps {
  submissions: AssignmentSubmission[];
  onFileDownload: (fileId: number) => void;
  onRefresh?: () => void;
}

export default function SubmissionHistory({ submissions, onFileDownload, onRefresh }: SubmissionHistoryProps) {
  const [submissionFiles, setSubmissionFiles] = useState<Map<number, SubmissionFile[]>>(new Map());
  const [loading, setLoading] = useState(true);
  const [loadingSubmissions, setLoadingSubmissions] = useState<Set<number>>(new Set());
  const [downloadingFiles, setDownloadingFiles] = useState<Set<number>>(new Set());

  useEffect(() => {
    const loadFiles = async () => {
      try {
        setLoading(true);
        
        // רק טען קבצים עבור הגשות שעדיין לא נטענו
        const submissionsToLoad = submissions.filter(
          submission => !submissionFiles.has(submission.id) && !loadingSubmissions.has(submission.id)
        );
        
        if (submissionsToLoad.length === 0) {
          setLoading(false);
          return;
        }

        // סמן הגשות שנטענות כרגע
        const newLoadingSet = new Set(loadingSubmissions);
        submissionsToLoad.forEach(submission => newLoadingSet.add(submission.id));
        setLoadingSubmissions(newLoadingSet);
        
        // טען קבצים במקביל במקום ברצף
        const filePromises = submissionsToLoad.map(async (submission) => {
          try {
            const files = await fileService.getFilesBySubmission(submission.id);
            return { submissionId: submission.id, files };
          } catch (error) {
            console.error(`Error loading files for submission ${submission.id}:`, error);
            return { submissionId: submission.id, files: [] };
          }
        });
        
        const results = await Promise.all(filePromises);
        
        // עדכן את המפה עם התוצאות
        setSubmissionFiles(prevMap => {
          const newMap = new Map(prevMap);
          results.forEach(({ submissionId, files }) => {
            newMap.set(submissionId, files);
          });
          return newMap;
        });
        
        // הסר הגשות מרשימת הטעינה
        setLoadingSubmissions(prevSet => {
          const newSet = new Set(prevSet);
          submissionsToLoad.forEach(submission => newSet.delete(submission.id));
          return newSet;
        });
        
      } catch (error) {
        console.error('Error loading submission files:', error);
      } finally {
        setLoading(false);
      }
    };

    if (submissions.length > 0) {
      loadFiles();
    } else {
      setLoading(false);
      setSubmissionFiles(new Map());
    }
  }, [submissions.map(s => s.id).join(','), submissionFiles, loadingSubmissions]);

  // נקה קבצים של הגשות שכבר לא קיימות
  useEffect(() => {
    const currentSubmissionIds = new Set(submissions.map(s => s.id));
    setSubmissionFiles(prevMap => {
      const newMap = new Map();
      for (const [submissionId, files] of prevMap.entries()) {
        if (currentSubmissionIds.has(submissionId)) {
          newMap.set(submissionId, files);
        }
      }
      return newMap;
    });
  }, [submissions]);

  const refreshFiles = async () => {
    // נקה cache ורענן
    fileService.clearAllCache();
    setSubmissionFiles(new Map());
    setLoadingSubmissions(new Set());
    
    // טען מחדש
    const submissionsToLoad = submissions;
    if (submissionsToLoad.length > 0) {
      setLoading(true);
      
      const filePromises = submissionsToLoad.map(async (submission) => {
        try {
          const files = await fileService.getFilesBySubmission(submission.id, true); // force refresh
          return { submissionId: submission.id, files };
        } catch (error) {
          console.error(`Error loading files for submission ${submission.id}:`, error);
          return { submissionId: submission.id, files: [] };
        }
      });
      
      const results = await Promise.all(filePromises);
      
      setSubmissionFiles(prevMap => {
        const newMap = new Map();
        results.forEach(({ submissionId, files }) => {
          newMap.set(submissionId, files);
        });
        return newMap;
      });
      
      setLoading(false);
    }
    
    if (onRefresh) {
      onRefresh();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 בתים';
    const k = 1024;
    const sizes = ['בתים', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDefaultFileIcon = () => (
    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );

  const getFileIcon = (fileName: string) => {
    if (!fileName) return getDefaultFileIcon();
    const extension = fileName.split('.').pop()?.toLowerCase();
    
    switch (extension) {
      case 'pdf':
        return (
          <svg className="w-5 h-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        );
      case 'doc':
      case 'docx':
        return (
          <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        );
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
        return (
          <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
          </svg>
        );
      default:
        return getDefaultFileIcon();
    }
  };

  const handleFileDownload = async (fileId: number, fileName: string) => {
    try {
      setDownloadingFiles(prev => new Set(prev).add(fileId));
      const blob = await fileService.downloadFile(fileId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      onFileDownload(fileId);
    } catch (error) {
      console.error('Error downloading file:', error);
    } finally {
      setDownloadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(fileId);
        return newSet;
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-blue-600"></div>
        <span className="mr-2 text-sm text-gray-600">טוען...</span>
      </div>
    );
  }

  if (submissions.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">אין הגשות עדיין</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* כפתור רענון */}
      {submissions.length > 0 && (
        <div className="flex justify-end mb-2">
          <button
            onClick={refreshFiles}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-1 text-sm bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                טוען...
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                רענן קבצים
              </>
            )}
          </button>
        </div>
      )}

      {/* <h3 className="text-lg font-medium text-gray-900 mb-4">היסטוריית הגשות</h3> */}

      {submissions.map((submission, index) => {
        const files = submissionFiles.get(submission.id) || [];
        
        return (
          <div 
            key={submission.id} 
            className="border border-gray-200 rounded-lg p-4 bg-white"
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                  submission.status === 'submitted' 
                    ? 'bg-blue-100 text-blue-800'
                    : submission.status === 'reviewed'
                    ? 'bg-green-100 text-green-800'
                    : submission.status === 'needs_revision'
                    ? 'bg-yellow-100 text-yellow-800'
                    : submission.status === 'approved'
                    ? 'bg-emerald-100 text-emerald-800'
                    : submission.status === 'graded'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {submission.status === 'submitted' && 'הוגש'}
                  {submission.status === 'reviewed' && 'נבדק'}
                  {submission.status === 'needs_revision' && 'דורש תיקון'}
                  {submission.status === 'approved' && 'אושר'}
                  {submission.status === 'graded' && 'נבדק'}
                  {submission.status === 'draft' && 'טיוטה'}
                </span>
              </div>
              
              <div className="text-sm text-gray-500">
                {formatDate(submission.submission_date)}
              </div>
            </div>

            {/* Files */}
            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file) => (
                  <div 
                    key={file.id} 
                    className="flex items-center justify-between p-2 bg-gray-50 rounded border"
                  >
                    <div className="flex items-center space-x-2 flex-1 min-w-0">
                      {getFileIcon(file.original_filename)}
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-900 truncate">
                          {file.original_filename || 'קובץ ללא שם'}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatFileSize(file.file_size_bytes)} • הועלה: {formatDate(file.uploaded_at)}
                        </div>
                      </div>
                    </div>
                    
                    {/* <button
                      onClick={() => handleFileDownload(file.id, file.original_filename || 'file')}
                      disabled={downloadingFiles.has(file.id)}
                      className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-50"
                    >
                      {downloadingFiles.has(file.id) ? 'מוריד...' : 'הורד'}
                    </button> */}
                  </div>
                ))}
              </div>
            )}

            {files.length === 0 && (
              <div className="text-center py-4 text-gray-400 text-sm">
                אין קבצים מוגשים
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}