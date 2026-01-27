"use client";

import { useState, useEffect } from 'react';
import { Group } from '@/lib/types/database.types';
import { supabase } from '@/lib/supabase';

interface GroupSelectorProps {
  organizationId: string;
  value?: string;
  onChange: (groupId: string) => void;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  placeholder?: string;
}

interface GroupsResponse {
  success: boolean;
  organization: {
    id: string;
    name: string;
  };
  groups: Group[];
}

// מטמון פשוט לקבוצות
const groupsCache = new Map<string, { groups: Group[]; timestamp: number }>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 דקות

// פונקציה לניקוי המטמון
export const clearGroupsCache = (organizationId?: string) => {
  if (organizationId) {
    groupsCache.delete(organizationId);
  } else {
    groupsCache.clear();
  }
};

export default function GroupSelector({
  organizationId,
  value,
  onChange,
  required = false,
  disabled = false,
  className = '',
  placeholder = 'בחר קבוצה...'
}: GroupSelectorProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loadedOrgId, setLoadedOrgId] = useState<string | null>(null);

  // Load groups when organization changes
  useEffect(() => {
    if (!organizationId) {
      setGroups([]);
      setError(null);
      setLoadedOrgId(null);
      return;
    }

    // אם כבר טענו קבוצות לארגון הזה, לא צריך לטעון שוב
    if (loadedOrgId === organizationId) {
      return;
    }

    const fetchGroups = async () => {
      try {
        setLoading(true);
        setError(null);

        // בדיקת מטמון
        const cached = groupsCache.get(organizationId);
        if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
          setGroups(cached.groups);
          setLoadedOrgId(organizationId);
          
          // בדיקה אם הערך הנוכחי תקף
          if (value && !cached.groups.some(group => group.id === value)) {
            onChange('');
          }
          return;
        }

        // קבלת הטוקן מ-Supabase client
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;
        
        const headers: HeadersInit = {
          'Content-Type': 'application/json'
        };
        
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        const url = `/api/admin/groups/by-organization/${organizationId}`;
        const response = await fetch(url, { headers });
        
        if (!response.ok) {
          const errorData = await response.json();
          
          if (response.status === 401 || response.status === 403) {
            // אין הרשאות - לא מציגים שגיאה, פשוט לא טוענים קבוצות
            setGroups([]);
            setError(null);
            setLoadedOrgId(organizationId);
            return;
          }
          
          console.error('GroupSelector: API error:', errorData);
          throw new Error(errorData.error || 'שגיאה בטעינת קבוצות');
        }

        const data: GroupsResponse = await response.json();
        const groups = data.groups || [];
        
        // שמירה במטמון
        groupsCache.set(organizationId, {
          groups,
          timestamp: Date.now()
        });
        
        setGroups(groups);
        setLoadedOrgId(organizationId);

        // If current value is not in the new groups list, clear it
        if (value && !groups.some(group => group.id === value)) {
          onChange('');
        }

      } catch (error) {
        console.error('GroupSelector: Error fetching groups:', error);
        // רק מציגים שגיאה אם זה לא קשור להרשאות
        if (error instanceof Error && !error.message.includes('הרשאה')) {
          setError(error.message);
        }
        setGroups([]);
        setLoadedOrgId(null);
      } finally {
        setLoading(false);
      }
    };

    fetchGroups();
  }, [organizationId, loadedOrgId]);

  // בדיקה אם הערך הנוכחי עדיין תקף
  useEffect(() => {
    if (value && groups.length > 0 && !groups.some(group => group.id === value)) {
      onChange('');
    }
  }, [value, groups, onChange]);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange(e.target.value);
  };

  return (
    <div className="relative">
      <select
        value={value || ''}
        onChange={handleChange}
        disabled={disabled || loading || !organizationId}
        required={required}
        className={`w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm bg-white disabled:bg-slate-50 disabled:text-slate-500 ${className}`}
      >
        <option value="">
          {loading ? 'טוען קבוצות...' : !organizationId ? 'בחר ארגון תחילה' : groups.length === 0 ? 'אין קבוצות זמינות' : placeholder}
        </option>
        {groups.map(group => (
          <option key={group.id} value={group.id}>
            {group.name}
          </option>
        ))}
      </select>

      {/* Removed error display for better UX */}

      {loading && (
        <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
          <svg className="animate-spin w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        </div>
      )}
    </div>
  );
}