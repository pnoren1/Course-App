'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '@/app/components/AdminLayout';
import { rlsSupabase } from '@/lib/supabase';

interface Organization {
  id: string;
  name: string;
}

interface Group {
  id: string;
  name: string;
  organization_id: string;
}

interface User {
  id: string;
  email: string;
  full_name: string;
}

export default function SendEmailPage() {
  const router = useRouter();
  const [recipientType, setRecipientType] = useState<'all' | 'organization' | 'group' | 'user'>('all');
  const [selectedOrganization, setSelectedOrganization] = useState('');
  const [selectedGroup, setSelectedGroup] = useState('');
  const [selectedUser, setSelectedUser] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [recipientCount, setRecipientCount] = useState<number | null>(null);

  // Load organizations
  useEffect(() => {
    fetchOrganizations();
  }, []);

  // Load groups when organization is selected
  useEffect(() => {
    if (selectedOrganization) {
      fetchGroups(selectedOrganization);
    }
  }, [selectedOrganization]);

  // Load users based on selection
  useEffect(() => {
    if (recipientType === 'user') {
      fetchUsers();
    }
  }, [recipientType]);

  const fetchOrganizations = async () => {
    try {
      const result = await rlsSupabase.rpc('get_all_organizations');
      
      if (result.error) {
        console.error('Error fetching organizations:', result.error);
        return;
      }

      setOrganizations(result.data || []);
    } catch (err) {
      console.error('Error fetching organizations:', err);
    }
  };

  const fetchGroups = async (orgId: string) => {
    try {
      const { data: { session } } = await rlsSupabase.auth.getSession();
      const token = session?.access_token;
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/admin/groups/by-organization/${orgId}`, {
        credentials: 'include',
        headers
      });
      
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups || []);
      }
    } catch (err) {
      console.error('Error fetching groups:', err);
    }
  };

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await rlsSupabase.auth.getSession();
      const token = session?.access_token;
      
      const headers: HeadersInit = {};
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/admin/users', {
        credentials: 'include',
        headers
      });
      
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecipientCount = async () => {
    const payload: any = {
      recipientType,
    };

    if (recipientType === 'organization' && selectedOrganization) {
      payload.organizationId = selectedOrganization;
    } else if (recipientType === 'group' && selectedGroup) {
      payload.groupId = selectedGroup;
    } else if (recipientType === 'user' && selectedUser) {
      payload.userId = selectedUser;
    }

    try {
      const { data: { session } } = await rlsSupabase.auth.getSession();
      const token = session?.access_token;
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/admin/recipient-count', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        setRecipientCount(data.count);
      } else {
        console.error('Error response:', res.status, await res.text());
      }
    } catch (err) {
      console.error('Error fetching recipient count:', err);
    }
  };

  // Update recipient count when selection changes
  useEffect(() => {
    const updateCount = async () => {
      if (recipientType === 'all') {
        await fetchRecipientCount();
      } else if (recipientType === 'organization' && selectedOrganization) {
        await fetchRecipientCount();
      } else if (recipientType === 'group' && selectedGroup) {
        await fetchRecipientCount();
      } else if (recipientType === 'user' && selectedUser) {
        setRecipientCount(1);
      } else {
        setRecipientCount(null);
      }
    };
    
    updateCount();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipientType, selectedOrganization, selectedGroup, selectedUser]);

  const handleSendEmail = async () => {
    if (!subject.trim() || !message.trim()) {
      setError('נא למלא נושא והודעה');
      return;
    }

    const payload: any = {
      recipientType,
      subject,
      message,
    };

    if (recipientType === 'organization' && selectedOrganization) {
      payload.organizationId = selectedOrganization;
    } else if (recipientType === 'group' && selectedGroup) {
      payload.groupId = selectedGroup;
    } else if (recipientType === 'user' && selectedUser) {
      payload.userId = selectedUser;
    }

    try {
      setSending(true);
      setError('');
      setSuccess('');

      const { data: { session } } = await rlsSupabase.auth.getSession();
      const token = session?.access_token;
      
      const headers: HeadersInit = {
        'Content-Type': 'application/json'
      };
      
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/admin/send-email', {
        method: 'POST',
        credentials: 'include',
        headers,
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess(`המייל נשלח בהצלחה ל-${data.recipientCount} נמענים`);
        setSubject('');
        setMessage('');
        setShowPreview(false);
      } else {
        setError(data.error || 'שגיאה בשליחת המייל');
      }
    } catch (err) {
      setError('שגיאה בשליחת המייל');
    } finally {
      setSending(false);
    }
  };

  return (
    <AdminLayout title="שליחת מיילים" description="שליחת מיילים למשתמשים במערכת">
      <div className="max-w-4xl mx-auto p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-4">
            {success}
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6 space-y-6">
          {/* Recipient Type Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">בחר נמענים</label>
            <select
              value={recipientType}
              onChange={(e) => {
                setRecipientType(e.target.value as any);
                setSelectedOrganization('');
                setSelectedGroup('');
                setSelectedUser('');
              }}
              className="w-full border rounded px-3 py-2"
            >
              <option value="all">כל המשתמשים</option>
              <option value="organization">ארגון ספציפי</option>
              <option value="group">קבוצה ספציפית</option>
              <option value="user">משתמש בודד</option>
            </select>
          </div>

          {/* Organization Selection */}
          {recipientType === 'organization' && (
            <div>
              <label className="block text-sm font-medium mb-2">בחר ארגון</label>
              <select
                value={selectedOrganization}
                onChange={(e) => setSelectedOrganization(e.target.value)}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">-- בחר ארגון --</option>
                {organizations.map((org) => (
                  <option key={org.id} value={org.id}>
                    {org.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Group Selection */}
          {recipientType === 'group' && (
            <>
              <div>
                <label className="block text-sm font-medium mb-2">בחר ארגון</label>
                <select
                  value={selectedOrganization}
                  onChange={(e) => {
                    setSelectedOrganization(e.target.value);
                    setSelectedGroup('');
                  }}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">-- בחר ארגון --</option>
                  {organizations.map((org) => (
                    <option key={org.id} value={org.id}>
                      {org.name}
                    </option>
                  ))}
                </select>
              </div>
              {selectedOrganization && (
                <div>
                  <label className="block text-sm font-medium mb-2">בחר קבוצה</label>
                  <select
                    value={selectedGroup}
                    onChange={(e) => setSelectedGroup(e.target.value)}
                    className="w-full border rounded px-3 py-2"
                  >
                    <option value="">-- בחר קבוצה --</option>
                    {groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </>
          )}

          {/* User Selection */}
          {recipientType === 'user' && (
            <div>
              <label className="block text-sm font-medium mb-2">בחר משתמש</label>
              {loading ? (
                <p className="text-gray-500">טוען משתמשים...</p>
              ) : (
                <select
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">-- בחר משתמש --</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.full_name} ({user.email})
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}

          {/* Subject */}
          <div>
            <label className="block text-sm font-medium mb-2">נושא המייל</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="הזן נושא למייל"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-sm font-medium mb-2">תוכן ההודעה</label>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="w-full border rounded px-3 py-2 min-h-[200px]"
              placeholder="הזן את תוכן ההודעה כאן..."
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            {recipientCount !== null && (
              <div className="flex items-center text-sm text-gray-600 bg-blue-50 px-4 py-2 rounded">
                <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span className="font-medium">{recipientCount} נמענים</span>
              </div>
            )}
            <button
              onClick={() => setShowPreview(true)}
              disabled={!subject.trim() || !message.trim() || recipientCount === null || recipientCount === 0}
              className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              תצוגה מקדימה
            </button>
            <button
              onClick={handleSendEmail}
              disabled={sending || !subject.trim() || !message.trim() || recipientCount === null || recipientCount === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {sending ? 'שולח...' : 'שלח מייל'}
            </button>
          </div>
        </div>

        {/* Preview Modal */}
        {showPreview && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold">תצוגה מקדימה</h2>
                  <button
                    onClick={() => setShowPreview(false)}
                    className="text-gray-500 hover:text-gray-700 text-2xl"
                  >
                    ×
                  </button>
                </div>
                
                {/* Email Preview with actual styling */}
                <div className="border rounded-lg overflow-hidden bg-gradient-to-br from-purple-100 to-indigo-100 p-8">
                  <div className="max-w-md mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden border-2 border-gray-200">
                    {/* Header */}
                    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-7 text-center text-white">
                      <div className="flex items-center justify-center gap-3">
                        <h1 className="text-xl font-bold">פורטל הקורסים</h1>
                        <span className="text-xl">🎓</span>
                      </div>
                    </div>
                    
                    {/* Content */}
                    <div className="p-8">
                      <div className="mb-4 pb-4 border-b">
                        <div className="text-sm text-gray-500 mb-1">נושא:</div>
                        <div className="font-semibold text-gray-900">{subject}</div>
                      </div>
                      <div 
                        className="text-gray-800 leading-relaxed"
                        style={{ whiteSpace: 'pre-wrap' }}
                      >
                        {message}
                      </div>
                    </div>
                    
                    {/* Footer */}
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 p-6 text-center border-t">
                      <div className="text-indigo-600 font-semibold mb-2">
                        פורטל הקורסים 🌟
                      </div>
                      <div className="text-xs text-gray-500">
                        מייל זה נשלח אוטומטית ממערכת פורטל הקורסים<br />
                        אין להשיב למייל זה
                      </div>
                    </div>
                  </div>
                </div>

                {recipientCount !== null && (
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-center">
                    <span className="text-blue-800 font-medium">
                      המייל יישלח ל-{recipientCount} נמענים בעותק מוסתר (BCC)
                    </span>
                  </div>
                )}

                <div className="mt-6 flex gap-4">
                  <button
                    onClick={() => setShowPreview(false)}
                    className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    סגור
                  </button>
                  <button
                    onClick={() => {
                      setShowPreview(false);
                      handleSendEmail();
                    }}
                    disabled={sending}
                    className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300"
                  >
                    {sending ? 'שולח...' : 'אישור ושליחה'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
