"use client";

import { useState, useEffect } from 'react';
import AdminLayout from '@/app/components/AdminLayout';
import { rlsSupabase } from '@/lib/supabase';
import { Assignment, AssignmentSubmission } from '@/lib/types/assignment';
import { UserWithGroup } from '@/lib/services/userService';
import SubmissionManager from '@/app/components/SubmissionManager';
import SubmissionExport from '@/app/components/SubmissionExport';
import AdminToast from '@/app/components/AdminToast';
import { authenticatedFetch } from '@/lib/utils/api-helpers';

interface SubmissionWithDetails extends AssignmentSubmission {
  assignment: Assignment;
  user_profile: UserWithGroup;
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
  const [organizationFilter, setOrganizationFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isSearchExpanded, setIsSearchExpanded] = useState<boolean>(false);
  const [organizations, setOrganizations] = useState<Array<{id: string, name: string}>>([]);
  const [groups, setGroups] = useState<Array<{id: string, name: string, organization_id: string}>>([]);
  const [expandedOrganizations, setExpandedOrganizations] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('submissions-expanded-orgs');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('submissions-expanded-groups');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });

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
        
        // בדיקה נוספת אם המשתמש הוא מנהל ארגון
        let hasAdminAccess = isAdmin;
        if (!isAdmin) {
          try {
            const { data: profile, error } = await rlsSupabase.from('user_profile')
              .select('*')
              .eq('user_id', user.id)
              .single();
            
            if (error) {
              console.error('Error fetching user profile:', error);
            } else {
              hasAdminAccess = (profile as any)?.role === 'org_admin';
            }
          } catch (error) {
            console.error('Error checking user role:', error);
          }
        }
        
        if (!hasAdminAccess) {
          console.error('User is not admin');
          return;
        }
        
        // If we get here, user has permissions
        loadSubmissions();
        loadAssignments();
        loadOrganizations();
        loadGroups();
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

  const loadOrganizations = async () => {
    try {
      const { data, error } = await rlsSupabase
        .from('organizations')
        .select('id, name')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setOrganizations((data || []) as any[]);
    } catch (error) {
      console.error('Error loading organizations:', error);
    }
  };

  const loadGroups = async () => {
    try {
      const { data, error } = await rlsSupabase
        .from('groups')
        .select('id, name, organization_id')
        .order('name');

      if (error) throw error;
      setGroups((data || []) as any[]);
    } catch (error) {
      console.error('Error loading groups:', error);
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
      
      // Get user profiles with organization and group information
      const userIds = [...new Set(submissionsData.map((s: any) => s.user_id))];
      const { data: profilesData, error: profilesError } = await rlsSupabase
        .from('user_profile')
        .select(`
          *,
          organization:organizations(id, name),
          group:groups(id, name)
        `)
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
      const response = await authenticatedFetch('/api/admin/submissions', {
        method: 'PATCH',
        body: JSON.stringify({
          submissionId,
          status: newStatus
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update submission status');
      }

      const { submission } = await response.json();

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
    } catch (error: any) {
      console.error('Error updating submission status:', error.message || error);
      setToast({
        message: `שגיאה בעדכון סטטוס ההגשה: ${error.message || 'שגיאה לא ידועה'}`,
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
    const organizationMatch = organizationFilter === 'all' || submission.user_profile?.organization_id === organizationFilter;
    const groupMatch = groupFilter === 'all' || submission.user_profile?.group_id === groupFilter;
    
    const searchMatch = searchTerm === '' || 
      submission.user_profile?.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.user_profile?.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.assignment.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.user_profile?.organization?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      submission.user_profile?.group?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    
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
    
    return statusMatch && assignmentMatch && organizationMatch && groupMatch && searchMatch && dateMatch;
  });

  // Group submissions by organization and group
  const groupedSubmissions = filteredSubmissions.reduce((acc, submission) => {
    const orgName = submission.user_profile?.organization?.name || 'ללא ארגון';
    const groupName = submission.user_profile?.group?.name || 'ללא קבוצה';
    
    if (!acc[orgName]) {
      acc[orgName] = {};
    }
    
    if (!acc[orgName][groupName]) {
      acc[orgName][groupName] = [];
    }
    
    acc[orgName][groupName].push(submission);
    return acc;
  }, {} as Record<string, Record<string, SubmissionWithDetails[]>>);

  const toggleOrganization = (orgName: string) => {
    const newExpanded = new Set(expandedOrganizations);
    if (newExpanded.has(orgName)) {
      newExpanded.delete(orgName);
    } else {
      newExpanded.add(orgName);
    }
    setExpandedOrganizations(newExpanded);
    localStorage.setItem('submissions-expanded-orgs', JSON.stringify([...newExpanded]));
  };

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
    localStorage.setItem('submissions-expanded-groups', JSON.stringify([...newExpanded]));
  };

  const expandAllOrganizations = () => {
    const allOrgNames = Object.keys(groupedSubmissions);
    setExpandedOrganizations(new Set(allOrgNames));
    localStorage.setItem('submissions-expanded-orgs', JSON.stringify(allOrgNames));
    
    // Also expand all groups
    const allGroupKeys: string[] = [];
    Object.entries(groupedSubmissions).forEach(([orgName, groups]) => {
      Object.keys(groups).forEach(groupName => {
        allGroupKeys.push(`${orgName}-${groupName}`);
      });
    });
    setExpandedGroups(new Set(allGroupKeys));
    localStorage.setItem('submissions-expanded-groups', JSON.stringify(allGroupKeys));
  };

  const collapseAllOrganizations = () => {
    setExpandedOrganizations(new Set());
    setExpandedGroups(new Set());
    localStorage.setItem('submissions-expanded-orgs', JSON.stringify([]));
    localStorage.setItem('submissions-expanded-groups', JSON.stringify([]));
  };

  const getGroupStats = (submissions: SubmissionWithDetails[]) => {
    const stats = {
      total: submissions.length,
      submitted: submissions.filter(s => s.status === 'submitted').length,
      reviewed: submissions.filter(s => s.status === 'reviewed').length,
      needs_revision: submissions.filter(s => s.status === 'needs_revision').length,
      approved: submissions.filter(s => s.status === 'approved').length,
    };
    return stats;
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
                <p className="text-xs text-slate-500">
                  {Object.keys(groupedSubmissions).length} ארגונים
                </p>
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
                <p className="text-xs text-slate-500">
                  {Object.values(groupedSubmissions).reduce((total, groups) => 
                    total + Object.keys(groups).length, 0
                  )} קבוצות
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
                <p className="text-xs text-slate-500">
                  {filteredSubmissions.length} מסוננות
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
                <p className="text-xs text-slate-500">
                  {submissions.filter(s => (s.comments_count || 0) > 0).length} עם הערות
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* Filters */}
        <div className="bg-white rounded-lg border border-slate-200">
          {/* Search Toggle Header */}
          <div 
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors border-b border-slate-200"
            onClick={() => setIsSearchExpanded(!isSearchExpanded)}
          >
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-slate-900">חיפוש וסינון</h3>
                <p className="text-xs text-slate-500">
                  {isSearchExpanded ? 'לחץ כדי לכווץ' : 'לחץ כדי להרחיב את אפשרויות החיפוש'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              {/* Active filters indicator */}
              {(statusFilter !== 'all' || assignmentFilter !== 'all' || organizationFilter !== 'all' || groupFilter !== 'all' || searchTerm !== '' || dateFilter.from !== '' || dateFilter.to !== '') && (
                <span className="inline-flex items-center px-2 py-1 bg-blue-100 text-blue-800 text-xs font-medium rounded-full">
                  סינונים פעילים
                </span>
              )}
              
              <svg 
                className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${isSearchExpanded ? 'rotate-180' : ''}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>

          {/* Expandable Search Content */}
          {isSearchExpanded && (
            <div className="p-6 border-t border-slate-100">
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

                {/* Organization and Group Filters */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      סינון לפי ארגון
                    </label>
                    <select
                      value={organizationFilter}
                      onChange={(e) => {
                        setOrganizationFilter(e.target.value);
                        // Reset group filter when organization changes
                        if (e.target.value !== organizationFilter) {
                          setGroupFilter('all');
                        }
                      }}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="all">כל הארגונים</option>
                      {organizations.map(org => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      סינון לפי קבוצה
                    </label>
                    <select
                      value={groupFilter}
                      onChange={(e) => setGroupFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      disabled={organizationFilter === 'all'}
                    >
                      <option value="all">כל הקבוצות</option>
                      {groups
                        .filter(group => organizationFilter === 'all' || group.organization_id === organizationFilter)
                        .map(group => (
                          <option key={group.id} value={group.id}>
                            {group.name}
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
                  {(statusFilter !== 'all' || assignmentFilter !== 'all' || organizationFilter !== 'all' || groupFilter !== 'all' || searchTerm !== '' || dateFilter.from !== '' || dateFilter.to !== '') && (
                    <div className="flex items-end">
                      <button
                        onClick={() => {
                          setStatusFilter('all');
                          setAssignmentFilter('all');
                          setOrganizationFilter('all');
                          setGroupFilter('all');
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
          )}
        </div>

        {/* Submissions List */}
        <div className="bg-white rounded-lg border border-slate-200">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
            <h3 className="text-lg font-semibold text-slate-900">
              הגשות ({filteredSubmissions.length})
            </h3>
            
            <div className="flex items-center gap-2">
              {Object.keys(groupedSubmissions).length > 0 && (
                <>
                  <button
                    onClick={expandAllOrganizations}
                    className="inline-flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                    </svg>
                    הרחב הכל
                  </button>
                  
                  <button
                    onClick={collapseAllOrganizations}
                    className="inline-flex items-center gap-2 px-3 py-2 text-slate-600 hover:text-slate-900 border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 15l7-7 7 7" />
                    </svg>
                    כווץ הכל
                  </button>
                </>
              )}
              
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
            <div className="p-8 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-slate-100 rounded-lg mb-4">
                <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-slate-900 mb-2">לא נמצאו הגשות</h3>
              <p className="text-slate-500 mb-4">
                {submissions.length === 0 
                  ? 'עדיין לא הוגשו מטלות במערכת'
                  : 'לא נמצאו הגשות התואמות לקריטריונים שנבחרו'
                }
              </p>
              {submissions.length > 0 && (
                <button
                  onClick={() => {
                    setStatusFilter('all');
                    setAssignmentFilter('all');
                    setOrganizationFilter('all');
                    setGroupFilter('all');
                    setSearchTerm('');
                    setDateFilter({ from: '', to: '' });
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  נקה סינונים
                </button>
              )}
            </div>
          ) : Object.keys(groupedSubmissions).length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              לא נמצאו הגשות להצגה
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {Object.entries(groupedSubmissions).map(([orgName, groups]) => (
                <div key={orgName} className="p-6">
                  {/* Organization Header */}
                  <div 
                    className="flex items-center gap-3 mb-4 cursor-pointer hover:bg-slate-50 p-2 rounded-lg transition-colors"
                    onClick={() => toggleOrganization(orgName)}
                  >
                    <div className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                      <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-4m-5 0H3m2 0h3M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-slate-900">{orgName}</h4>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span>{Object.values(groups).reduce((total, groupSubmissions) => total + groupSubmissions.length, 0)} הגשות</span>
                        {(() => {
                          const orgStats = getGroupStats(Object.values(groups).flat());
                          return (
                            <>
                              <span className="text-orange-600">{orgStats.submitted} ממתינות</span>
                              <span className="text-green-600">{orgStats.approved} אושרו</span>
                              <span className="text-yellow-600">{orgStats.needs_revision} דורשות תיקון</span>
                            </>
                          );
                        })()}
                      </div>
                    </div>
                    <svg 
                      className={`w-5 h-5 text-slate-400 transition-transform duration-200 ${
                        expandedOrganizations.has(orgName) ? 'rotate-180' : ''
                      }`} 
                      fill="none" 
                      stroke="currentColor" 
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Groups within Organization */}
                  {expandedOrganizations.has(orgName) && (
                    <div className="space-y-4 mr-6">
                      {Object.entries(groups).map(([groupName, groupSubmissions]) => {
                        const groupKey = `${orgName}-${groupName}`;
                        return (
                          <div key={groupName} className="border border-slate-200 rounded-lg">
                            {/* Group Header */}
                            <div 
                              className="flex items-center gap-3 px-4 py-3 bg-slate-50 border-b border-slate-200 cursor-pointer hover:bg-slate-100 transition-colors"
                              onClick={() => toggleGroup(groupKey)}
                            >
                              <div className="inline-flex items-center justify-center w-6 h-6 bg-green-100 rounded-md">
                                <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <h5 className="font-medium text-slate-900">{groupName}</h5>
                                <div className="flex items-center gap-3 text-xs text-slate-500">
                                  <span>{groupSubmissions.length} הגשות</span>
                                  {(() => {
                                    const groupStats = getGroupStats(groupSubmissions);
                                    return (
                                      <>
                                        {groupStats.submitted > 0 && <span className="text-orange-600">{groupStats.submitted} ממתינות</span>}
                                        {groupStats.approved > 0 && <span className="text-green-600">{groupStats.approved} אושרו</span>}
                                        {groupStats.needs_revision > 0 && <span className="text-yellow-600">{groupStats.needs_revision} דורשות תיקון</span>}
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>
                              <svg 
                                className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                                  expandedGroups.has(groupKey) ? 'rotate-180' : ''
                                }`} 
                                fill="none" 
                                stroke="currentColor" 
                                viewBox="0 0 24 24"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>

                            {/* Submissions in Group */}
                            {expandedGroups.has(groupKey) && (
                              <div className="divide-y divide-slate-100">
                                {groupSubmissions.map((submission) => (
                                  <div
                                    key={submission.id}
                                    className="p-4 hover:bg-slate-50 cursor-pointer transition-colors"
                                    onClick={() => setSelectedSubmission(submission)}
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="flex-1">
                                        <div className="flex items-center gap-3 mb-2">
                                          <h6 className="font-medium text-slate-900">
                                            {submission.assignment.title}
                                          </h6>
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
                        );
                      })}
                    </div>
                  )}
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