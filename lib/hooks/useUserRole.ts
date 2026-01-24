import { useEffect, useState } from 'react';
import { rlsSupabase } from '@/lib/supabase';
import { RoleType } from '@/lib/types/database.types';

interface UserRoleData {
  role: RoleType | null;
  userName: string | null;
  userEmail: string | null;
  organizationName: string | null;
  organizationId: string | null;
  userId: string | null; // הוספת user ID
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
    userId: null,
    isLoading: true,
    error: null
  });
  const [hasSignedOut, setHasSignedOut] = useState(false); // flag למניעת לופ

  useEffect(() => {
    let isMounted = true; // למנוע race conditions
    
    const fetchUserRole = async () => {
      // אם כבר התנתקנו, לא נבצע שוב את הפעולה
      if (hasSignedOut) {
        return;
      }
      
      try {
        setRoleData(prev => ({ ...prev, isLoading: true, error: null }));

        // בדיקה אם המשתמש מחובר
        const { user, error: userError } = await rlsSupabase.getCurrentUser();
        
        if (!isMounted) return; // אם הקומפוננט לא mounted, לא נעדכן state
        
        if (userError || !user) {
          setRoleData({
            role: null,
            userName: null,
            userEmail: null,
            organizationName: null,
            organizationId: null,
            userId: null,
            isLoading: false,
            error: (userError as any)?.message || 'משתמש לא מחובר'
          });
          return;
        }

        // נסה לשלוף ישירות מהטבלה
        const userProfileResult = await rlsSupabase.from('user_profile').select('*').eq('user_id', user.id);

        if (userProfileResult.error) {
          console.error('Error fetching user profile:', userProfileResult.error);
          
          // בדיקה אם השגיאה מעידה על כך שהמשתמש לא קיים במסד הנתונים
          const errorMessage = userProfileResult.error?.message || '';
          if (errorMessage.includes('JWT') || errorMessage.includes('sub claim') || errorMessage.includes('does not exist')) {
            console.error('User from sub claim in JWT does not exist - המשתמש נמחק מהמסד נתונים');
            console.log('Signing out user and redirecting to login page');
            
            // סימון שהתנתקנו כדי למנוע לופ
            setHasSignedOut(true);
            
            // המשתמש נמחק מהמסד נתונים אבל ה-JWT עדיין תקף
            // נתנתק אותו ונפנה אותו לדף הלוגין
            try {
              await rlsSupabase.auth.signOut();
              // ניקוי נוסף של session מקומי
              if (typeof window !== 'undefined') {
                localStorage.removeItem('supabase.auth.token');
                sessionStorage.clear();
              }
            } catch (signOutError) {
              console.error('Error signing out:', signOutError);
            }
            
            setRoleData({
              role: null,
              userName: null,
              userEmail: null,
              organizationName: null,
              organizationId: null,
              userId: null,
              isLoading: false,
              error: 'User from sub claim in JWT does not exist'
            });
            
            // לא נעשה redirect כאן - נתן ל-AuthGuard לטפל בזה
            return;
          }
          
          return;
        }

        // אם יש פרופיל, נשתמש בו
        const userProfile = (userProfileResult.data as unknown) as Array<{
          user_id: string;
          user_name: string | null;
          email: string | null;
          role: string;
          organization_id: string | null;
        }>;
        
        const profile = userProfile && userProfile.length > 0 ? userProfile[0] : null;
        
        // if (!profile) {
        //   // אין פרופיל, ניצור אחד
        //   const { error: insertError } = await rlsSupabase.insert('user_profile', {
        //     user_id: user.id,
        //     role: 'student',
        //     user_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
        //     email: user.email
        //   });

        //   setRoleData({
        //     role: 'student',
        //     userName: user.user_metadata?.full_name || user.user_metadata?.name || user.email || null,
        //     userEmail: user.email || null,
        //     organizationName: null,
        //     organizationId: null,
        //     isLoading: false,
        //     error: insertError ? 'שגיאה ביצירת פרופיל' : null
        //   });
        //   return;
        // }

        // יש פרופיל, נשלוף גם את הארגון אם יש
        let organizationName = null;
        if (profile && profile.organization_id) {
          const orgResult = await rlsSupabase.from('organizations').select('name').eq('id', profile.organization_id);
          const org = (orgResult.data as unknown) as Array<{ name: string }>;
          organizationName = org && org.length > 0 ? org[0].name : null;
        }

        if (!isMounted) return; // בדיקה נוספת לפני עדכון state

        setRoleData({
          role: profile?.role as RoleType || null,
          userName: profile?.user_name || user.user_metadata?.full_name || user.email || null,
          userEmail: profile?.email || user.email || null,
          organizationName,
          organizationId: profile?.organization_id || null,
          userId: user.id,
          isLoading: false,
          error: null
        });

      } catch (error) {
        console.error('Error in useUserRole:', error);
        if (!isMounted) return;
        
        setRoleData({
          role: null,
          userName: null,
          userEmail: null,
          organizationName: null,
          organizationId: null,
          userId: null,
          isLoading: false,
          error: 'שגיאה לא צפויה'
        });
      }
    };

    fetchUserRole();
    
    return () => {
      isMounted = false; // cleanup
    };
  }, []);

  return roleData;
}

// פונקציה עזר לקבלת תווית התפקיד בעברית
export function getRoleLabel(role: RoleType | null): string {
  switch (role) {
    case 'admin':
      return 'מנהל';
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