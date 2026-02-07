"use client";

import { useState, useEffect } from 'react';
import { Assignment, AssignmentSubmission, AssignmentDisplayProps } from '../../../lib/types/assignment';
import { assignmentService } from '../../../lib/services/assignmentService';
import FileUpload from './FileUpload';
import SubmissionHistory from './SubmissionHistory';
import SubmissionComments from '../../components/SubmissionComments';

export default function AssignmentDisplay({ 
  assignment, 
  userSubmission, 
  onSubmissionComplete,
  userId
}: AssignmentDisplayProps & { userId: string }) {
  const [submission, setSubmission] = useState<AssignmentSubmission | undefined>(userSubmission);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Key to force refresh of SubmissionHistory
  const [isRefreshing, setIsRefreshing] = useState(false); // Track refresh state

  // Format estimated duration for display
  const formatEstimatedDuration = (minutes: number) => {
    if (minutes < 60) {
      return `${minutes} דקות`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) {
      return `${hours} שעות`;
    }
    return `${hours} שעות ו-${remainingMinutes} דקות`;
  };

  // Check if assignment is overdue - removed since we don't use due dates
  // const isOverdue = assignment.due_date ? new Date(assignment.due_date) < new Date() : false;

  // Handle successful file upload
  const handleUploadComplete = async () => {
    try {
      setLoading(true);
      setIsRefreshing(true);
      setError(null);
      
      // Refresh submission data
      if (!userId) {
        setError('User not authenticated');
        return;
      }
      
      const updatedSubmission = await assignmentService.getUserSubmissionForAssignment(
        userId, 
        assignment.id
      );
      
      setSubmission(updatedSubmission || undefined);
      
      // Force refresh of submission history by updating the key
      setRefreshKey(prev => prev + 1);
      
      if (updatedSubmission && onSubmissionComplete) {
        onSubmissionComplete(updatedSubmission);
      }
      
      // Show a brief success message
    } catch (err: any) {
      setError(err.message || 'Failed to refresh submission data');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleUploadError = (errorMessage: string) => {
    setError(errorMessage);
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* Assignment Header - Always Visible */}
      <div 
        className="bg-gradient-to-r from-blue-50 to-indigo-50 px-6 py-4 border-b border-slate-200 cursor-pointer hover:from-blue-100 hover:to-indigo-100 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold text-slate-900 mb-1">
                📝 {assignment.title}
              </h3>
              <svg 
                className={`w-5 h-5 text-slate-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {assignment.description && (
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line">
                {assignment.description}
              </p>
            )}
          </div>
          
          {/* Assignment Status Badge */}
          <div className="flex flex-col items-end gap-2">
            {submission ? (
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-medium border ${
                submission.status === 'submitted' 
                  ? 'bg-blue-100 text-blue-700 border-blue-200'
                  : submission.status === 'reviewed'
                  ? 'bg-green-100 text-green-700 border-green-200'
                  : submission.status === 'needs_revision'
                  ? 'bg-yellow-100 text-yellow-700 border-yellow-200'
                  : submission.status === 'approved'
                  ? 'bg-emerald-100 text-emerald-700 border-emerald-200'
                  : 'bg-gray-100 text-gray-700 border-gray-200'
              }`}>
                {submission.status === 'submitted' && (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    הוגש
                  </>
                )}
                {submission.status === 'reviewed' && (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    נבדק
                  </>
                )}
                {submission.status === 'needs_revision' && (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    דורש תיקון
                  </>
                )}
                {submission.status === 'approved' && (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    אושר
                  </>
                )}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-700 border border-gray-200 rounded-lg text-sm font-medium">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                ממתין להגשה
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Status-specific messages */}
      {submission && (
        <div className="px-6 pb-4">
          {submission.status === 'needs_revision' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-yellow-800 mb-1">נדרש תיקון</h4>
                  <p className="text-sm text-yellow-700">המטלה נבדקה ונדרשים תיקונים. אנא בדוק את ההערות ועדכן את ההגשה.</p>
                </div>
              </div>
            </div>
          )}
          
          {submission.status === 'reviewed' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-green-800 mb-1">נבדק</h4>
                  <p className="text-sm text-green-700">המטלה נבדקה על ידי המדריך. בדוק את ההערות למידע נוסף.</p>
                </div>
              </div>
            </div>
          )}
          
          {submission.status === 'approved' && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <h4 className="text-sm font-medium text-emerald-800 mb-1">אושר</h4>
                  <p className="text-sm text-emerald-700">כל הכבוד! המטלה אושרה בהצלחה.</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="px-6 py-4 space-y-4">
        {/* Estimated Duration */}
        {assignment.estimated_duration_minutes && (
          <div className="flex items-center gap-3 text-sm">
            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="text-slate-600">
              <span className="font-medium">זמן משוער:</span>{' '}
              <span className="text-slate-900">
                {formatEstimatedDuration(assignment.estimated_duration_minutes)}
              </span>
            </span>
          </div>
        )}

        {/* File Requirements */}
        <div className="bg-slate-50 rounded-lg p-4">
          <div className="space-y-3">
            {/* Required Files Content */}
            {assignment.required_files && assignment.required_files.length > 0 && (
              <div className="space-y-3">
                <h5 className="text-sm font-medium text-slate-800">קבצים נדרשים:</h5>
                {assignment.required_files
                  .sort((a, b) => a.order - b.order)
                  .map((requiredFile) => (
                    <div key={requiredFile.id} className="bg-white rounded-lg p-3 border border-slate-200">
                      <div className="flex items-start gap-3">
                        <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h6 className="text-sm font-medium text-slate-900 mb-1">
                            {requiredFile.name}
                          </h6>
                          <p className="text-sm text-slate-600 mb-2">
                            {requiredFile.description}
                          </p>
                          {/* <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              {requiredFile.file_type}
                            </span>
                          </div> */}
                          {requiredFile.example && (
                            <div className="mt-2 p-2 bg-slate-50 rounded text-xs text-slate-600">
                              <span className="font-medium">דוגמה:</span> {requiredFile.example}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            )}
            
            {/* General File Requirements */}
            <div className="space-y-2 text-sm text-slate-600 pt-3 border-t border-slate-200">
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span>
                  <span className="font-medium">סוגי קבצים מותרים:</span>{' '}
                  {assignment.allowed_file_types.join(', ').toUpperCase()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                </svg>
                <span>
                  <span className="font-medium">גודל מקסימלי:</span> {assignment.max_file_size_mb} MB לקובץ
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <h4 className="text-sm font-medium text-red-800 mb-1">שגיאה</h4>
                <p className="text-sm text-red-700">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* File Upload Section */}
        <div className="border-t border-slate-200 pt-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-slate-900">
              {submission ? 'עדכון הגשה:' : 'הגשת מטלה:'}
            </h4>
            {submission && (
              <button
                onClick={async () => {
                  await handleUploadComplete();
                  setRefreshKey(prev => prev + 1);
                }}
                disabled={isRefreshing}
                className="inline-flex items-center gap-1.5 px-2 py-1 text-xs text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="רענן סטטוס הגשה"
              >
                {isRefreshing ? (
                  <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                {isRefreshing ? 'מרענן...' : 'רענן'}
              </button>
            )}
          </div>
          <FileUpload
            assignment={assignment}
            submissionId={submission?.id}
            onUploadComplete={handleUploadComplete}
            onUploadError={handleUploadError}
            userId={userId}
          />
        </div>

        {/* Submission History */}
        {submission && (
          <div className="border-t border-slate-200 pt-4">
            <h4 className="text-sm font-medium text-slate-900 mb-3">היסטוריית הגשות:</h4>
            <SubmissionHistory
              key={refreshKey} // Force re-render when refreshKey changes
              submissions={[submission]}
              onFileDownload={(fileId: number) => {
              }}
              onRefresh={() => {
                // Refresh submission data when user clicks refresh in SubmissionHistory
                handleUploadComplete();
              }}
              showAutoRefreshMessage={isRefreshing}
            />
          </div>
        )}

        {/* Comments Section */}
        {submission && (
          <div className="border-t border-slate-200 pt-4">
            <SubmissionComments submissionId={submission.id} showAddForm={false} />
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-4">
            <div className="flex items-center gap-3 text-slate-600">
              <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm font-medium">מעדכן...</span>
            </div>
          </div>
        )}
      </div>
      )}
    </div>
  );
}