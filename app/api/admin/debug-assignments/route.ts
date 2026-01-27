import { NextResponse } from 'next/server';
import { rlsSupabase } from '@/lib/supabase';

export async function GET() {
  try {
    const { user } = await rlsSupabase.getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { isAdmin } = await rlsSupabase.isAdmin();
    
    // בדיקה נוספת אם המשתמש הוא מנהל ארגון
    let hasAdminAccess = isAdmin;
    if (!isAdmin) {
      try {
        const { data: profile, error } = await rlsSupabase.from('user_profile')
          .select('*')
          .eq('user_id', user.id)
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
    
    if (!hasAdminAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Try to get assignments with simple query
    const { data: assignments, error: assignmentsError } = await rlsSupabase.raw
      .from('assignments')
      .select('*')
      .limit(10);

    // Try to count assignments
    const { count, error: countError } = await rlsSupabase.raw
      .from('assignments')
      .select('*', { count: 'exact', head: true });

    return NextResponse.json({
      success: true,
      assignments: assignments || [],
      assignmentsError: assignmentsError?.message || null,
      assignmentsCount: count,
      countError: countError?.message || null,
      userInfo: {
        userId: user.id,
        email: user.email,
        isAdmin
      }
    });

  } catch (error) {
    console.error('Debug error:', error);
    return NextResponse.json({ 
      error: 'Debug failed', 
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}