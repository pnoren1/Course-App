import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase-server';
import { VideoDatabaseOptimizer } from '@/lib/services/videoDatabaseOptimizer';
import { videoCacheService } from '@/lib/services/videoCacheService';

// POST /api/admin/video-optimization - Run database optimization tasks
export async function POST(request: NextRequest) {
  try {
    const { supabase } = createServerSupabaseClient(request);
    
    // Check authentication and admin role
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
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const body = await request.json();
    const { operation, options = {} } = body;

    const optimizer = new VideoDatabaseOptimizer();
    let result: any = {};

    switch (operation) {
      case 'create_indexes':
        await optimizer.createOptimizedIndexes();
        result = { message: 'Database indexes created successfully' };
        break;

      case 'create_partitions':
        const months = options.months || 12;
        await optimizer.createEventPartitions(months);
        result = { message: `Event partitions created for ${months} months` };
        break;

      case 'archive_events':
        const eventDays = options.days || 90;
        const eventArchiveResult = await optimizer.archiveOldEvents(eventDays);
        result = {
          message: 'Events archived successfully',
          ...eventArchiveResult
        };
        break;

      case 'archive_sessions':
        const sessionDays = options.days || 30;
        const sessionArchiveResult = await optimizer.archiveOldSessions(sessionDays);
        result = {
          message: 'Sessions archived successfully',
          ...sessionArchiveResult
        };
        break;

      case 'update_statistics':
        await optimizer.updateTableStatistics();
        result = { message: 'Table statistics updated successfully' };
        break;

      case 'get_metrics':
        const metrics = await optimizer.getDatabaseMetrics();
        result = {
          message: 'Database metrics retrieved',
          metrics
        };
        break;

      case 'get_partitions':
        const partitions = await optimizer.getPartitionInfo();
        result = {
          message: 'Partition information retrieved',
          partitions
        };
        break;

      case 'cleanup_archives':
        const monthsToKeep = options.months || 12;
        await optimizer.cleanupOldArchives(monthsToKeep);
        result = { message: `Archive cleanup completed, keeping ${monthsToKeep} months` };
        break;

      default:
        return NextResponse.json({ 
          error: 'Invalid operation. Supported operations: create_indexes, create_partitions, archive_events, archive_sessions, update_statistics, get_metrics, get_partitions, cleanup_archives' 
        }, { status: 400 });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error('Database optimization error:', error);
    return NextResponse.json({ 
      error: 'Database optimization failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET /api/admin/video-optimization - Get cache statistics and system info
export async function GET(request: NextRequest) {
  try {
    const { supabase } = createServerSupabaseClient(request);
    
    // Check authentication and admin role
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
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 });
    }

    const optimizer = new VideoDatabaseOptimizer();
    
    // Get cache statistics
    const cacheStats = videoCacheService.getStats();
    
    // Get database metrics
    const dbMetrics = await optimizer.getDatabaseMetrics();
    
    // Get partition info
    const partitions = await optimizer.getPartitionInfo();

    return NextResponse.json({
      cache_statistics: cacheStats,
      database_metrics: dbMetrics,
      partition_info: partitions,
      timestamp: new Date().toISOString()
    }, { status: 200 });
  } catch (error) {
    console.error('Error getting optimization info:', error);
    return NextResponse.json({ 
      error: 'Failed to get optimization information',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}