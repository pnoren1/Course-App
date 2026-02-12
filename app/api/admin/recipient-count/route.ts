import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/utils/admin-auth';

export async function POST(request: NextRequest) {
  try {
    console.log('[recipient-count] Starting request');
    const { supabase } = await requireAdminAuth(request);
    console.log('[recipient-count] Auth successful');

    const body = await request.json();
    const { recipientType, organizationId, groupId, userId } = body;
    console.log('[recipient-count] Request params:', { recipientType, organizationId, groupId, userId });

    let count = 0;

    if (recipientType === 'all') {
      const { count: totalCount, error } = await supabase
        .from('user_profile')
        .select('*', { count: 'exact', head: true })
        .not('email', 'is', null);
      
      if (error) throw error;
      count = totalCount || 0;
    } else if (recipientType === 'organization' && organizationId) {
      const { count: totalCount, error } = await supabase
        .from('user_profile')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', organizationId)
        .not('email', 'is', null);
      
      if (error) throw error;
      count = totalCount || 0;
    } else if (recipientType === 'group' && groupId) {
      const { count: totalCount, error } = await supabase
        .from('user_profile')
        .select('*', { count: 'exact', head: true })
        .eq('group_id', groupId)
        .not('email', 'is', null);
      
      if (error) throw error;
      count = totalCount || 0;
    } else if (recipientType === 'user' && userId) {
      count = 1;
    }

    console.log('[recipient-count] Returning count:', count);
    return NextResponse.json({ count });
  } catch (error) {
    console.error('[recipient-count] Error counting recipients:', error);
    
    // If error is already a NextResponse (from requireAdminAuth), return it
    if (error instanceof NextResponse) {
      return error;
    }
    
    return NextResponse.json(
      { error: 'שגיאה בספירת נמענים' },
      { status: 500 }
    );
  }
}
