'use client';

import { useState, useEffect } from 'react';
import { useUserRole } from '../../../lib/hooks/useUserRole';
import { submissionStatsService, UserSubmissionStats, DetailedSubmissionStatus } from '../../../lib/services/submissionStatsService';
import AdminLayout from '../../components/AdminLayout';
import UserGroupDisplay from '../../components/UserGroupDisplay';
import { useRouter } from 'next/navigation';

interface StudentProgressPageProps {
  userRoleData?: {
    role: string | null;
    userName: string | null;
    userEmail: string | null;
    organizationName: string | null;
    organizationId: string | null;
    groupName: string | null;
    groupId: string | null;
    userId: string | null;
    isLoading: boolean;
    error: string | null;
  };
}

export default function StudentProgressPage({ userRoleData }: StudentProgressPageProps) {
  // השתמש ב-props אם קיים, אחרת ב-hook
  const hookData = useUserRole();
  const { role, organizationId, isLoading: roleLoading } = userRoleData || hookData;
  const router = useRouter();
  const [allUserStats, setAllUserStats] = useState<UserSubmissionStats[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserSubmissionStats | null>(null);
  const [userDetailedStatus, setUserDetailedStatus] = useState<DetailedSubmissionStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'name' | 'rate' | 'submitted' | 'lastSubmission'>('rate');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');
  const [organizationFilter, setOrganizationFilter] = useState<string>('all');
  const [groupFilter, setGroupFilter] = useState<string>('all');
  const [expandedOrganizations, setExpandedOrganizations] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('student-progress-expanded-orgs');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('student-progress-expanded-groups');
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  });

  // Redirect if not admin or org_admin
  useEffect(() => {
    if (!roleLoading && role !== 'admin' && role !== 'org_admin') {
      router.push('/course');
    }
  }, [role, roleLoading, router]);

  // Load all users stats
  useEffect(() => {
    const loadAllUsersStats = async () => {
      try {
        setLoading(true);
        setError(null);
        
        console.log('🔍 Loading user stats - role:', role, 'organizationId:', organizationId);
        
        let stats: UserSubmissionStats[];
        
        if (role === 'admin') {
          // Admin can see all users
          console.log('📊 Loading all users stats (admin)');
          stats = await submissionStatsService.getAllUsersSubmissionStats();
        } else if (role === 'org_admin' && organizationId) {
          // Org admin can only see users in their organization
          console.log('📊 Loading organization users stats for org:', organizationId);
          stats = await submissionStatsService.getOrganizationUsersSubmissionStats(organizationId);
        } else {
          console.log('❌ No valid role/organizationId combination');
          stats = [];
        }
        
        console.log('📈 Loaded stats:', stats.length, 'users');
        setAllUserStats(stats);
      } catch (err: any) {
        console.error('Error loading user stats:', err);
        setError('שגיאה בטעינת נתוני התלמידים');
      } finally {
        setLoading(false);
      }
    };

    if ((role === 'admin') || (role === 'org_admin' && organizationId)) {
      loadAllUsersStats();
    } else {
      console.log('⏸️ Not loading stats - conditions not met. Role:', role, 'OrgId:', organizationId);
    }
  }, [role, organizationId]);

  // Load detailed status for selected user
  const loadUserDetails = async (userId: string) => {
    try {
      setDetailsLoading(true);
      const detailedStatus = await submissionStatsService.getUserDetailedSubmissionStatus(userId);
      setUserDetailedStatus(detailedStatus);
    } catch (err: any) {
      console.error('Error loading user details:', err);
      setError('שגיאה בטעינת פרטי התלמיד');
    } finally {
      setDetailsLoading(false);
    }
  };

  // Handle user selection
  const handleUserSelect = (user: UserSubmissionStats) => {
    setSelectedUser(user);
    loadUserDetails(user.userId);
  };

  // Filter and sort users
  const filteredAndSortedUsers = allUserStats
    .filter(user => {
      // סינון לפי חיפוש
      const searchMatch = searchTerm === '' || 
        user.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.userEmail.toLowerCase().includes(searchTerm.toLowerCase());
      
      // סינון לפי ארגון
      const organizationMatch = organizationFilter === 'all' || 
        (organizationFilter === 'no-org' && !user.organizationId) ||
        user.organizationId === organizationFilter;
      
      // סינון לפי קבוצה
      const groupMatch = groupFilter === 'all' || 
        (groupFilter === 'no-group' && !user.groupId) ||
        user.groupId === groupFilter;
      
      return searchMatch && organizationMatch && groupMatch;
    })
    .sort((a, b) => {
      let aValue: any, bValue: any;
      
      switch (sortBy) {
        case 'name':
          aValue = a.userName.toLowerCase();
          bValue = b.userName.toLowerCase();
          break;
        case 'rate':
          aValue = a.submissionRate;
          bValue = b.submissionRate;
          break;
        case 'submitted':
          aValue = a.submittedAssignments;
          bValue = b.submittedAssignments;
          break;
        case 'lastSubmission':
          aValue = a.lastSubmissionDate ? new Date(a.lastSubmissionDate).getTime() : 0;
          bValue = b.lastSubmissionDate ? new Date(b.lastSubmissionDate).getTime() : 0;
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'asc') {
        return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
      } else {
        return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
      }
    });

  // Group users by organization and group
  const groupedUsers = filteredAndSortedUsers.reduce((acc, user) => {
    const orgName = user.organizationName || 'ללא ארגון';
    const groupName = user.groupName || 'ללא קבוצה';
    
    if (!acc[orgName]) {
      acc[orgName] = {};
    }
    
    if (!acc[orgName][groupName]) {
      acc[orgName][groupName] = [];
    }
    
    acc[orgName][groupName].push(user);
    return acc;
  }, {} as Record<string, Record<string, UserSubmissionStats[]>>);

  const toggleOrganization = (orgName: string) => {
    const newExpanded = new Set(expandedOrganizations);
    if (newExpanded.has(orgName)) {
      newExpanded.delete(orgName);
    } else {
      newExpanded.add(orgName);
    }
    setExpandedOrganizations(newExpanded);
    localStorage.setItem('student-progress-expanded-orgs', JSON.stringify([...newExpanded]));
  };

  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey);
    } else {
      newExpanded.add(groupKey);
    }
    setExpandedGroups(newExpanded);
    localStorage.setItem('student-progress-expanded-groups', JSON.stringify([...newExpanded]));
  };

  const expandAllOrganizations = () => {
    const allOrgNames = Object.keys(groupedUsers);
    setExpandedOrganizations(new Set(allOrgNames));
    localStorage.setItem('student-progress-expanded-orgs', JSON.stringify(allOrgNames));
    
    // Also expand all groups
    const allGroupKeys: string[] = [];
    Object.entries(groupedUsers).forEach(([orgName, groups]) => {
      Object.keys(groups).forEach(groupName => {
        allGroupKeys.push(`${orgName}-${groupName}`);
      });
    });
    setExpandedGroups(new Set(allGroupKeys));
    localStorage.setItem('student-progress-expanded-groups', JSON.stringify(allGroupKeys));
  };

  const collapseAllOrganizations = () => {
    setExpandedOrganizations(new Set());
    setExpandedGroups(new Set());
    localStorage.setItem('student-progress-expanded-orgs', JSON.stringify([]));
    localStorage.setItem('student-progress-expanded-groups', JSON.stringify([]));
  };

  const getGroupStats = (users: UserSubmissionStats[]) => {
    const stats = {
      total: users.length,
      excellent: users.filter(u => u.submissionRate >= 80).length,
      good: users.filter(u => u.submissionRate >= 60 && u.submissionRate < 80).length,
      needsAttention: users.filter(u => u.submissionRate < 60).length,
    };
    return stats;
  };

  // Get status color
  const getStatusColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600 bg-green-50';
    if (rate >= 60) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  // Get status icon
  const getStatusIcon = (rate: number) => {
    if (rate >= 80) return '✅';
    if (rate >= 60) return '⚠️';
    return '❌';
  };

  // Format date
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'אין הגשות';
    return new Date(dateString).toLocaleDateString('he-IL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (roleLoading) {
    return (
      <AdminLayout title="מעקב התקדמות תלמידים">
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  if (role !== 'admin' && role !== 'org_admin') {
    return null; // Will redirect
  }

  return (
    <AdminLayout 
      title={role === 'org_admin' ? "מעקב התקדמות תלמידים באירגון" : "מעקב התקדמות תלמידים"}
      description={role === 'org_admin' ? "צפייה בסטטוס הגשות המטלות של תלמידי הארגון" : "צפייה בסטטוס הגשות המטלות של כל התלמידים"}
      icon={
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      }
    >
      <div className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-600">סה"כ תלמידים</p>
                <p className="text-lg font-semibold text-gray-900">{allUserStats.length}</p>
                <p className="text-xs text-gray-500">
                  {Object.keys(groupedUsers).length} ארגונים
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg">
                <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-600">ביצועים מצוינים</p>
                <p className="text-lg font-semibold text-gray-900">
                  {allUserStats.filter(u => u.submissionRate >= 80).length}
                </p>
                <p className="text-xs text-gray-500">
                  {Object.values(groupedUsers).reduce((total, groups) => 
                    total + Object.keys(groups).length, 0
                  )} קבוצות
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-lg">
                <svg className="w-4 h-4 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-600">ביצועים טובים</p>
                <p className="text-lg font-semibold text-gray-900">
                  {allUserStats.filter(u => u.submissionRate >= 60 && u.submissionRate < 80).length}
                </p>
                <p className="text-xs text-gray-500">
                  {filteredAndSortedUsers.length} מסוננים
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-8 h-8 bg-red-100 rounded-lg">
                <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <p className="text-xs text-gray-600">זקוקים לתשומת לב</p>
                <p className="text-lg font-semibold text-gray-900">
                  {allUserStats.filter(u => u.submissionRate < 60).length}
                </p>
                <p className="text-xs text-gray-500">
                  {allUserStats.filter(u => u.lastSubmissionDate).length} עם הגשות
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* Info message for org admins */}
        {role === 'org_admin' && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-medium text-blue-900">מידע למנהל אירגון</h3>
                <p className="text-sm text-blue-700 mt-1">
                  אתה רואה רק את התלמידים השייכים לארגון שלך. מנהלי מערכת רואים את כל התלמידים.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Search and Sort Controls */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex flex-col gap-4">
            {/* Search */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="חיפוש לפי שם או אימייל..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Filters Row */}
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Sort Controls */}
              <div className="flex gap-2">
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="rate">אחוז השלמה</option>
                  <option value="name">שם</option>
                  <option value="submitted">מספר הגשות</option>
                  <option value="lastSubmission">הגשה אחרונה</option>
                </select>
                
                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>
              </div>

              {/* Organization Filter */}
              <div className="flex-1">
                <select
                  value={organizationFilter}
                  onChange={(e) => {
                    setOrganizationFilter(e.target.value);
                    // Reset group filter when organization changes
                    if (e.target.value !== organizationFilter) {
                      setGroupFilter('all');
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">כל הארגונים</option>
                  <option value="no-org">ללא ארגון</option>
                  {(() => {
                    const organizations = allUserStats
                      .filter(user => user.organizationId && user.organizationName)
                      .reduce((acc, user) => {
                        if (user.organizationId && user.organizationName && !acc.some(org => org.id === user.organizationId)) {
                          acc.push({ id: user.organizationId, name: user.organizationName });
                        }
                        return acc;
                      }, [] as Array<{ id: string; name: string }>)
                      .sort((a, b) => a.name.localeCompare(b.name, 'he'));
                    
                    return organizations.map(org => (
                      <option key={org.id} value={org.id}>{org.name}</option>
                    ));
                  })()}
                </select>
              </div>

              {/* Group Filter */}
              <div className="flex-1">
                <select
                  value={groupFilter}
                  onChange={(e) => setGroupFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={organizationFilter === 'all'}
                >
                  <option value="all">כל הקבוצות</option>
                  <option value="no-group">ללא קבוצה</option>
                  {(() => {
                    const groups = allUserStats
                      .filter(user => 
                        (organizationFilter === 'all' || user.organizationId === organizationFilter) &&
                        user.groupId && user.groupName
                      )
                      .reduce((acc, user) => {
                        if (user.groupId && user.groupName && !acc.some(g => g.id === user.groupId)) {
                          acc.push({ id: user.groupId, name: user.groupName });
                        }
                        return acc;
                      }, [] as Array<{ id: string; name: string }>)
                      .sort((a, b) => a.name.localeCompare(b.name, 'he'));
                    
                    return groups.map(group => (
                      <option key={group.id} value={group.id}>{group.name}</option>
                    ));
                  })()}
                </select>
              </div>

              {/* Clear Filters */}
              {(organizationFilter !== 'all' || groupFilter !== 'all' || searchTerm !== '') && (
                <button
                  onClick={() => {
                    setOrganizationFilter('all');
                    setGroupFilter('all');
                    setSearchTerm('');
                  }}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                >
                  נקה סינונים
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Users List */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                רשימת תלמידים ({filteredAndSortedUsers.length})
              </h2>
              
              <div className="flex items-center gap-2">
                {Object.keys(groupedUsers).length > 0 && (
                  <>
                    <button
                      onClick={expandAllOrganizations}
                      className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                      </svg>
                      הרחב הכל
                    </button>
                    
                    <button
                      onClick={collapseAllOrganizations}
                      className="inline-flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 15l7-7 7 7" />
                      </svg>
                      כווץ הכל
                    </button>
                  </>
                )}
              </div>
            </div>
            
            <div className="h-[640px] overflow-y-auto">
              {loading ? (
                <div className="p-8 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">טוען נתונים...</p>
                </div>
              ) : error ? (
                <div className="p-8 text-center text-red-600">
                  <p>{error}</p>
                </div>
              ) : filteredAndSortedUsers.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>לא נמצאו תלמידים</p>
                </div>
              ) : Object.keys(groupedUsers).length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  לא נמצאו תלמידים להצגה
                </div>
              ) : (
                <div className="p-6 space-y-4">
                  {Object.entries(groupedUsers).map(([orgName, groups]) => (
                    <div key={orgName}>
                      {/* כותרת ארגון מינימלית עם אפשרות כיווץ */}
                      <div 
                        className="flex items-center gap-2 mb-2 px-1 cursor-pointer hover:bg-gray-50 rounded py-1"
                        onClick={() => toggleOrganization(orgName)}
                      >
                        <svg 
                          className={`w-4 h-4 text-gray-400 transition-transform ${expandedOrganizations.has(orgName) ? '' : 'rotate-90'}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                        </svg>
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <h4 className="text-sm font-medium text-gray-700">{orgName}</h4>
                        <div className="flex-1 h-px bg-gray-200"></div>
                        <span className="text-xs text-gray-500">
                          {Object.values(groups).reduce((total, groupUsers) => total + groupUsers.length, 0)} תלמידים
                        </span>
                        {(() => {
                          const orgStats = getGroupStats(Object.values(groups).flat());
                          return (
                            <div className="flex items-center gap-2 text-xs">
                              {orgStats.excellent > 0 && <span className="text-green-600">{orgStats.excellent} מצוינים</span>}
                              {orgStats.good > 0 && <span className="text-yellow-600">{orgStats.good} טובים</span>}
                              {orgStats.needsAttention > 0 && <span className="text-red-600">{orgStats.needsAttention} זקוקים לתשומת לב</span>}
                            </div>
                          );
                        })()}
                      </div>
                      
                      {/* קבוצות בארגון - מוצגות רק אם הארגון לא מכווץ */}
                      {expandedOrganizations.has(orgName) && (
                        <div className="mr-4 space-y-3 mb-4">
                          {Object.entries(groups).map(([groupName, groupUsers]) => {
                            const groupKey = `${orgName}-${groupName}`;
                            return (
                              <div key={groupName}>
                                {/* כותרת קבוצה מינימלית */}
                                <div 
                                  className="flex items-center gap-2 mb-1 px-1 cursor-pointer hover:bg-gray-50 rounded py-1"
                                  onClick={() => toggleGroup(groupKey)}
                                >
                                  <svg 
                                    className={`w-3 h-3 text-gray-400 transition-transform ${expandedGroups.has(groupKey) ? '' : 'rotate-90'}`} 
                                    fill="none" 
                                    stroke="currentColor" 
                                    viewBox="0 0 24 24"
                                  >
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                                  </svg>
                                  <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                                  <h5 className="text-xs font-medium text-gray-600">{groupName}</h5>
                                  <div className="flex-1 h-px bg-gray-100"></div>
                                  <span className="text-xs text-gray-400">{groupUsers.length}</span>
                                  {(() => {
                                    const groupStats = getGroupStats(groupUsers);
                                    return (
                                      <div className="flex items-center gap-1 text-xs">
                                        {groupStats.excellent > 0 && <span className="text-green-600">{groupStats.excellent}</span>}
                                        {groupStats.good > 0 && <span className="text-yellow-600">{groupStats.good}</span>}
                                        {groupStats.needsAttention > 0 && <span className="text-red-600">{groupStats.needsAttention}</span>}
                                      </div>
                                    );
                                  })()}
                                </div>
                                
                                {/* רשימת התלמידים בקבוצה */}
                                {expandedGroups.has(groupKey) && (
                                  <div className="space-y-2">
                                    {groupUsers.map((user) => (
                                      <div
                                        key={user.userId}
                                        onClick={() => handleUserSelect(user)}
                                        className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg border-r-2 border-green-200 hover:bg-gray-100 cursor-pointer transition-colors ${
                                          selectedUser?.userId === user.userId ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                                        }`}
                                      >
                                        <div className="flex items-center gap-3">
                                          <div className="w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center">
                                            <span className="text-lg">{getStatusIcon(user.submissionRate)}</span>
                                          </div>
                                          <div>
                                            <h3 className="font-medium text-gray-900 text-sm">{user.userName}</h3>
                                            <div className="flex items-center gap-2 text-xs text-gray-500">
                                              <span>{user.userEmail}</span>
                                              <span>•</span>
                                              <span>{user.submittedAssignments}/{user.totalAssignments} מטלות</span>
                                              {user.lastSubmissionDate && (
                                                <>
                                                  <span>•</span>
                                                  <span>{formatDate(user.lastSubmissionDate)}</span>
                                                </>
                                              )}
                                            </div>
                                          </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(user.submissionRate)}`}>
                                            {Math.round(user.submissionRate)}%
                                          </div>
                                          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
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

          {/* User Details */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {selectedUser ? `פרטי ${selectedUser.userName}` : 'בחר תלמיד לצפייה בפרטים'}
              </h2>
            </div>
            
            <div className="p-4">
              {!selectedUser ? (
                <div className="text-center py-8 text-gray-500">
                  <p>בחר תלמיד מהרשימה לצפייה בפרטי ההתקדמות</p>
                </div>
              ) : detailsLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">טוען פרטים...</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Summary Stats */}
                  <div className={`rounded-lg p-3 ${getStatusColor(selectedUser.submissionRate)}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{getStatusIcon(selectedUser.submissionRate)}</span>
                        <span className="font-medium">{Math.round(selectedUser.submissionRate)}% השלמה</span>
                      </div>
                      <div className="text-sm">
                        {selectedUser.submittedAssignments}/{selectedUser.totalAssignments} מטלות
                      </div>
                    </div>
                  </div>

                  {/* Detailed Assignment Status */}
                  <div>
                    <h3 className="font-medium text-gray-900 mb-2">סטטוס מטלות לפי יחידות</h3>
                    <div className="space-y-2">
                      {userDetailedStatus.map((assignment) => (
                        <div
                          key={assignment.assignmentId}
                          className={`p-3 rounded-lg border ${
                            assignment.isSubmitted 
                              ? 'bg-green-50 border-green-200' 
                              : 'bg-gray-50 border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex-1">
                              <div className="text-sm font-medium text-gray-900">
                                {assignment.assignmentTitle}
                              </div>
                              <div className="text-xs text-gray-600">
                                {assignment.unitTitle}
                              </div>
                            </div>
                            <div className="text-left">
                              {assignment.isSubmitted ? (
                                <div className="text-green-600 text-sm font-medium">
                                  ✅ הוגש
                                </div>
                              ) : (
                                <div className="text-gray-500 text-sm">
                                  ⏳ ממתין
                                </div>
                              )}
                              {assignment.submissionDate && (
                                <div className="text-xs text-gray-500">
                                  {formatDate(assignment.submissionDate)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Future: Video Viewing Stats Placeholder */}
                  <div className="border-t pt-4">
                    <h3 className="font-medium text-gray-900 mb-2">צפייה בסרטונים</h3>
                    <div className="bg-gray-50 rounded-lg p-3 text-center text-gray-500 text-sm">
                      🎥 בעתיד: מעקב אחר צפייה בסרטונים
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}