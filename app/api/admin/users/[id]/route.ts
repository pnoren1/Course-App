import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { supabaseAdmin } from '@/lib/supabase';

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: userId } = await params;
    
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'אין הרשאה לגשת למשאב זה' },
        { status: 401 }
      );
    }

    if (!supabaseAdmin) {
      console.error('API: supabaseAdmin not available');
      return NextResponse.json(
        { error: 'שגיאה בהגדרות השרת' },
        { status: 500 }
      );
    }

    // Get user profile to check role
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profile')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile || userProfile.role !== 'admin') {
      return NextResponse.json(
        { error: 'אין הרשאה לבצע פעולה זו' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { groupId, organizationId } = body;

    // ולידציה בסיסית
    if (!userId) {
      return NextResponse.json(
        { error: 'נדרש מזהה משתמש' },
        { status: 400 }
      );
    }

    // בדיקה שהמשתמש קיים
    const userResult = await supabaseAdmin
      .from('user_profile')
      .select('user_id, organization_id, group_id')
      .eq('user_id', userId)
      .single();

    if (userResult.error || !userResult.data) {
      return NextResponse.json(
        { error: 'משתמש לא נמצא' },
        { status: 404 }
      );
    }

    const currentUser = userResult.data;

    // אם מעדכנים קבוצה, נוודא שהיא שייכת לארגון הנכון
    if (groupId && organizationId) {
      const groupResult = await supabaseAdmin
        .from('groups')
        .select('id, organization_id')
        .eq('id', groupId)
        .eq('organization_id', organizationId)
        .single();

      if (groupResult.error || !groupResult.data) {
        return NextResponse.json(
          { error: 'הקבוצה לא שייכת לארגון הנבחר' },
          { status: 400 }
        );
      }
    }

    // אם מעדכנים רק קבוצה (באותו ארגון)
    if (groupId && !organizationId && currentUser.organization_id) {
      const groupResult = await supabaseAdmin
        .from('groups')
        .select('id, organization_id')
        .eq('id', groupId)
        .eq('organization_id', currentUser.organization_id)
        .single();

      if (groupResult.error || !groupResult.data) {
        return NextResponse.json(
          { error: 'הקבוצה לא שייכת לארגון הנוכחי של המשתמש' },
          { status: 400 }
        );
      }
    }

    // עדכון המשתמש
    const updateData: any = {};
    
    if (organizationId !== undefined) {
      updateData.organization_id = organizationId || null;
    }
    
    if (groupId !== undefined) {
      updateData.group_id = groupId || null;
    }

    // אם מעבירים לארגון אחר, נוודא שיש קבוצה חדשה
    if (organizationId && organizationId !== currentUser.organization_id && !groupId) {
      return NextResponse.json(
        { error: 'העברת משתמש לארגון אחר מחייבת בחירת קבוצה חדשה' },
        { status: 400 }
      );
    }

    const { error: updateError } = await supabaseAdmin
      .from('user_profile')
      .update(updateData)
      .eq('user_id', userId);

    if (updateError) {
      console.error('Error updating user:', updateError);
      return NextResponse.json(
        { error: 'שגיאה בעדכון המשתמש' },
        { status: 500 }
      );
    }

    // שליפת המידע המעודכן של המשתמש כולל שמות הארגון והקבוצה
    const { data: updatedUser, error: fetchError } = await supabaseAdmin
      .from('user_profile')
      .select(`
        user_id,
        user_name,
        email,
        role,
        organization_id,
        group_id,
        organizations!inner(name),
        groups(name)
      `)
      .eq('user_id', userId)
      .single();

    if (fetchError) {
      console.error('Error fetching updated user:', fetchError);
      // אם יש שגיאה בשליפה, עדיין נחזיר הצלחה כי העדכון עבר
      return NextResponse.json({
        success: true,
        message: 'המשתמש עודכן בהצלחה'
      });
    }

    return NextResponse.json({
      success: true,
      message: 'המשתמש עודכן בהצלחה',
      user: {
        id: updatedUser.user_id,
        user_name: updatedUser.user_name,
        email: updatedUser.email,
        role: updatedUser.role,
        organization_id: updatedUser.organization_id,
        organization_name: updatedUser.organizations?.name,
        group_id: updatedUser.group_id,
        group_name: updatedUser.groups?.name
      }
    });

  } catch (error) {
    console.error('Error in user update API:', error);
    return NextResponse.json(
      { error: 'שגיאה פנימית בשרת' },
      { status: 500 }
    );
  }
}