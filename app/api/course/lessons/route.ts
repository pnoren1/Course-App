import { NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';

// Helper function to parse duration string to seconds
function parseDuration(duration: string): number {
  if (!duration) return 0;
  const parts = duration.split(':');
  if (parts.length === 2) {
    const minutes = parseInt(parts[0], 10) || 0;
    const seconds = parseInt(parts[1], 10) || 0;
    return minutes * 60 + seconds;
  }
  return 0;
}

export async function GET(request: Request) {
  try {
    const { supabase, token } = createServerSupabaseClient(request as any);
    
    // Get lessons from database
    const { data: lessons, error } = await supabase
      .from('lessons')
      .select('*')
      .order('order_index');
    
    if (error) {
      console.error('Error loading lessons from database:', error);
      return NextResponse.json({ error: 'Failed to load lessons' }, { status: 500 });
    }
    
    return NextResponse.json(lessons || []);
  } catch (error) {
    console.error('Error loading lessons:', error);
    return NextResponse.json({ error: 'Failed to load lessons' }, { status: 500 });
  }
}