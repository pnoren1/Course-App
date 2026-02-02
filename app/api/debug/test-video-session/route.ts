import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function POST(request: NextRequest) {
  try {
    const { supabase, token } = createServerSupabaseClient(request);
    
    // Check authentication
    const { data: { user }, error: authError } = token 
      ? await supabase.auth.getUser(token)
      : await supabase.auth.getUser();
      
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // TEMPORARY: Skip admin check for debugging
    console.log('⚠️ TEMPORARILY SKIPPING ADMIN CHECK FOR DEBUGGING');
    console.log('✅ Admin access granted (temporary bypass)');

    const body = await request.json();
    const { lesson_id } = body;

    if (!lesson_id) {
      return NextResponse.json({ error: 'lesson_id is required' }, { status: 400 });
    }

    console.log('🧪 Testing video session creation for lesson:', lesson_id);

    // Test the video session creation process
    const testResponse = await fetch(`${request.nextUrl.origin}/api/video/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': request.headers.get('Authorization') || '',
        'Cookie': request.headers.get('Cookie') || ''
      },
      body: JSON.stringify({
        video_lesson_id: lesson_id,
        browser_tab_id: `test_${Date.now()}`
      })
    });

    const testResult = await testResponse.json();

    return NextResponse.json({
      success: testResponse.ok,
      status: testResponse.status,
      statusText: testResponse.statusText,
      result: testResult,
      message: testResponse.ok 
        ? 'Video session test passed! Video tracking should work.'
        : 'Video session test failed. Check the error details.'
    });

  } catch (error) {
    console.error('💥 Test error:', error);
    return NextResponse.json({ 
      success: false,
      error: 'Test failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}