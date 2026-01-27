import { useEffect, useState } from 'react';
import { rlsSupabase, supabase } from '@/lib/supabase';
import { RoleType } from '@/lib/types/database.types';

interface UserRoleData {
  role: RoleType | null;
  userName: string | null;
  userEmail: string | null;
  organizationName: string | null;
  organizationId: string | null;
  groupName: string | null;
  groupId: string | null;
  userId: string | null;
  isLoading: boolean;
  error: string | null;
}

export function useUserRole(): UserRoleData {
  const [roleData, setRoleData] = useState<UserRoleData>({
    role: null,
    userName: null,
    userEmail: null,
    organizationName: null,
    organizationId: null,
    groupName: null,
    groupId: null,
    userId: null,
    isLoading: true,
    error: null
  });

  const [hasAttempted, setHasAttempted] = useState(false); // למניעת קריאות חוזרות

  useEffect(() => {
    let isMounted = true;
    
    // אם כבר ניסינו פעם, לא ננסה שוב
    if (hasAttempted) {
      return;
    }
    
    const fetchUserRole = async () => {
      try {
        setRoleData(prev => ({ ...prev, isLoading: true, error: null }));
        setHasAttempted(true);

        console.log('🔍 useUserRole: Starting fetch');

        // בדיקה אם המשתמש מחובר
        const { user, error: userError } = await rlsSupabase.getCurrentUser();
        
        if (!isMounted) return;
        
        if (userError || !user) {
          console.log('❌ useUserRole: No user found');
          setRoleData({
            role: null,
            userName: null,
            userEmail: null,
            organizationName: null,
            organizationId: null,
            groupName: null,
            groupId: null,
            userId: null,
            isLoading: false,
            error: (userError as any)?.message || 'משתמש לא מחובר'
          });
          return;
        }

        console.log('✅ useUserRole: User found:', user.id);

        // קבלת הטוקן לשליחה לשרת
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
          console.log('❌ useUserRole: No token found');
          setRoleData({
            role: null,
            userName: null,
            userEmail: null,
            organizationName: null,
            organizationId: null,
            groupName: null,
            groupId: null,
            userId: null,
            isLoading: false,
            error: 'לא נמצא טוקן אימות'
          });
          return;
        }

        console.log('🔑 useUserRole: Token found');

        // קריאה ל-API לקבלת פרופיל המשתמש
        console.log('🔍 useUserRole: Calling profile API');
        const response = await fetch('/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        console.log('📡 useUserRole: API response status:', response.status);

        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ useUserRole: API error:', errorText);
          throw new Error('שגיאה בקבלת פרופיל משתמש');
        }

        const data = await response.json();
        console.log('📦 useUserRole: API data:', data);
        
        if (!data.success) {
          throw new Error(data.error || 'שגיאה בקבלת פרופיל משתמש');
        }

        const profile = data.profile;

        if (!isMounted) return;

        console.log('🎉 useUserRole: Setting role data');
        setRoleData({
          role: profile.role as RoleType || null,
          userName: profile.user_name || null,
          userEmail: profile.email || null,
          organizationName: profile.organization_name || null,
          organizationId: profile.organization_id || null,
          groupName: profile.group_name || null,
          groupId: profile.group_id || null,
          userId: profile.user_id || null,
          isLoading: false,
          error: null
        });

      } catch (error) {
        console.error('💥 useUserRole: Error:', error);
        if (!isMounted) return;
        
        setRoleData({
          role: null,
          userName: null,
          userEmail: null,
          organizationName: null,
          organizationId: null,
          groupName: null,
          groupId: null,
          userId: null,
          isLoading: false,
          error: error instanceof Error ? error.message : 'שגיאה לא צפויה'
        });
      }
    };

    fetchUserRole();
    
    return () => {
      isMounted = false;
    };
  }, []); // רק פעם אחת בטעינה

  return roleData;
}

// פונקציה עזר לקבלת תווית התפקיד בעברית
export function getRoleLabel(role: RoleType | null): string {
  switch (role) {
    case 'admin':
      return 'מנהל';
    case 'org_admin':
      return 'מנהל ארגון';
    case 'instructor':
      return 'מרצה';
    case 'moderator':
      return 'מנחה';
    case 'student':
      return 'סטודנט';
    default:
      return 'אורח';
  }
}

// פונקציה עזר לקבלת צבע התפקיד
export function getRoleColor(role: RoleType | null): string {
  switch (role) {
    case 'admin':
      return 'bg-red-50 text-red-700 border-red-200';
    case 'org_admin':
      return 'bg-orange-50 text-orange-700 border-orange-200';
    case 'instructor':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'moderator':
      return 'bg-purple-50 text-purple-700 border-purple-200';
    case 'student':
      return 'bg-green-50 text-green-700 border-green-200';
    default:
      return 'bg-gray-50 text-gray-700 border-gray-200';
  }
}

// פונקציה עזר לקבלת אייקון התפקיד
export function getRoleIcon(role: RoleType | null): string {
  switch (role) {
    case 'admin':
      return 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z';
    case 'org_admin':
      return 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4';
    case 'instructor':
      return 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z';
    case 'moderator':
      return 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z';
    case 'student':
      return 'M12 14l9-5-9-5-9 5 9 5z M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z';
    default:
      return 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z';
  }
}