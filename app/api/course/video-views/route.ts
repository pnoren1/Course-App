import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { videoViewService } from '@/lib/services/videoViewService';

/**
 * GET /api/course/video-views
 * Retrieve video views for the current user
 * Requirements: 5.2, 5.6
 */
export async function GET(request: NextRequest) {
  try {
    // Validate authentication
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        },
        { status: 401 }
      );
    }

    // Get current user ID from session (already have it from getAuthenticatedUser)
    const userId = user.id;

    // Optional: Extract lessonId from query params if provided
    const { searchParams } = new URL(request.url);
    const lessonId = searchParams.get('lessonId') || undefined;

    // Call videoViewService.getUserViews()
    const views = await videoViewService.getUserViews(userId, lessonId);

    // Return views array
    return NextResponse.json({
      success: true,
      views
    });

  } catch (error) {
    console.error('Error in GET /api/course/video-views:', error);
    
    // Handle errors appropriately
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to retrieve video views',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/course/video-views
 * Create a new video view record
 * Requirements: 1.1, 1.2, 5.1, 5.6
 */
export async function POST(request: NextRequest) {
  try {
    // Validate authentication
    const { user, error: authError } = await getAuthenticatedUser(request);
    
    if (authError || !user) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        },
        { status: 401 }
      );
    }

    // Extract lessonId from request body
    const body = await request.json();
    const { lessonId } = body;

    // Validate lessonId
    if (!lessonId || typeof lessonId !== 'string' || !lessonId.trim()) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid lesson ID',
          code: 'INVALID_INPUT'
        },
        { status: 400 }
      );
    }

    // Call videoViewService.createView()
    const view = await videoViewService.createView(user.id, lessonId.trim());

    // Return success response with view ID
    return NextResponse.json({
      success: true,
      viewId: view.id,
      view
    });

  } catch (error) {
    console.error('Error in POST /api/course/video-views:', error);
    
    // Handle errors with appropriate status codes
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to create video view',
        code: 'SERVER_ERROR'
      },
      { status: 500 }
    );
  }
}
