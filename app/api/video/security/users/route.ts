import { NextRequest, NextResponse } from 'next/server';
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

    const securityService = new VideoSecurityService();
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const targetUserId = searchParams.get('userId');

    switch (action) {
      case 'risk-profile':
        if (!targetUserId) {
          return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        const riskProfile = await securityService.getUserFraudRiskProfile(targetUserId);
        return NextResponse.json({ riskProfile });

      case 'reliability-score':
        if (!targetUserId) {
          return NextResponse.json({ error: 'User ID required' }, { status: 400 });
        }

        const reliabilityScore = await securityService.calculateUserReliabilityScore(targetUserId);
        return NextResponse.json({ reliabilityScore });

      case 'concurrent-sessions':
        const videoLessonId = searchParams.get('videoLessonId');
        if (!targetUserId || !videoLessonId) {
          return NextResponse.json({ error: 'User ID and video lesson ID required' }, { status: 400 });
        }

        const concurrentCheck = await securityService.checkConcurrentSessions(targetUserId, videoLessonId);
        return NextResponse.json({ concurrentCheck });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Security users API error:', error);
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

    const { action, userId, videoLessonId, events } = await request.json();
    const securityService = new VideoSecurityService();

    switch (action) {
      case 'analyze-events':
        if (!userId || !videoLessonId || !events) {
          return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        const fraudCheck = await securityService.performComprehensiveFraudCheck(userId, videoLessonId, events);
        return NextResponse.json({ fraudCheck });

      case 'monitor-realtime':
        if (!userId || !videoLessonId || !events) {
          return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        const realtimeCheck = await securityService.monitorRealTimeFraudPatterns(userId, videoLessonId, events);
        return NextResponse.json({ realtimeCheck });

      case 'terminate-sessions':
        if (!userId || !videoLessonId) {
          return NextResponse.json({ error: 'User ID and video lesson ID required' }, { status: 400 });
        }

        const terminatedCount = await securityService.terminateOldSessions(userId, videoLessonId);
        return NextResponse.json({ terminatedCount });

      case 'flag-user':
        const { reason, evidence } = await request.json();
        if (!userId || !videoLessonId || !reason) {
          return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        await securityService.flagSuspiciousUser(userId, videoLessonId, reason, evidence);
        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Security users action error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}