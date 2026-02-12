import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/utils/admin-auth';

export async function GET(request: NextRequest) {
  try {
    console.log('[organizations] Starting request');
    const { supabase } = await requireAdminAuth(request);
    console.log('[organizations] Auth successful');

    const { data, error } = await supabase
      .from('organizations')
      .select('id, name')
      .order('name');

    if (error) {
      console.error('[organizations] Error fetching organizations:', error);
      return NextResponse.json(
        { error: 'שגיאה בטעינת ארגונים' },
        { status: 500 }
      );
    }

    console.log('[organizations] Found organizations:', data?.length || 0);
    return NextResponse.json(data || []);
  } catch (error) {
    console.error('[organizations] Error in organizations API:', error);
    
    // If error is already a NextResponse (from requireAdminAuth), return it
    if (error instanceof NextResponse) {
      return error;
    }
    
    return NextResponse.json(
      { error: 'שגיאה בטעינת ארגונים' },
      { status: 500 }
    );
  }
}
