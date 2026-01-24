import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: NextRequest) {
  try {
    // יצירת Supabase client עם הטוקן מה-request
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    // קבלת הטוקן מה-Authorization header או מ-cookies
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '') || 
                  request.cookies.get('sb-access-token')?.value ||
                  request.cookies.get('supabase-auth-token')?.value;

    if (token) {
      await supabase.auth.setSession({
        access_token: token,
        refresh_token: ''
      });
    }

    // בדיקה אם המשתמש מחובר
    const { data: { user: currentUser }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !currentUser) {
      // Convert RequestCookies to plain object
      const cookiesObj: Record<string, string> = {};
      request.cookies.getAll().forEach(cookie => {
        cookiesObj[cookie.name] = cookie.value;
      });

      return NextResponse.json({
        error: 'משתמש לא מחובר',
        details: { 
          userError: userError?.message,
          hasToken: !!token,
          cookies: cookiesObj
        }
      });
    }

    // בדיקת פרופיל המשתמש ישירות
    const profileResult = await supabase.from('user_profile')
      .select('*')
      .eq('user_id', currentUser.id)
      .single();

    // בדיקת פונקציית has_role ישירות
    const hasRoleResult = await supabase.rpc('has_role', { role_name: 'admin' });
    
    // בדיקת פונקציית is_admin ישירות
    const isAdminResult = await supabase.rpc('is_admin');

    // בדיקת get_user_roles
    const getUserRolesResult = await supabase.rpc('get_user_roles');

    return NextResponse.json({
      user: {
        id: currentUser.id,
        email: currentUser.email
      },
      profile: {
        data: profileResult.data,
        error: profileResult.error?.message
      },
      functions: {
        has_role_admin: {
          data: hasRoleResult.data,
          error: hasRoleResult.error?.message
        },
        is_admin: {
          data: isAdminResult.data,
          error: isAdminResult.error?.message
        },
        get_user_roles: {
          data: getUserRolesResult.data,
          error: getUserRolesResult.error?.message
        }
      }
    });

  } catch (error) {
    console.error('Error in test-functions API:', error);
    return NextResponse.json({
      error: 'שגיאה פנימית בשרת',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}