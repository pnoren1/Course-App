import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Create Supabase client with the provided token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Get user from token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ 
        error: 'Invalid token', 
        authError: authError?.message 
      }, { status: 401 });
    }

    // Get user profile
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profile')
      .select('*')
      .eq('user_id', user.id);

    // Get all user profiles (for debugging)
    const { data: allProfiles, error: allProfilesError } = await supabase
      .from('user_profile')
      .select('user_id, email, role')
      .limit(10);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        created_at: user.created_at
      },
      userProfile,
      profileError: profileError?.message,
      allProfiles,
      allProfilesError: allProfilesError?.message,
      debug: {
        userIdType: typeof user.id,
        userIdLength: user.id?.length
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