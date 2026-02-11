import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';

/**
 * GET /api/admin/error-stats
 * Retrieve error statistics for different time periods
 * Returns:
 * - stats24h: Error counts by type for last 24 hours
 * - stats7d: Error counts by type for last 7 days
 * - affectedUsers: Unique user counts per log type
 */
export async function GET(request: NextRequest) {
  try {
    // Verify user is authenticated
    const { user } = await getAuthenticatedUser(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use supabaseAdmin for role check and data access
    const { supabaseAdmin } = await import('@/lib/supabase');

    // Check if user is admin using admin client
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profile')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile || !['admin', 'org_admin'].includes(userProfile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Calculate date ranges
    const now = new Date();
    const date24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const date7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Fetch logs for both periods
    const [logs24h, logs7d] = await Promise.all([
      supabaseAdmin
        .from('system_logs')
        .select('log_type, created_at')
        .eq('log_level', 'critical')
        .gte('created_at', date24h.toISOString())
        .order('created_at', { ascending: false }),
      supabaseAdmin
        .from('system_logs')
        .select('log_type, created_at')
        .eq('log_level', 'critical')
        .gte('created_at', date7d.toISOString())
        .order('created_at', { ascending: false })
    ]);

    if (logs24h.error) {
      console.error('Database error fetching 24h stats:', logs24h.error);
      return NextResponse.json(
        { error: 'Failed to fetch 24h statistics' },
        { status: 500 }
      );
    }

    if (logs7d.error) {
      console.error('Database error fetching 7d stats:', logs7d.error);
      return NextResponse.json(
        { error: 'Failed to fetch 7d statistics' },
        { status: 500 }
      );
    }

    // Process 24h stats
    const stats24hMap = new Map<string, { count: number; most_recent: string }>();
    for (const log of logs24h.data || []) {
      const existing = stats24hMap.get(log.log_type);
      if (existing) {
        existing.count++;
        if (log.created_at > existing.most_recent) {
          existing.most_recent = log.created_at;
        }
      } else {
        stats24hMap.set(log.log_type, { count: 1, most_recent: log.created_at });
      }
    }

    // Process 7d stats
    const stats7dMap = new Map<string, { count: number; most_recent: string }>();
    for (const log of logs7d.data || []) {
      const existing = stats7dMap.get(log.log_type);
      if (existing) {
        existing.count++;
        if (log.created_at > existing.most_recent) {
          existing.most_recent = log.created_at;
        }
      } else {
        stats7dMap.set(log.log_type, { count: 1, most_recent: log.created_at });
      }
    }

    // Get unique log types
    const logTypes = new Set<string>();
    stats24hMap.forEach((_, type) => logTypes.add(type));
    stats7dMap.forEach((_, type) => logTypes.add(type));

    // Fetch affected user counts for each log type
    const affectedUsersPromises = Array.from(logTypes).map(async (logType) => {
      const { data, error } = await supabaseAdmin
        .from('system_logs')
        .select('user_id')
        .eq('log_type', logType)
        .not('user_id', 'is', null);

      if (error || !data) {
        return { log_type: logType, affected_users: 0 };
      }

      const uniqueUsers = new Set(data.map(log => log.user_id));
      return { log_type: logType, affected_users: uniqueUsers.size };
    });

    const affectedUsers = await Promise.all(affectedUsersPromises);

    // Convert maps to arrays
    const stats24h = Array.from(stats24hMap.entries()).map(([log_type, data]) => ({
      log_type,
      count: data.count,
      most_recent: data.most_recent
    }));

    const stats7d = Array.from(stats7dMap.entries()).map(([log_type, data]) => ({
      log_type,
      count: data.count,
      most_recent: data.most_recent
    }));

    return NextResponse.json({
      success: true,
      stats24h,
      stats7d,
      affectedUsers
    });
  } catch (error) {
    console.error('Error fetching error statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch error statistics' },
      { status: 500 }
    );
  }
}
