import { NextRequest, NextResponse } from 'next/server';
import { rlsSupabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // Test RLS policies by attempting to access course_acknowledgments
    const { data, error } = await rlsSupabase
      .from('course_acknowledgments')
      .select('*')
      .limit(1);

    if (error) {
      return NextResponse.json({
        success: false,
        error: error.message,
        code: error.code
      }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'RLS test successful',
      dataCount: data?.length || 0
    });

  } catch (error) {
    console.error('RLS test error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}