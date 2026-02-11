import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { LogLevel } from '@/lib/types/logging';

/**
 * GET /api/admin/error-logs
 * Retrieve error logs with optional filtering
 * Query parameters:
 * - log_level: Filter by log level (critical, error, warning, info)
 * - log_type: Filter by log type (e.g., SUPABASE_INIT_ERROR, API_ERROR)
 * - start_date: Filter logs after this date (ISO string)
 * - end_date: Filter logs before this date (ISO string)
 * - limit: Maximum number of logs to return (default: 100)
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

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const logLevel = searchParams.get('log_level') as LogLevel | null;
    const logType = searchParams.get('log_type');
    const startDateStr = searchParams.get('start_date');
    const endDateStr = searchParams.get('end_date');
    const limitStr = searchParams.get('limit');

    // Build query using supabaseAdmin for RLS bypass
    
    let query = supabaseAdmin
      .from('system_logs')
      .select('*')
      .order('created_at', { ascending: false });

    // Apply filters
    if (logLevel) {
      query = query.eq('log_level', logLevel);
    }

    if (logType) {
      query = query.eq('log_type', logType);
    }

    if (startDateStr) {
      query = query.gte('created_at', new Date(startDateStr).toISOString());
    }

    if (endDateStr) {
      query = query.lte('created_at', new Date(endDateStr).toISOString());
    }

    const limit = limitStr ? parseInt(limitStr, 10) : 100;
    query = query.limit(limit);

    const { data: logs, error } = await query;

    if (error) {
      console.error('Database error fetching logs:', error);
      return NextResponse.json(
        { error: 'Failed to fetch error logs from database' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      logs: logs || [],
      count: logs?.length || 0
    });
  } catch (error) {
    console.error('Error fetching error logs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch error logs' },
      { status: 500 }
    );
  }
}
