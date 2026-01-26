import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';

// GET - Get all assignments
export async function GET(request: NextRequest) {
  try {
    console.log('🔍 Starting GET /api/admin/assignments');
    
    const { user, supabase } = await getAuthenticatedUser(request);
    console.log('👤 User:', user ? { id: user.id, email: user.email } : 'No user');
    
    if (!user) {
      console.log('❌ No user found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profile')
      .select('role')
      .eq('user_id', user.id)
      .single();

    console.log('🔐 User profile:', userProfile);
    
    if (profileError || !userProfile || userProfile.role !== 'admin') {
      console.log('❌ User is not admin:', { profileError, userProfile });
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    console.log('📊 Fetching assignments from database...');
    const { data: assignments, error } = await supabase
      .from('assignments')
      .select('*')
      .order('created_at', { ascending: false });

    console.log('📋 Query result:', { 
      assignments: assignments?.length || 0, 
      error: error?.message || 'No error' 
    });

    if (error) {
      console.error('💥 Error fetching assignments:', error);
      return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
    }

    console.log('✅ Successfully fetched assignments:', assignments?.length || 0);
    return NextResponse.json(assignments || []);
  } catch (error) {
    console.error('💥 Error in GET /api/admin/assignments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// POST - Create new assignment
export async function POST(request: NextRequest) {
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

    const assignmentData = {
      title: title.trim(),
      description: description?.trim() || null,
      unit_id: parseInt(unit_id),
      due_date: due_date || null,
      max_file_size_mb: max_file_size_mb || 10,
      allowed_file_types: allowed_file_types || ['pdf', 'doc', 'docx'],
      estimated_duration_minutes: estimated_duration_minutes || null,
      required_files: required_files || []
    };

    const { data: assignment, error } = await supabase
      .from('assignments')
      .insert([assignmentData])
      .select()
      .single();

    if (error) {
      console.error('Error creating assignment:', error);
      return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
    }

    return NextResponse.json(assignment, { status: 201 });
  } catch (error) {
    console.error('Error in POST /api/admin/assignments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}