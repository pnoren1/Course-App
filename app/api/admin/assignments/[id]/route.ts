import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';

// PUT - Update assignment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profile')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile || userProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const resolvedParams = await params;
    const assignmentId = parseInt(resolvedParams.id);
    if (isNaN(assignmentId)) {
      return NextResponse.json({ error: 'Invalid assignment ID' }, { status: 400 });
    }

    const body = await request.json();
    const {
      title,
      description,
      unit_id,
      due_date,
      max_file_size_mb,
      allowed_file_types,
      estimated_duration_minutes,
      required_files
    } = body;

    // Validate required fields
    if (!title || !unit_id) {
      return NextResponse.json({ error: 'Title and unit_id are required' }, { status: 400 });
    }

    const updateData = {
      title: title.trim(),
      description: description?.trim() || null,
      unit_id: parseInt(unit_id),
      due_date: due_date || null,
      max_file_size_mb: max_file_size_mb || 10,
      allowed_file_types: allowed_file_types || ['pdf', 'doc', 'docx'],
      estimated_duration_minutes: estimated_duration_minutes || null,
      required_files: required_files || [],
      updated_at: new Date().toISOString()
    };

    const { data: assignment, error } = await supabase
      .from('assignments')
      .update(updateData)
      .eq('id', assignmentId)
      .select()
      .single();

    if (error) {
      console.error('Error updating assignment:', error);
      return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
    }

    if (!assignment) {
      return NextResponse.json({ error: 'Assignment not found' }, { status: 404 });
    }

    return NextResponse.json(assignment);
  } catch (error) {
    console.error('Error in PUT /api/admin/assignments/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// DELETE - Delete assignment
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { user, supabase } = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profile')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (profileError || !userProfile || userProfile.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const resolvedParams = await params;
    const assignmentId = parseInt(resolvedParams.id);
    if (isNaN(assignmentId)) {
      return NextResponse.json({ error: 'Invalid assignment ID' }, { status: 400 });
    }

    // Check if assignment has submissions
    const { data: submissions, error: submissionsError } = await supabase
      .from('assignment_submissions')
      .select('id')
      .eq('assignment_id', assignmentId)
      .limit(1);

    if (submissionsError) {
      console.error('Error checking submissions:', submissionsError);
      return NextResponse.json({ error: 'Failed to check submissions' }, { status: 500 });
    }

    if (submissions && submissions.length > 0) {
      return NextResponse.json({ 
        error: 'Cannot delete assignment with existing submissions' 
      }, { status: 400 });
    }

    const { error } = await supabase
      .from('assignments')
      .delete()
      .eq('id', assignmentId);

    if (error) {
      console.error('Error deleting assignment:', error);
      return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Error in DELETE /api/admin/assignments/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}