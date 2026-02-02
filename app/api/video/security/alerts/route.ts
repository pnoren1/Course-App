import { NextRequest, NextResponse } from 'next/server';
import { VideoSecurityAlertService } from '@/lib/services/videoSecurityAlertService';
import { VideoSecurityService } from '@/lib/services/videoSecurityService';
import { createServerSupabaseClient } from '@/lib/supabase-server';

export async function GET(request: NextRequest) {
  try {
    const { supabase } = createServerSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or org_admin
    const { data: profile } = await supabase
      .from('user_profile')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['admin', 'org_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const alertService = new VideoSecurityAlertService();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    switch (action) {
      case 'summary':
        const summary = await alertService.getAlertsSummary();
        return NextResponse.json({ summary });

      case 'for-review':
        const limit = parseInt(searchParams.get('limit') || '50');
        const alerts = await alertService.getAlertsForReview(limit);
        return NextResponse.json({ alerts });

      case 'user-alerts':
        const userId = searchParams.get('userId');
        if (!userId) {
          return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }
        const userAlerts = await alertService.getUserActiveAlerts(userId);
        return NextResponse.json({ alerts: userAlerts });

      case 'security-report':
        const fromDate = searchParams.get('from');
        const toDate = searchParams.get('to');
        
        if (!fromDate || !toDate) {
          return NextResponse.json({ error: 'Date range required' }, { status: 400 });
        }

        const report = await alertService.generateSecurityReport({
          from: new Date(fromDate),
          to: new Date(toDate)
        });
        return NextResponse.json({ report });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Security alerts API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { supabase } = createServerSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or org_admin
    const { data: profile } = await supabase
      .from('user_profile')
      .select('role, user_name')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['admin', 'org_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { alertId, status, notes } = await request.json();

    if (!alertId || !status) {
      return NextResponse.json({ error: 'Alert ID and status required' }, { status: 400 });
    }

    const alertService = new VideoSecurityAlertService();
    await alertService.updateAlertStatus(alertId, status, profile.user_name || user.email, notes);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update alert status error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase } = createServerSupabaseClient(request);
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin or org_admin
    const { data: profile } = await supabase
      .from('user_profile')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (!profile || !['admin', 'org_admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { action } = await request.json();

    if (action === 'maintenance') {
      const securityService = new VideoSecurityService();
      const result = await securityService.performScheduledMaintenance();
      return NextResponse.json({ result });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Security maintenance error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}