"use client";

import { useState, useEffect } from 'react';
import AdminLayout from '@/app/components/AdminLayout';
import { rlsSupabase } from '@/lib/supabase';
import { Assignment, AssignmentSubmission } from '@/lib/types/assignment';
import { UserProfile } from '@/lib/types/database.types';
import SubmissionManager from '@/app/components/SubmissionManager';
import SubmissionExport from '@/app/components/SubmissionExport';
import AdminToast from '@/app/components/AdminToast';

interface SubmissionWithDetails extends AssignmentSubmission {
  assignment: Assignment;
  user_profile: UserProfile;
  files_count: number;
  comments_count?: number;
}

export default function SubmissionsPage() {
  const [submissions, setSubmissions] = useState<SubmissionWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubmission, setSelectedSubmission] = useState<SubmissionWithDetails | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [assignmentFilter, setAssignmentFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [dateFilter, setDateFilter] = useState<{ from: string; to: string }>({ from: '', to: '' });
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    // Check user permissions first
    const checkPermissions = async () => {
      try {
        const { user } = await rlsSupabase.getCurrentUser();
        
        if (!user) {
          console.error('No user found');
          return;
        }

        const { isAdmin } = await rlsSupabase.isAdmin();
        
        if (!isAdmin) {
          console.error('User is not admin');
          return;
        }
        
        // If we get here, user has permissions
        loadSubmissions();
        loadAssignments();
      } catch (error) {
        console.error('Error checking permissions:', error);
      }
    };

    checkPermissions();

    // Add keyboard shortcuts
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + R to refresh
      if ((event.ctrlKey || event.metaKey) && event.key === 'r') {
        event.preventDefault();
        loadSubmissions();
      }
      
      // Escape to close modal
      if (event.key === 'Escape' && selectedSubmission) {
        setSelectedSubmission(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedSubmission]);

  const loadAssignments = async () => {
    try {
      const { data, error } = await rlsSupabase
        .from('assignments')
        .select('*')
        .order('title');

      if (error) throw error;
      setAssignments((data || []) as any[]);
    } catch (error) {
      console.error('Error loading assignments:', error);
    }
  };

  const loadSubmissions = async () => {
    try {
      setLoading(true);
      
      // Get submissions first
      const { data: submissionsData, error: submissionsError } = await rlsSupabase
        .from('assignment_submissions')
        .select('*')
        .order('submission_date', { ascending: false });
        
      if (submissionsError) {
        console.error('Submissions query failed:', submissionsError);
        throw submissionsError;
      }
      
      if (!submissionsData || submissionsData.length === 0) {
        setSubmissions([]);
        return;
      }
      
      // Get assignments
      const assignmentIds = [...new Set(submissionsData.map((s: any) => s.assignment_id))];
      const { data: assignmentsData, error: assignmentsError } = await rlsSupabase
        .from('assignments')
        .select('*')
        .in('id', assignmentIds);
        
      if (assignmentsError) {
        console.error('Assignments query failed:', assignmentsError);
      }
      
      // Get user profiles
      const userIds = [...new Set(submissionsData.map((s: any) => s.user_id))];
      const { data: profilesData, error: profilesError } = await rlsSupabase
        .from('user_profile')
        .select('*')
        .in('user_id', userIds);
        
      if (profilesError) {
        console.error('User profiles query failed:', profilesError);
      }
      
      // Manual join
      const submissionsWithDetails = submissionsData.map((submission: any) => {
        const assignment = assignmentsData?.find((a: any) => a.id === submission.assignment_id);
        const user_profile = profilesData?.find((p: any) => p.user_id === submission.user_id);
        
        return {
          ...submission,
          assignment: assignment || null,
          user_profile: user_profile || null,
          files_count: 0,
          comments_count: 0
        };
      }) as SubmissionWithDetails[];
      
      setSubmissions(submissionsWithDetails);
      
    } catch (error) {
      console.error('Error loading submissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSubmissionStatus = async (submissionId: number, newStatus: string) => {
    try {
      const { error } = await rlsSupabase
        .from('assignment_submissions')
        .update({ status: newStatus })
        .eq('id', submissionId);

      if (error) throw error;

      // Update local state
      setSubmissions(prev => 
        prev.map(sub => 
          sub.id === submissionId 
            ? { ...sub, status: newStatus }
            : sub
        )
      );

      if (selectedSubmission?.id === submissionId) {
        setSelectedSubmission(prev => 
          prev ? { ...prev, status: newStatus } : null
        );
      }

      // Show success toast
      const statusLabels = {
        'submitted': 'הוגשה',
        'reviewed': 'נבדקה',
        'needs_revision': 'דורשת תיקון',
        'approved': 'אושרה'
      };
      setToast({
        message: `סטטוס ההגשה עודכן ל: ${statusLabels[newStatus as keyof typeof statusLabels]}`,
        type: 'success'
      });
    } catch (error) {
      console.error('Error updating submission status:', error);
      setToast({
        message: 'שגיאה בעדכון סטטוס ההגשה',
        type: 'error'
      });
      throw error;
    }
  };

  const filteredSubmissions = submissions.filter(submission => {
    let statusMatch = true;
    if (statusFilter === 'with_comments') {
      statusMatch = (submission.comments_count || 0) > 0;
    } else if (statusFilter !== 'all') {
      statusMatch = submission.status === statusFilter;
    }
    
    const assignmentMatch = assignmentFilter === 'all' || submission.assignment_id.toString() === assignmentFilter;
    const searchMatch = searchTerm === '' || 
      submission.user_profile?.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.user_profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.assignment.title.toLowerCase().includes(searchTerm.toLowerCase());
    
    // Date filter
    let dateMatch = true;
    if (dateFilter.from || dateFilter.to) {
      const submissionDate = new Date(submission.submission_date);
      if (dateFilter.from) {
        const fromDate = new Date(dateFilter.from);
        dateMatch = dateMatch && submissionDate >= fromDate;
      }
      if (dateFilter.to) {
        const toDate = new Date(dateFilter.to);
        toDate.setHours(23, 59, 59, 999); // End of day
        dateMatch = dateMatch && submissionDate <= toDate;
      }
    }
    
    return statusMatch && assignmentMatch && searchMatch && dateMatch;
  });

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

  return (
    <AdminLayout 
      title="ניהול הגשות" 
      description="צפייה וניהול הגשות המטלות"
      icon={
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      }
    >
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-600">סה"כ הגשות</p>
                <p className="text-lg font-semibold text-slate-900">{submissions.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-8 h-8 bg-orange-100 rounded-lg">
                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-600">ממתינות לבדיקה</p>
                <p className="text-lg font-semibold text-slate-900">
                  {submissions.filter(s => s.status === 'submitted').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-600">אושרו</p>
                <p className="text-lg font-semibold text-slate-900">
                  {submissions.filter(s => s.status === 'approved').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-lg">
                <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-slate-600">דורשות תיקון</p>
                <p className="text-lg font-semibold text-slate-900">
                  {submissions.filter(s => s.status === 'needs_revision').length}
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200 p-6">
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                חיפוש
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="חפש לפי שם משתמש, אימייל או שם מטלה..."
                  className="w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>

            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  סינון לפי סטטוס
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">כל הסטטוסים</option>
                  <option value="submitted">הוגשה</option>
                  <option value="reviewed">נבדקה</option>
                  <option value="needs_revision">דורשת תיקון</option>
                  <option value="approved">אושרה</option>
                  <option value="with_comments">עם הערות</option>
                </select>
              </div>
              
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  סינון לפי מטלה
                </label>
                <select
                  value={assignmentFilter}
                  onChange={(e) => setAssignmentFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="all">כל המטלות</option>
                  {assignments.map(assignment => (
                    <option key={assignment.id} value={assignment.id.toString()}>
                      {assignment.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  מתאריך
                </label>
                <input
                  type="date"
                  value={dateFilter.from}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, from: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div className="flex-1">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  עד תאריך
                </label>
                <input
                  type="date"
                  value={dateFilter.to}
                  onChange={(e) => setDateFilter(prev => ({ ...prev, to: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Clear Filters */}
              {(statusFilter !== 'all' || assignmentFilter !== 'all' || searchTerm !== '' || dateFilter.from !== '' || dateFilter.to !== '') && (
                <div className="flex items-end">
                  <button
                    onClick={() => {
                      setStatusFilter('all');
                      setAssignmentFilter('all');
                      setSearchTerm('');
                      setDateFilter({ from: '', to: '' });
                    }}
                    className="px-4 py-2 text-sm text-slate-600 hover:text-slate-800 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    נקה סינונים
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Submissions List */}
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">
              הגשות ({filteredSubmissions.length})
            </h3>
            
            <div className="flex items-center gap-2">
              <button
                onClick={loadSubmissions}
                disabled={loading}
                className="inline-flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
                title="רענן רשימה (Ctrl+R)"
              >
                <svg className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                רענן
              </button>
              
              <SubmissionExport submissions={filteredSubmissions} />
            </div>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <div className="inline-flex items-center gap-2 text-slate-600">
                <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                טוען הגשות...
              </div>
            </div>
          ) : filteredSubmissions.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              לא נמצאו הגשות התואמות לקריטריונים
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredSubmissions.map((submission) => (
                <div
                  key={submission.id}
                  className="p-6 hover:bg-slate-50 cursor-pointer transition-colors"
                  onClick={() => setSelectedSubmission(submission)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h4 className="font-medium text-slate-900">
                          {submission.assignment.title}
                        </h4>
                        {getStatusBadge(submission.status)}
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          {submission.user_profile?.user_name || 'משתמש לא ידוע'}
                        </span>
                        
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {new Date(submission.submission_date).toLocaleDateString('he-IL')}
                        </span>
                        
                        <span className="flex items-center gap-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                          </svg>
                          {submission.files_count} קבצים
                        </span>

                        {(submission.comments_count || 0) > 0 && (
                          <span className="flex items-center gap-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                            </svg>
                            {submission.comments_count} הערות
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Submission Details Modal */}
      {selectedSubmission && (
        <SubmissionManager
          submission={selectedSubmission}
          onClose={() => setSelectedSubmission(null)}
          onStatusUpdate={updateSubmissionStatus}
        />
      )}

      {/* Toast Notifications */}
      {toast && (
        <AdminToast
          message={toast.message}
          type={toast.type}
          show={true}
          onClose={() => setToast(null)}
        />
      )}
    </AdminLayout>
  );
}