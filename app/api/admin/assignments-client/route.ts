import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// This endpoint works with client-side authentication
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, token, ...data } = body;

    if (!token) {
      return NextResponse.json({ error: 'No token provided' }, { status: 401 });
    }

    // Create Supabase client with the provided token
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    // Set the session with the provided token
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    
    if (authError || !user) {
      console.error('Auth error:', authError);
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
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

    // Handle different actions
    switch (action) {
      case 'GET_ASSIGNMENTS':
        const { data: assignments, error: getError } = await supabase
          .from('assignments')
          .select('*')
          .order('created_at', { ascending: false });

        if (getError) {
          console.error('Error fetching assignments:', getError);
          return NextResponse.json({ error: 'Failed to fetch assignments' }, { status: 500 });
        }

        return NextResponse.json({ assignments: assignments || [] });

      case 'CREATE_ASSIGNMENT':
        const { data: newAssignment, error: createError } = await supabase
          .from('assignments')
          .insert([data])
          .select()
          .single();

        if (createError) {
          console.error('Error creating assignment:', createError);
          return NextResponse.json({ error: 'Failed to create assignment' }, { status: 500 });
        }

        return NextResponse.json({ assignment: newAssignment });

      case 'UPDATE_ASSIGNMENT':
        const { id, ...updateData } = data;
        const { data: updatedAssignment, error: updateError } = await supabase
          .from('assignments')
          .update(updateData)
          .eq('id', id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating assignment:', updateError);
          return NextResponse.json({ error: 'Failed to update assignment' }, { status: 500 });
        }

        return NextResponse.json({ assignment: updatedAssignment });

      case 'DELETE_ASSIGNMENT':
        const { error: deleteError } = await supabase
          .from('assignments')
          .delete()
          .eq('id', data.id);

        if (deleteError) {
          console.error('Error deleting assignment:', deleteError);
          return NextResponse.json({ error: 'Failed to delete assignment' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error in assignments-client API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}