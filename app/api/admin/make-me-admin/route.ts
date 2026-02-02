import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  console.log('=== Make Me Admin API Called ===');
  
  try {
    console.log('Checking authentication...');
    const { user, error: authError } = await getAuthenticatedUser(request);
    console.log('Current user:', user ? { id: user.id, email: user.email } : 'No user');
    
    if (authError || !user) {
      return NextResponse.json(
        { 
          success: false,
          error: 'נדרש להתחבר למערכת' 
        },
        { status: 401 }
      );
    }

    // Use admin client to add user as admin
    const supabaseAdmin = getSupabaseAdmin();
    
    console.log('Adding user as admin...');
    const { data: insertResult, error: insertError } = await supabaseAdmin
      .from('user_profile')
      .upsert({
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin User',
        user_email: user.email,
        email: user.email,
        role: 'admin',
        organization_id: null,
        granted_by: user.id,
        granted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      })
      .select();

    if (insertError) {
      console.error('Error adding admin:', insertError);
      return NextResponse.json(
        { 
          success: false,
          error: 'שגיאה בהוספת הרשאות מנהל',
          details: insertError.message 
        },
        { status: 500 }
      );
    }

    console.log('Admin added successfully:', insertResult);

    return NextResponse.json({
      success: true,
      message: `המשתמש ${user.email} נוסף בהצלחה כמנהל מערכת`,
      userId: user.id,
      userEmail: user.email,
      profile: insertResult?.[0] || null
    });

  } catch (error) {
    console.error('Error in make-me-admin API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'שגיאה פנימית בשרת',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}