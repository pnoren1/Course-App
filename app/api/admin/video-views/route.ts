import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { videoViewService } from '@/lib/services/videoViewService';
import { supabaseAdmin } from '@/lib/supabase';

/**
 * GET /api/admin/video-views
 * Get video views for admin/org_admin with role-based filtering
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 5.3, 5.4, 5.5, 5.6, 5.7
 */
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 GET /api/admin/video-views called');
    
    // Validate authentication
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    console.log('👤 User:', user ? { id: user.id, email: user.email } : 'null');
    console.log('❌ Auth error:', authError);
    
    if (authError || !user) {
      console.log('❌ Authentication failed');
      return NextResponse.json(
        { error: 'Authentication required', code: 'AUTH_REQUIRED' },
        { status: 401 }
      );
    }

    // Get user profile to check role and organization
    if (!supabaseAdmin) {
      console.error('❌ API: supabaseAdmin not available');
      return NextResponse.json(
        { error: 'Server configuration error', code: 'SERVER_ERROR' },
        { status: 500 }
      );
    }

    console.log('🔍 Fetching user profile for:', user.id);

    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('user_profile')
      .select('role, organization_id')
      .eq('user_id', user.id)
      .single();

    console.log('👤 User profile:', userProfile);
    console.log('❌ Profile error:', profileError);

    if (profileError || !userProfile) {
      console.error('❌ API: Profile error for current user:', profileError);
      return NextResponse.json(
        { error: 'User profile not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    // Validate authorization (admin or org_admin only)
    if (userProfile.role !== 'admin' && userProfile.role !== 'org_admin') {
      console.log('❌ Insufficient privileges:', userProfile.role);
      return NextResponse.json(
        { error: 'Insufficient privileges to view video progress', code: 'FORBIDDEN' },
        { status: 403 }
      );
    }

    console.log('✅ User authorized:', userProfile.role);

    // Extract query parameters
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || undefined;
    const organizationId = searchParams.get('organizationId') || undefined;

    console.log('🔍 Filters:', { userId, organizationId });

    // Call videoViewService.getAdminViews with appropriate filters
    console.log('🔍 Calling videoViewService.getAdminViews...');
    const userProgress = await videoViewService.getAdminViews(user.id, {
      userId,
      organizationId
    });

    console.log('✅ Got user progress:', userProgress.length, 'users');

    return NextResponse.json({
      success: true,
      users: userProgress
    });

  } catch (error) {
    console.error('💥 Error in GET /api/admin/video-views:', error);
    console.error('💥 Error stack:', error instanceof Error ? error.stack : 'N/A');
    
    // Handle specific error cases
    if (error instanceof Error) {
      if (error.message.includes('admin privileges')) {
        return NextResponse.json(
          { error: error.message, code: 'FORBIDDEN' },
          { status: 403 }
        );
      }
      if (error.message.includes('own organization')) {
        return NextResponse.json(
          { error: error.message, code: 'FORBIDDEN' },
          { status: 403 }
        );
      }
    }

    return NextResponse.json(
      { 
        error: `Error fetching video views: ${error instanceof Error ? error.message : 'Unknown error'}`,
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}
