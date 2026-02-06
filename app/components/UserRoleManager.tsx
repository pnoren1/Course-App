"use client";

import { useState, useEffect } from 'react';
import { rlsSupabase } from '@/lib/supabase';
import { RoleType, Organization, Group } from '@/lib/types/database.types';
import UserRoleBadge from './UserRoleBadge';
import AddUserForm from './AddUserForm';
import BulkUserImport from './BulkUserImport';
import ExportUsersCSV from './ExportUsersCSV';
import GroupSelector from './GroupSelector';
import EmailTestComponent from './EmailTestComponent';
import { clearGroupsCache } from './GroupSelector';

interface User {
  id: string;
  email: string;
  full_name?: string;
  user_name?: string | null;
  user_email?: string | null;
  role?: RoleType;
  organization_id?: string | null;
  organization_name?: string;
  group_id?: string | null;
  group_name?: string;
}

interface UserRoleManagerProps {
  className?: string;
}

export default function UserRoleManager({ className = '' }: UserRoleManagerProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [selectedOrganization, setSelectedOrganization] = useState<string>('all');
  const [selectedGroup, setSelectedGroup] = useState<string>('all');
  const [collapsedOrgs, setCollapsedOrgs] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchOrganizations();
      fetchGroups();
    }
  }, [isAdmin]);

  // Filter users based on search term, organization, and group with debouncing
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      let filtered = users;
      
      // סינון לפי ארגון
      if (selectedOrganization !== 'all') {
        if (selectedOrganization === 'no-org') {
          filtered = filtered.filter(user => !user.organization_id);
        } else {
          filtered = filtered.filter(user => user.organization_id === selectedOrganization);
        }
      }
      
      // סינון לפי קבוצה
      if (selectedGroup !== 'all') {
        if (selectedGroup === 'no-group') {
          filtered = filtered.filter(user => !user.group_id);
        } else {
          filtered = filtered.filter(user => user.group_id === selectedGroup);
        }
      }
      
      // סינון לפי חיפוש
      if (searchTerm.trim()) {
        filtered = filtered.filter(user => 
          user.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          user.email?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }
      
      setFilteredUsers(filtered);
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [users, searchTerm, selectedOrganization, selectedGroup]);

  const checkAdminStatus = async () => {
    try {
      const { isAdmin: adminStatus } = await rlsSupabase.isAdmin();
      
      // בדיקה נוספת אם המשתמש הוא מנהל ארגון - מנהלי ארגון לא יכולים לנהל משתמשים
      let hasAdminAccess = adminStatus;
      if (!adminStatus) {
        const { user: currentUser } = await rlsSupabase.getCurrentUser();
        if (currentUser) {
          try {
            const { error } = await rlsSupabase.from('user_profile')
              .select('*')
              .eq('user_id', currentUser.id)
              .single();
            
            if (error) {
              console.error('Error fetching user profile:', error);
            } else {
              // מנהלי ארגון לא יכולים לנהל משתמשים - רק מנהלי מערכת
              hasAdminAccess = false;
            }
          } catch (error) {
            console.error('Error checking user role:', error);
          }
        }
      }
      
      setIsAdmin(hasAdminAccess);
      
      if (!hasAdminAccess) {
        setError('אין לך הרשאות מנהל מערכת לצפות בדף זה');
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setError('שגיאה בבדיקת הרשאות');
    }
  };

  const fetchOrganizations = async () => {
    try {
      const result = await rlsSupabase.rpc('get_all_organizations');
      
      if (result.error) {
        throw result.error;
      }

      setOrganizations(result.data || []);
    } catch (error) {
      console.error('Error fetching organizations:', error);
      setError('שגיאה בשליפת רשימת הארגונים');
    }
  };

  const fetchGroups = async () => {
    try {
      const { data, error } = await rlsSupabase
        .from('groups')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) {
        throw error;
      }

      setGroups((data as Group[]) || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
      setError('שגיאה בשליפת רשימת הקבוצות');
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      setRefreshing(false);

      // שליפת כל המשתמשים עם תפקידים וארגונים
      const userProfilesResult = await rlsSupabase.from('user_profile').select(`
        user_id,
        user_name,
        email,
        role,
        organization_id,
        group_id,
        granted_at,
        granted_by
      `);

      if (userProfilesResult.error) {
        throw userProfilesResult.error;
      }

      const userProfiles = (userProfilesResult.data as unknown) as Array<{
        user_id: string;
        user_name: string | null;
        email: string | null;
        role: string;
        organization_id: string | null;
        group_id: string | null;
        granted_at: string;
        granted_by: string | null;
      }>;

      // שליפת מידע על הארגונים והקבוצות
      const orgsResult = await rlsSupabase.from('organizations').select('id, name');
      const groupsResult = await rlsSupabase.from('groups').select('id, name, organization_id');
      
      if (orgsResult.error) {
        console.error('Error fetching organizations for mapping:', orgsResult.error);
      }
      
      if (groupsResult.error) {
        console.error('Error fetching groups for mapping:', groupsResult.error);
      }
      
      const orgs = ((orgsResult.data as unknown) as Array<{ id: string; name: string }>) || [];
      const groups = ((groupsResult.data as unknown) as Array<{ id: string; name: string; organization_id: string }>) || [];
      const orgMap = new Map(orgs.map(org => [org.id, org.name]));
      const groupMap = new Map(groups.map(group => [group.id, group.name]));

      const usersWithRoles = userProfiles?.map(up => ({
        id: up.user_id,
        email: up.email || `user-${up.user_id.slice(0, 8)}`,
        user_name: up.user_name,
        user_email: up.email,
        role: up.role as RoleType,
        organization_id: up.organization_id,
        organization_name: up.organization_id ? orgMap.get(up.organization_id) : undefined,
        group_id: up.group_id,
        group_name: up.group_id ? groupMap.get(up.group_id) : undefined
      })) || [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('שגיאה בשליפת רשימת המשתמשים');
    } finally {
      setLoading(false);
    }
  };

  const refreshUsers = async () => {
    try {
      setRefreshing(true);
      await fetchUsers();
    } finally {
      setRefreshing(false);
    }
  };

  const updateUserRole = async (userId: string, newRole: RoleType, organizationId?: string) => {
    try {
      setUpdatingUserId(userId);
      setError(null);

      // שימוש בפונקציה assign_user_role_with_org
      const { error } = await rlsSupabase.rpc('assign_user_role_with_org', {
        target_user_id: userId,
        new_role: newRole,
        org_id: organizationId || null
      });

      if (error) {
        throw error;
      }

      // עדכון המצב המקומי מיידי
      setUsers(prev => prev.map(user => 
        user.id === userId ? { 
          ...user, 
          role: newRole,
          organization_id: organizationId,
          organization_name: organizationId ? organizations.find(org => org.id === organizationId)?.name : undefined,
          // אם שינינו ארגון, נאפס את הקבוצה
          group_id: organizationId !== user.organization_id ? null : user.group_id,
          group_name: organizationId !== user.organization_id ? undefined : user.group_name
        } : user
      ));

      // הודעת הצלחה
      setSuccessMessage('תפקיד המשתמש עודכן בהצלחה');
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (error) {
      console.error('Error updating user role:', error);
      setError('שגיאה בעדכון תפקיד המשתמש');
      
      // במקרה של שגיאה, נטען מחדש כדי לוודא שהמידע נכון
      setTimeout(() => fetchUsers(), 1000);
      
      // ננקה גם את מטמון הקבוצות במקרה של שגיאה
      clearGroupsCache();
    } finally {
      setUpdatingUserId(null);
    }
  };

  const updateUserGroup = async (userId: string, groupId: string, organizationId?: string) => {
    try {
      setUpdatingUserId(userId);
      setError(null);

      // קבלת הטוקן לשליחה לשרת
      const { data: { session } } = await rlsSupabase.auth.getSession();
      const token = session?.access_token;

      if (!token) {
        throw new Error('לא נמצא טוקן אימות');
      }

      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        credentials: 'include', // Include cookies for authentication
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          groupId: groupId || null,
          organizationId: organizationId
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'שגיאה בעדכון קבוצת המשתמש');
      }

      // עדכון המצב המקומי עם המידע המעודכן מהשרת
      if (result.user) {
        setUsers(prev => prev.map(user => 
          user.id === userId ? { 
            ...user, 
            group_id: result.user.group_id,
            group_name: result.user.group_name,
            organization_id: result.user.organization_id,
            organization_name: result.user.organization_name
          } : user
        ));
      } else {
        // אם לא קיבלנו מידע מעודכן, נעדכן רק את מה שאנחנו יודעים
        setUsers(prev => prev.map(user => 
          user.id === userId ? { 
            ...user, 
            group_id: groupId || null,
            group_name: groupId ? 'מעדכן...' : undefined,
            organization_id: organizationId || user.organization_id,
            organization_name: organizationId ? organizations.find(org => org.id === organizationId)?.name : user.organization_name
          } : user
        ));

        // רק אם לא קיבלנו מידע מעודכן, נטען מחדש אחרי זמן קצר
        setTimeout(() => {
          fetchUsers();
        }, 1000);
      }

      // הודעת הצלחה
      setSuccessMessage('קבוצת המשתמש עודכנה בהצלחה');
      setTimeout(() => setSuccessMessage(null), 3000);

    } catch (error) {
      console.error('Error updating user group:', error);
      setError(error instanceof Error ? error.message : 'שגיאה בעדכון קבוצת המשתמש');
    } finally {
      setUpdatingUserId(null);
    }
  };



  if (!isAdmin) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-red-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <span className="font-medium">אין הרשאה</span>
        </div>
        <p className="text-sm text-red-600 mt-1">רק מנהלי מערכת יכולים לנהל פרופילי משתמשים. מנהלי ארגון יכולים לצפות בהתקדמות התלמידים באירגון שלהם.</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`bg-white rounded-lg border border-slate-200 p-6 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                <div className="h-4 bg-slate-200 rounded w-1/4"></div>
                <div className="h-6 bg-slate-200 rounded w-20"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Users Management */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">ניהול פרופילי משתמשים</h3>
              <p className="text-sm text-slate-600 mt-1">עריכת תפקידים וארגונים של משתמשים במערכת</p>
            </div>
            <div className="flex items-center gap-3">
              <EmailTestComponent />
              <AddUserForm 
                organizations={organizations} 
                onUserAdded={refreshUsers}
              />
              <BulkUserImport
                organizations={organizations}
                groups={groups}
                onUsersAdded={refreshUsers}
              />
              <ExportUsersCSV organizations={organizations} />
              <button
                onClick={refreshUsers}
                disabled={refreshing}
                className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
              >
                {refreshing ? (
                  <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                )}
                רענון
              </button>
            </div>
          </div>

          {/* Search and Filter Bar */}
          <div className="flex gap-3">
            <div className="relative flex-1">
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                placeholder="חיפוש לפי שם או מייל..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
              />
            </div>
            
            <select
              value={selectedOrganization}
              onChange={(e) => {
                setSelectedOrganization(e.target.value);
                // אם בוחרים ארגון ספציפי, נאפס את סינון הקבוצה
                if (e.target.value !== 'all') {
                  setSelectedGroup('all');
                }
              }}
              className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white min-w-[150px]"
            >
              <option value="all">כל הארגונים</option>
              <option value="no-org">ללא ארגון</option>
              {organizations.map(org => (
                <option key={org.id} value={org.id}>{org.name}</option>
              ))}
            </select>

            {/* סינון לפי קבוצה - מוצג רק אם נבחר ארגון ספציפי */}
            {selectedOrganization !== 'all' && selectedOrganization !== 'no-org' && (
              <select
                value={selectedGroup}
                onChange={(e) => setSelectedGroup(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white min-w-[130px]"
              >
                <option value="all">כל הקבוצות</option>
                <option value="no-group">ללא קבוצה</option>
                {/* נטען את הקבוצות של הארגון הנבחר */}
                {(() => {
                  const orgGroups = users
                    .filter(user => user.organization_id === selectedOrganization && user.group_id && user.group_name)
                    .reduce((acc, user) => {
                      if (user.group_id && user.group_name && !acc.some(g => g.id === user.group_id)) {
                        acc.push({ id: user.group_id, name: user.group_name });
                      }
                      return acc;
                    }, [] as Array<{ id: string; name: string }>)
                    .sort((a, b) => a.name.localeCompare(b.name, 'he'));
                  
                  return orgGroups.map(group => (
                    <option key={group.id} value={group.id}>{group.name}</option>
                  ));
                })()}
              </select>
            )}
            
            <button
              onClick={() => {
                if (collapsedOrgs.size === 0) {
                  // כווץ הכל
                  const allOrgKeys = Object.keys(filteredUsers.reduce((acc, user) => {
                    const orgKey = user.organization_id || 'no-org';
                    acc[orgKey] = true;
                    return acc;
                  }, {} as Record<string, boolean>));
                  setCollapsedOrgs(new Set(allOrgKeys));
                } else {
                  // הרחב הכל
                  setCollapsedOrgs(new Set());
                }
              }}
              className="px-3 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white flex items-center gap-2"
              title={collapsedOrgs.size === 0 ? "כווץ את כל הארגונים" : "הרחב את כל הארגונים"}
            >
              <svg 
                className={`w-4 h-4 text-slate-500 transition-transform ${collapsedOrgs.size === 0 ? '' : 'rotate-180'}`} 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
              </svg>
              {collapsedOrgs.size === 0 ? 'כווץ הכל' : 'הרחב הכל'}
            </button>
          </div>
        </div>

        <div className="p-6">
          {/* סטטיסטיקה מהירה */}
          {users.length > 0 && (
            <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-700">
                  סה"כ {users.length} משתמשים
                  {(selectedOrganization !== 'all' || selectedGroup !== 'all') && ` • מוצגים ${filteredUsers.length} משתמשים`}
                  {searchTerm && ` • תוצאות חיפוש: ${filteredUsers.length}`}
                </span>
                <div className="flex items-center gap-4 text-blue-600">
                  <span>{organizations.length} ארגונים</span>
                  <span>
                    {(() => {
                      const totalGroups = users
                        .filter(user => user.group_id && user.group_name)
                        .reduce((acc, user) => {
                          if (user.group_id && !acc.has(user.group_id)) {
                            acc.add(user.group_id);
                          }
                          return acc;
                        }, new Set()).size;
                      return `${totalGroups} קבוצות`;
                    })()}
                  </span>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {successMessage && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {successMessage}
            </div>
          )}

          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p>
                {searchTerm && selectedOrganization !== 'all' && selectedGroup !== 'all'
                  ? `לא נמצאו משתמשים המתאימים לחיפוש "${searchTerm}" בארגון והקבוצה הנבחרים`
                  : searchTerm && selectedOrganization !== 'all' 
                    ? `לא נמצאו משתמשים המתאימים לחיפוש "${searchTerm}" בארגון הנבחר`
                    : searchTerm && selectedGroup !== 'all'
                      ? `לא נמצאו משתמשים המתאימים לחיפוש "${searchTerm}" בקבוצה הנבחרת`
                      : searchTerm 
                        ? `לא נמצאו משתמשים המתאימים לחיפוש "${searchTerm}"`
                        : selectedOrganization !== 'all' && selectedGroup !== 'all'
                          ? 'לא נמצאו משתמשים בארגון והקבוצה הנבחרים'
                          : selectedOrganization !== 'all'
                            ? 'לא נמצאו משתמשים בארגון הנבחר'
                            : selectedGroup !== 'all'
                              ? 'לא נמצאו משתמשים בקבוצה הנבחרת'
                              : 'לא נמצאו משתמשים עם פרופילים'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {(() => {
                // קיבוץ המשתמשים לפי ארגון
                const usersByOrganization = filteredUsers.reduce((acc, user) => {
                  const orgKey = user.organization_id || 'no-org';
                  const orgName = user.organization_name || 'ללא ארגון';
                  
                  if (!acc[orgKey]) {
                    acc[orgKey] = {
                      name: orgName,
                      users: []
                    };
                  }
                  acc[orgKey].users.push(user);
                  return acc;
                }, {} as Record<string, { name: string; users: User[] }>);

                // מיון הארגונים - ללא ארגון בסוף
                const sortedOrgs = Object.entries(usersByOrganization).sort(([keyA, orgA], [keyB, orgB]) => {
                  if (keyA === 'no-org') return 1;
                  if (keyB === 'no-org') return -1;
                  return orgA.name.localeCompare(orgB.name, 'he');
                });

                return sortedOrgs.map(([orgKey, org]) => {
                  const isCollapsed = collapsedOrgs.has(orgKey);
                  
                  // קיבוץ המשתמשים בארגון לפי קבוצות
                  const usersByGroup = org.users.reduce((acc, user) => {
                    const groupKey = user.group_id || 'no-group';
                    const groupName = user.group_name || 'ללא קבוצה';
                    
                    if (!acc[groupKey]) {
                      acc[groupKey] = {
                        name: groupName,
                        users: []
                      };
                    }
                    acc[groupKey].users.push(user);
                    return acc;
                  }, {} as Record<string, { name: string; users: User[] }>);

                  // מיון הקבוצות - ללא קבוצה בסוף
                  const sortedGroups = Object.entries(usersByGroup).sort(([keyA, groupA], [keyB, groupB]) => {
                    if (keyA === 'no-group') return 1;
                    if (keyB === 'no-group') return -1;
                    return groupA.name.localeCompare(groupB.name, 'he');
                  });
                  
                  return (
                    <div key={orgKey}>
                      {/* כותרת ארגון מינימלית עם אפשרות כיווץ */}
                      <div 
                        className="flex items-center gap-2 mb-2 px-1 cursor-pointer hover:bg-slate-50 rounded py-1"
                        onClick={() => {
                          const newCollapsed = new Set(collapsedOrgs);
                          if (isCollapsed) {
                            newCollapsed.delete(orgKey);
                          } else {
                            newCollapsed.add(orgKey);
                          }
                          setCollapsedOrgs(newCollapsed);
                        }}
                      >
                        <svg 
                          className={`w-4 h-4 text-slate-400 transition-transform ${isCollapsed ? 'rotate-90' : ''}`} 
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                        </svg>
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <h4 className="text-sm font-medium text-slate-700">{org.name}</h4>
                        <div className="flex-1 h-px bg-slate-200"></div>
                        <span className="text-xs text-slate-500">{org.users.length} משתמשים</span>
                      </div>
                      
                      {/* קבוצות בארגון - מוצגות רק אם הארגון לא מכווץ */}
                      {!isCollapsed && (
                        <div className="mr-4 space-y-3 mb-4">
                          {sortedGroups.map(([groupKey, group]) => (
                            <div key={`${orgKey}-${groupKey}`}>
                              {/* כותרת קבוצה מינימלית */}
                              <div className="flex items-center gap-2 mb-1 px-1">
                                <div className="w-1 h-1 bg-green-500 rounded-full"></div>
                                <h5 className="text-xs font-medium text-slate-600">{group.name}</h5>
                                <div className="flex-1 h-px bg-slate-100"></div>
                                <span className="text-xs text-slate-400">{group.users.length}</span>
                              </div>
                              
                              {/* רשימת המשתמשים בקבוצה */}
                              <div className="space-y-2">
                                {group.users.map(user => (
                                  <div key={user.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg border-r-2 border-green-200">
                                    <div className="flex items-center gap-3">
                                      <div className="w-7 h-7 bg-slate-200 rounded-full flex items-center justify-center">
                                        <svg className="w-3 h-3 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                                        </svg>
                                      </div>
                                      <div>
                                        <p className="font-medium text-slate-900 text-sm">{user.user_name || user.email}</p>
                                        <div className="flex items-center gap-2 text-xs text-slate-500">
                                          <span>{user.user_email}</span>
                                          <span>•</span>
                                          <span>ID: {user.id.slice(0, 8)}...</span>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-2">
                                      <UserRoleBadge role={user.role} size="sm" />
                                      
                                      <select
                                        value={user.role || 'student'}
                                        onChange={(e) => updateUserRole(user.id, e.target.value as RoleType, user.organization_id || undefined)}
                                        disabled={updatingUserId === user.id}
                                        className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                        title={updatingUserId === user.id ? "מעדכן תפקיד..." : "בחר תפקיד"}
                                      >
                                        <option value="student">סטודנט</option>
                                        <option value="instructor">מרצה</option>
                                        <option value="moderator">מנחה</option>
                                        <option value="org_admin">מנהל ארגון</option>
                                        <option value="admin">מנהל</option>
                                      </select>

                                      <select
                                        value={user.organization_id || ''}
                                        onChange={(e) => {
                                          const newOrgId = e.target.value || undefined;
                                          // אם משנים ארגון, נאפס את הקבוצה
                                          if (newOrgId !== user.organization_id) {
                                            updateUserRole(user.id, user.role!, newOrgId);
                                          }
                                        }}
                                        disabled={updatingUserId === user.id}
                                        className="text-xs border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                        title={updatingUserId === user.id ? "מעדכן ארגון..." : "בחר ארגון"}
                                      >
                                        <option value="">ללא ארגון</option>
                                        {organizations.map(org => (
                                          <option key={org.id} value={org.id}>{org.name}</option>
                                        ))}
                                      </select>

                                      {user.organization_id ? (
                                        <div className="min-w-[120px]">
                                          <GroupSelector
                                            organizationId={user.organization_id}
                                            value={user.group_id || ''}
                                            onChange={(groupId) => updateUserGroup(user.id, groupId)}
                                            disabled={updatingUserId === user.id || !isAdmin}
                                            placeholder={updatingUserId === user.id ? "מעדכן..." : "בחר קבוצה..."}
                                            className="text-xs"
                                          />
                                        </div>
                                      ) : (
                                        <div className="min-w-[120px] text-xs text-gray-500">
                                          בחר ארגון תחילה
                                        </div>
                                      )}

                                      {updatingUserId === user.id && (
                                        <div className="w-4 h-4">
                                          <svg className="animate-spin w-4 h-4 text-blue-500" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                          </svg>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                });
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}