import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  console.log('=== Fix My Profile API Called ===');
  
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return NextResponse.json(
        { 
          success: false,
          error: 'נדרש להתחבר למערכת' 
        },
        { status: 401 }
      );
    }

    console.log('User to fix:', { id: user.id, email: user.email });

    // Use admin client to add/update user profile
    const supabaseAdmin = getSupabaseAdmin();
    
    // First, delete any existing profile to avoid conflicts
    console.log('Deleting existing profile...');
    await supabaseAdmin
      .from('user_profile')
      .delete()
      .eq('user_id', user.id);
    
    // Now insert new profile
    console.log('Inserting new admin profile...');
    const { data: insertResult, error: insertError } = await supabaseAdmin
      .from('user_profile')
      .insert({
        user_id: user.id,
        user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Admin User',
        user_email: user.email,
        email: user.email,
        role: 'admin',
        organization_id: null,
        granted_by: user.id,
        granted_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error inserting profile:', insertError);
      return NextResponse.json(
        { 
          success: false,
          error: 'שגיאה בהוספת פרופיל',
          details: insertError.message 
        },
        { status: 500 }
      );
    }

    console.log('Profile created successfully:', insertResult);

    // Verify the profile was created
    const { data: verifyProfile, error: verifyError } = await supabaseAdmin
      .from('user_profile')
      .select('*')
      .eq('user_id', user.id)
      .single();

    console.log('Verification result:', { verifyProfile, verifyError });

    return NextResponse.json({
      success: true,
      message: `פרופיל המשתמש ${user.email} נוצר בהצלחה עם תפקיד admin`,
      userId: user.id,
      userEmail: user.email,
      profile: insertResult,
      verification: verifyProfile
    });

  } catch (error) {
    console.error('Error in fix-my-profile API:', error);
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