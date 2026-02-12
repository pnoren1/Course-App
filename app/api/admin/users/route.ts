import { NextRequest, NextResponse } from 'next/server';
import { requireAdminAuth } from '@/lib/utils/admin-auth';

export async function GET(request: NextRequest) {
  try {
    const { supabase } = await requireAdminAuth(request);

    const { data, error } = await supabase
      .from('user_profile')
      .select('user_id, email, full_name')
      .not('email', 'is', null)
      .order('full_name');

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json(
        { error: 'שגיאה בטעינת משתמשים' },
        { status: 500 }
      );
    }

    return NextResponse.json(data || []);
  } catch (error) {
    console.error('Error in users API:', error);
    return NextResponse.json(
      { error: 'שגיאה בטעינת משתמשים' },
      { status: 500 }
    );
  }
}
