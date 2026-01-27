"use client";

import { useState, useEffect } from 'react';
import { rlsSupabase } from '@/lib/supabase';
import { authenticatedFetchJson } from '@/lib/utils/api-helpers';
import { Organization } from '@/lib/types/database.types';
import { organizationService, OrganizationWithStats } from '@/lib/services/organizationService';

interface GroupWithUserCount {
  id: string;
  name: string;
  organization_id: string;
  userCount?: number;
  organizationName?: string;
  created_at: string;
  updated_at: string;
}

interface OrganizationGroupsManagementProps {
  className?: string;
}

interface CreateOrganizationFormData {
  name: string;
}

interface CreateGroupFormData {
  name: string;
  organizationId: string;
}

interface EditOrganizationFormData {
  id: string;
  name: string;
}

interface EditGroupFormData {
  id: string;
  name: string;
}

export default function OrganizationGroupsManagement({ className = '' }: OrganizationGroupsManagementProps) {
  const [organizations, setOrganizations] = useState<OrganizationWithStats[]>([]);
  const [groups, setGroups] = useState<GroupWithUserCount[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedOrganization, setSelectedOrganization] = useState<OrganizationWithStats | null>(null);
  const [viewMode, setViewMode] = useState<'organizations' | 'groups'>('organizations');
  
  // Create organization form state
  const [showCreateOrgForm, setShowCreateOrgForm] = useState(false);
  const [createOrgFormData, setCreateOrgFormData] = useState<CreateOrganizationFormData>({
    name: ''
  });
  const [creatingOrg, setCreatingOrg] = useState(false);
  
  // Create group form state
  const [showCreateGroupForm, setShowCreateGroupForm] = useState(false);
  const [createGroupFormData, setCreateGroupFormData] = useState<CreateGroupFormData>({
    name: '',
    organizationId: ''
  });
  const [creatingGroup, setCreatingGroup] = useState(false);
  
  // Edit forms state
  const [editingOrganization, setEditingOrganization] = useState<EditOrganizationFormData | null>(null);
  const [editingGroup, setEditingGroup] = useState<EditGroupFormData | null>(null);
  const [updating, setUpdating] = useState(false);
  
  // Delete confirmation state
  const [deletingOrgId, setDeletingOrgId] = useState<string | null>(null);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    checkAdminStatus();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchOrganizations();
      fetchGroups();
    }
  }, [isAdmin]);

  const checkAdminStatus = async () => {
    try {
      const { isAdmin: adminStatus } = await rlsSupabase.isAdmin();
      
      // בדיקה נוספת אם המשתמש הוא מנהל ארגון
      let hasAdminAccess = adminStatus;
      if (!adminStatus) {
        const { user: currentUser } = await rlsSupabase.getCurrentUser();
        if (currentUser) {
          try {
            const { data: profile, error } = await rlsSupabase.from('user_profile')
              .select('*')
              .eq('user_id', currentUser.id)
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
      }
      
      setIsAdmin(hasAdminAccess);
      
      if (!hasAdminAccess) {
        setError('אין לך הרשאות מנהל לצפות בדף זה');
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setError('שגיאה בבדיקת הרשאות');
    }
  };

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);
      const orgsData = await organizationService.getAllOrganizations();
      setOrganizations(orgsData);
    } catch (error: any) {
      console.error('Error fetching organizations:', error);
      setError('שגיאה בשליפת רשימת הארגונים');
    } finally {
      setLoading(false);
    }
  };

  const fetchGroups = async () => {
    try {
      const { data, error } = await authenticatedFetchJson('/api/admin/groups');
      
      if (error) {
        throw new Error(error);
      }

      setGroups(data.groups || []);
    } catch (error: any) {
      console.error('Error fetching groups:', error);
      setError('שגיאה בשליפת רשימת הקבוצות');
    }
  };

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createOrgFormData.name.trim()) {
      setError('יש למלא את שם הארגון');
      return;
    }

    try {
      setCreatingOrg(true);
      setError(null);

      await organizationService.createOrganization({
        name: createOrgFormData.name.trim()
      });

      // Reset form and refresh data
      setCreateOrgFormData({ name: '' });
      setShowCreateOrgForm(false);
      await fetchOrganizations();

    } catch (error: any) {
      console.error('Error creating organization:', error);
      setError(error.message || 'שגיאה ביצירת הארגון');
    } finally {
      setCreatingOrg(false);
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createGroupFormData.name.trim() || !selectedOrganization) {
      setError('יש למלא את שם הקבוצה ולבחור ארגון');
      return;
    }

    try {
      setCreatingGroup(true);
      setError(null);

      const { data, error } = await authenticatedFetchJson('/api/admin/groups', {
        method: 'POST',
        body: JSON.stringify({
          name: createGroupFormData.name.trim(),
          organizationId: selectedOrganization!.id
        }),
      });

      if (error) {
        throw new Error(error);
      }

      // Reset form and refresh data
      setCreateGroupFormData({ name: '', organizationId: selectedOrganization?.id || '' });
      setShowCreateGroupForm(false);
      await fetchGroups();

    } catch (error: any) {
      console.error('Error creating group:', error);
      if (error.code === '23505') {
        setError('קבוצה בשם זה כבר קיימת בארגון');
      } else {
        setError('שגיאה ביצירת הקבוצה');
      }
    } finally {
      setCreatingGroup(false);
    }
  };

  const handleEditOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingOrganization || !editingOrganization.name.trim()) {
      setError('יש למלא את שם הארגון');
      return;
    }

    try {
      setUpdating(true);
      setError(null);

      await organizationService.updateOrganization(editingOrganization.id, {
        name: editingOrganization.name.trim()
      });

      // Reset form and refresh data
      setEditingOrganization(null);
      await fetchOrganizations();

    } catch (error: any) {
      console.error('Error updating organization:', error);
      setError(error.message || 'שגיאה בעדכון הארגון');
    } finally {
      setUpdating(false);
    }
  };

  const handleEditGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingGroup || !editingGroup.name.trim()) {
      setError('יש למלא את שם הקבוצה');
      return;
    }

    try {
      setUpdating(true);
      setError(null);

      const { data, error } = await authenticatedFetchJson(`/api/admin/groups/${editingGroup.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          name: editingGroup.name.trim()
        }),
      });

      if (error) {
        throw new Error(error);
      }

      // Reset form and refresh groups
      setEditingGroup(null);
      await fetchGroups();

    } catch (error: any) {
      console.error('Error updating group:', error);
      if (error.code === '23505') {
        setError('קבוצה בשם זה כבר קיימת בארגון');
      } else {
        setError('שגיאה בעדכון הקבוצה');
      }
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteOrganization = async (orgId: string) => {
    try {
      setDeleting(true);
      setError(null);

      await organizationService.deleteOrganization(orgId);
      
      // Refresh data
      await fetchOrganizations();
      await fetchGroups();
      setDeletingOrgId(null);

    } catch (error: any) {
      console.error('Error deleting organization:', error);
      setError(error.message || 'שגיאה במחיקת הארגון');
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      setDeleting(true);
      setError(null);

      const { data, error } = await authenticatedFetchJson(`/api/admin/groups/${groupId}`, {
        method: 'DELETE'
      });

      if (error) {
        throw new Error(error);
      }

      if (data && data.error) {
        throw new Error(data.error || 'שגיאה במחיקת קבוצה');
      }
      
      // Refresh data
      await fetchGroups();
      await fetchOrganizations(); // לעדכון מספר הקבוצות בארגונים
      setDeletingGroupId(null);

    } catch (error: any) {
      console.error('Error deleting group:', error);
      setError(error.message || 'שגיאה במחיקת הקבוצה');
    } finally {
      setDeleting(false);
    }
  };

  const filteredOrganizations = organizations.filter(org => 
    org.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredGroups = selectedOrganization ? 
    groups.filter(group => {
      const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesOrganization = group.organization_id === selectedOrganization.id;
      return matchesSearch && matchesOrganization;
    }) : [];

  if (!isAdmin) {
    return (
      <div className={`bg-red-50 border border-red-200 rounded-lg p-4 ${className}`}>
        <div className="flex items-center gap-2 text-red-700">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
          <span className="font-medium">אין הרשאה</span>
        </div>
        <p className="text-sm text-red-600 mt-1">רק מנהלים יכולים לנהל ארגונים וקבוצות</p>
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
      {/* Header */}
      <div className="bg-white rounded-lg border border-slate-200">
        <div className="p-6 border-b border-slate-200">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-slate-900">
                {viewMode === 'organizations' ? 'ניהול ארגונים' : `קבוצות בארגון: ${selectedOrganization?.name}`}
              </h3>
              <p className="text-sm text-slate-600 mt-1">
                {viewMode === 'organizations' 
                  ? 'יצירה וניהול ארגונים. לחץ על ארגון לצפייה בקבוצות שלו'
                  : 'יצירה וניהול קבוצות בארגון הנבחר'
                }
              </p>
            </div>
            <div className="flex items-center gap-3">
              {viewMode === 'groups' && (
                <button
                  onClick={() => {
                    setViewMode('organizations');
                    setSelectedOrganization(null);
                    setSearchTerm('');
                  }}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  חזרה לארגונים
                </button>
              )}
              <button
                onClick={() => {
                  fetchOrganizations();
                  fetchGroups();
                }}
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
              placeholder={viewMode === 'organizations' ? 'חיפוש ארגונים...' : 'חיפוש קבוצות...'}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pr-10 pl-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            />
          </div>
        </div>

        <div className="p-6">
          {/* Create Forms */}
          {viewMode === 'organizations' && showCreateOrgForm && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-medium text-slate-900 mb-3">יצירת ארגון חדש</h4>
              <form onSubmit={handleCreateOrganization} className="space-y-3">
                <input
                  type="text"
                  placeholder="שם הארגון"
                  value={createOrgFormData.name}
                  onChange={(e) => setCreateOrgFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={creatingOrg || !createOrgFormData.name.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {creatingOrg ? 'יוצר...' : 'יצירה'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateOrgForm(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    ביטול
                  </button>
                </div>
              </form>
            </div>
          )}

          {viewMode === 'groups' && showCreateGroupForm && selectedOrganization && (
            <div className="mb-6 p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-slate-900 mb-3">יצירת קבוצה חדשה בארגון: {selectedOrganization.name}</h4>
              <form onSubmit={handleCreateGroup} className="space-y-3">
                <input
                  type="text"
                  placeholder="שם הקבוצה"
                  value={createGroupFormData.name}
                  onChange={(e) => setCreateGroupFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={creatingGroup || !createGroupFormData.name.trim()}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-slate-300 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {creatingGroup ? 'יוצר...' : 'יצירה'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCreateGroupForm(false)}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    ביטול
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mb-6 flex gap-2">
            {viewMode === 'organizations' && (
              <button
                onClick={() => setShowCreateOrgForm(!showCreateOrgForm)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded-lg text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                ארגון חדש
              </button>
            )}
            {viewMode === 'groups' && selectedOrganization && (
              <button
                onClick={() => setShowCreateGroupForm(!showCreateGroupForm)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 rounded-lg text-sm font-medium transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                </svg>
                קבוצה חדשה
              </button>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
            </div>
          )}

          {/* Content */}
          {viewMode === 'organizations' ? (
            /* Organizations List */
            filteredOrganizations.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
                <p>{searchTerm ? `לא נמצאו ארגונים המתאימים לחיפוש "${searchTerm}"` : 'לא נמצאו ארגונים'}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrganizations.map(org => (
                  <div key={org.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                    <div 
                      className="flex items-center gap-3 flex-1 cursor-pointer"
                      onClick={() => {
                        setSelectedOrganization(org);
                        setViewMode('groups');
                        setSearchTerm('');
                      }}
                    >
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                      </div>
                      <div>
                        {editingOrganization?.id === org.id ? (
                          <form onSubmit={handleEditOrganization} className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="text"
                              value={editingOrganization.name}
                              onChange={(e) => setEditingOrganization(prev => prev ? { ...prev, name: e.target.value } : null)}
                              className="px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                              autoFocus
                            />
                            <button
                              type="submit"
                              disabled={updating}
                              className="px-2 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs font-medium transition-colors"
                            >
                              {updating ? 'שומר...' : 'שמור'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingOrganization(null)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition-colors"
                            >
                              ביטול
                            </button>
                          </form>
                        ) : (
                          <>
                            <p className="font-medium text-slate-900">{org.name}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span>{org.groupCount} קבוצות</span>
                              <span>•</span>
                              <span>{org.userCount} משתמשים</span>
                              <span>•</span>
                              <span>לחץ לצפייה בקבוצות</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {editingOrganization?.id !== org.id && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingOrganization({ id: org.id, name: org.name });
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded text-xs font-medium transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          עריכה
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeletingOrgId(org.id);
                          }}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded text-xs font-medium transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          מחיקה
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            /* Groups List */
            filteredGroups.length === 0 ? (
              <div className="text-center py-8 text-slate-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p>{searchTerm ? `לא נמצאו קבוצות המתאימות לחיפוש "${searchTerm}"` : `אין קבוצות בארגון ${selectedOrganization?.name}`}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredGroups.map(group => (
                  <div key={group.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <div>
                        {editingGroup?.id === group.id ? (
                          <form onSubmit={handleEditGroup} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={editingGroup.name}
                              onChange={(e) => setEditingGroup(prev => prev ? { ...prev, name: e.target.value } : null)}
                              className="px-2 py-1 border border-slate-200 rounded text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                              autoFocus
                            />
                            <button
                              type="submit"
                              disabled={updating}
                              className="px-2 py-1 bg-green-600 hover:bg-green-700 text-white rounded text-xs font-medium transition-colors"
                            >
                              {updating ? 'שומר...' : 'שמור'}
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingGroup(null)}
                              className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded text-xs font-medium transition-colors"
                            >
                              ביטול
                            </button>
                          </form>
                        ) : (
                          <>
                            <p className="font-medium text-slate-900">{group.name}</p>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                              <span>{group.userCount || 0} משתמשים</span>
                              <span>•</span>
                              <span>ID: {group.id.slice(0, 8)}...</span>
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {editingGroup?.id !== group.id && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setEditingGroup({ id: group.id, name: group.name })}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 rounded text-xs font-medium transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                          עריכה
                        </button>
                        <button
                          onClick={() => setDeletingGroupId(group.id)}
                          className="inline-flex items-center gap-1 px-2 py-1 bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 rounded text-xs font-medium transition-colors"
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          מחיקה
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>

      {/* Delete Organization Confirmation Modal */}
      {deletingOrgId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">מחיקת ארגון</h3>
                <p className="text-sm text-slate-600">פעולה זו לא ניתנת לביטול</p>
              </div>
            </div>
            
            <p className="text-sm text-slate-700 mb-6">
              האם אתה בטוח שברצונך למחוק את הארגון? 
              {organizations.find(o => o.id === deletingOrgId)?.groupCount || organizations.find(o => o.id === deletingOrgId)?.userCount ? 
                ' לא ניתן למחוק ארגון שיש בו קבוצות או משתמשים.' : 
                ' פעולה זו תמחק את הארגון לצמיתות.'
              }
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingOrgId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={() => handleDeleteOrganization(deletingOrgId)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {deleting ? 'מוחק...' : 'מחק ארגון'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Group Confirmation Modal */}
      {deletingGroupId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">מחיקת קבוצה</h3>
                <p className="text-sm text-slate-600">פעולה זו לא ניתנת לביטול</p>
              </div>
            </div>
            
            <p className="text-sm text-slate-700 mb-6">
              האם אתה בטוח שברצונך למחוק את הקבוצה? 
              {groups.find(g => g.id === deletingGroupId)?.userCount ? 
                ' לא ניתן למחוק קבוצה שיש בה משתמשים משויכים.' : 
                ' פעולה זו תמחק את הקבוצה לצמיתות.'
              }
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setDeletingGroupId(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium transition-colors"
              >
                ביטול
              </button>
              <button
                onClick={() => handleDeleteGroup(deletingGroupId)}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-400 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {deleting ? 'מוחק...' : 'מחק קבוצה'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}