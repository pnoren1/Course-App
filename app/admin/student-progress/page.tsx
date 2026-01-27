'use client';

import { useState, useEffect } from 'react';
import { useUserRole } from '../../../lib/hooks/useUserRole';
import { submissionStatsService, UserSubmissionStats, DetailedSubmissionStatus } from '../../../lib/services/submissionStatsService';
import AdminLayout from '../../components/AdminLayout';
import { useRouter } from 'next/navigation';

export default function StudentProgressPage() {
  const { role, isLoading: roleLoading } = useUserRole();
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

  // Redirect if not admin
  useEffect(() => {
    if (!roleLoading && role !== 'admin') {
      router.push('/course');
    }
  }, [role, roleLoading, router]);

  // Load all users stats
  useEffect(() => {
    const loadAllUsersStats = async () => {
      try {
        setLoading(true);
        setError(null);
        const stats = await submissionStatsService.getAllUsersSubmissionStats();
        setAllUserStats(stats);
      } catch (err: any) {
        console.error('Error loading user stats:', err);
        setError('שגיאה בטעינת נתוני התלמידים');
      } finally {
        setLoading(false);
      }
    };

    if (role === 'admin') {
      loadAllUsersStats();
    }
  }, [role]);

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
    .filter(user => 
      user.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.userEmail.toLowerCase().includes(searchTerm.toLowerCase())
    )
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

  if (role !== 'admin') {
    return null; // Will redirect
  }

  return (
    <AdminLayout 
      title="מעקב התקדמות תלמידים"
      description="צפייה בסטטוס הגשות המטלות של כל התלמידים"
      icon={
        <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      }
    >
      <div className="space-y-6">
        {/* Search and Sort Controls */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex flex-col sm:flex-row gap-4">
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
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Users List */}
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                רשימת תלמידים ({filteredAndSortedUsers.length})
              </h2>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
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
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredAndSortedUsers.map((user) => (
                    <div
                      key={user.userId}
                      onClick={() => handleUserSelect(user)}
                      className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedUser?.userId === user.userId ? 'bg-blue-50 border-r-4 border-blue-500' : ''
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getStatusIcon(user.submissionRate)}</span>
                            <div>
                              <h3 className="font-medium text-gray-900">{user.userName}</h3>
                              <p className="text-sm text-gray-600">{user.userEmail}</p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-left">
                          <div className={`inline-flex items-center px-2 py-1 rounded-full text-sm font-medium ${getStatusColor(user.submissionRate)}`}>
                            {Math.round(user.submissionRate)}%
                          </div>
                          <p className="text-xs text-gray-500 mt-1">
                            {user.submittedAssignments}/{user.totalAssignments} מטלות
                          </p>
                        </div>
                      </div>
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