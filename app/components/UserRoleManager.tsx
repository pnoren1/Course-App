"use client";

import { useState, useEffect } from 'react';
import { rlsSupabase } from '@/lib/supabase';
import { RoleType, Organization } from '@/lib/types/database.types';
import UserRoleBadge from './UserRoleBadge';
import AddUserForm from './AddUserForm';
import PendingInvitations from './PendingInvitations';

interface User {
  id: string;
  email: string;
  full_name?: string;
  user_name?: string | null;
  user_email?: string | null;
  role?: RoleType;
  organization_id?: string | null;
  organization_name?: string;
}

interface UserRoleManagerProps {
  className?: string;
}

export default function UserRoleManager({ className = '' }: UserRoleManagerProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [showCreateOrg, setShowCreateOrg] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgDescription, setNewOrgDescription] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchOrganizations();
    }
  }, [isAdmin]);

  // Filter users based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users);
    } else {
      const filtered = users.filter(user => 
        user.user_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.user_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredUsers(filtered);
    }
  }, [users, searchTerm]);

  const checkAdminStatus = async () => {
    try {
      const { isAdmin: adminStatus } = await rlsSupabase.isAdmin();
      setIsAdmin(adminStatus);
      
      if (!adminStatus) {
        setError('אין לך הרשאות מנהל לצפות בדף זה');
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

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      // שליפת כל המשתמשים עם תפקידים וארגונים
      const userProfilesResult = await rlsSupabase.from('user_profile').select(`
        user_id,
        user_name,
        email,
        role,
        organization_id,
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
        granted_at: string;
        granted_by: string | null;
      }>;

      // שליפת מידע על הארגונים
      const orgsResult = await rlsSupabase.from('organizations').select('id, name');
      
      if (orgsResult.error) {
        console.error('Error fetching organizations for mapping:', orgsResult.error);
      }
      
      const orgs = ((orgsResult.data as unknown) as Array<{ id: string; name: string }>) || [];
      const orgMap = new Map(orgs.map(org => [org.id, org.name]));

      const usersWithRoles = userProfiles?.map(up => ({
        id: up.user_id,
        email: up.email || `user-${up.user_id.slice(0, 8)}`,
        user_name: up.user_name,
        user_email: up.email,
        role: up.role as RoleType,
        organization_id: up.organization_id,
        organization_name: up.organization_id ? orgMap.get(up.organization_id) : undefined
      })) || [];

      setUsers(usersWithRoles);
    } catch (error) {
      console.error('Error fetching users:', error);
      setError('שגיאה בשליפת רשימת המשתמשים');
    } finally {
      setLoading(false);
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

      // עדכון המצב המקומי
      setUsers(prev => prev.map(user => 
        user.id === userId ? { 
          ...user, 
          role: newRole,
          organization_id: organizationId,
          organization_name: organizationId ? organizations.find(org => org.id === organizationId)?.name : undefined
        } : user
      ));

    } catch (error) {
      console.error('Error updating user role:', error);
      setError('שגיאה בעדכון תפקיד המשתמש');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const createOrganization = async () => {
    if (!newOrgName.trim()) return;

    try {
      const result = await rlsSupabase.rpc('create_organization', {
        org_name: newOrgName.trim(),
        org_description: newOrgDescription.trim() || null
      });

      if (result.error) {
        throw result.error;
      }

      // רענון רשימת הארגונים
      await fetchOrganizations();
      
      // איפוס הטופס
      setNewOrgName('');
      setNewOrgDescription('');
      setShowCreateOrg(false);

    } catch (error) {
      console.error('Error creating organization:', error);
      setError('שגיאה ביצירת הארגון');
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
        <p className="text-sm text-red-600 mt-1">רק מנהלים יכולים לנהל פרופילי משתמשים</p>
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
      {/* Pending Invitations */}
      <PendingInvitations />

      {/* Organizations Management */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">ניהול ארגונים</h3>
              <p className="text-sm text-slate-600 mt-1">יצירה וניהול ארגונים במערכת</p>
            </div>
            <button
              onClick={() => setShowCreateOrg(!showCreateOrg)}
              className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              ארגון חדש
            </button>
          </div>
        </div>

        <div className="p-6">
          {showCreateOrg && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-slate-900 mb-3">יצירת ארגון חדש</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  placeholder="שם הארגון"
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <textarea
                  placeholder="תיאור הארגון (אופציונלי)"
                  value={newOrgDescription}
                  onChange={(e) => setNewOrgDescription(e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="flex gap-2">
                  <button
                    onClick={createOrganization}
                    disabled={!newOrgName.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    יצירה
                  </button>
                  <button
                    onClick={() => setShowCreateOrg(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    ביטול
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {organizations.map(org => (
              <div key={org.id} className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                <div className="flex items-center gap-2 mb-2">
                  <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                  <h4 className="font-medium text-slate-900">{org.name}</h4>
                </div>
                {org.description && (
                  <p className="text-sm text-slate-600 mb-2">{org.description}</p>
                )}
                <div className="text-xs text-slate-500">
                  {(org as any).user_count || 0} משתמשים
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Users Management */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">ניהול פרופילי משתמשים</h3>
              <p className="text-sm text-slate-600 mt-1">עריכת תפקידים וארגונים של משתמשים במערכת</p>
            </div>
            <div className="flex items-center gap-3">
              <AddUserForm 
                organizations={organizations} 
                onUserAdded={fetchUsers}
              />
              <button
                onClick={fetchUsers}
                className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                רענון
              </button>
            </div>
          </div>

          {/* Search Bar */}
          <div className="relative">
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
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {filteredUsers.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p>{searchTerm ? `לא נמצאו משתמשים המתאימים לחיפוש "${searchTerm}"` : 'לא נמצאו משתמשים עם פרופילים'}</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUsers.map(user => (
                <div key={user.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div>
                      <p className="font-medium text-slate-900">{user.user_name || user.email}</p>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span>{user.user_email}</span>
                        <span>•</span>
                        <span>ID: {user.id.slice(0, 8)}...</span>
                        {user.organization_name && (
                          <>
                            <span>•</span>
                            <span>{user.organization_name}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <UserRoleBadge role={user.role} size="sm" />
                    
                    <select
                      value={user.role || 'student'}
                      onChange={(e) => updateUserRole(user.id, e.target.value as RoleType, user.organization_id || undefined)}
                      disabled={updatingUserId === user.id}
                      className="text-sm border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="student">סטודנט</option>
                      <option value="instructor">מרצה</option>
                      <option value="moderator">מנחה</option>
                      <option value="admin">מנהל</option>
                    </select>

                    <select
                      value={user.organization_id || ''}
                      onChange={(e) => updateUserRole(user.id, user.role!, e.target.value || undefined)}
                      disabled={updatingUserId === user.id}
                      className="text-sm border border-slate-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="">ללא ארגון</option>
                      {organizations.map(org => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>

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
          )}
        </div>
      </div>
    </div>
  );
}