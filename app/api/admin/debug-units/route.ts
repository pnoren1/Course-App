import { NextResponse } from 'next/server';
import { rlsSupabase } from '@/lib/supabase';

export async function GET() {
  try {
    console.log('🔍 Checking units table...');
    
    // Try to query units table
    const { data: units, error } = await rlsSupabase.raw
      .from('units')
      .select('*')
      .limit(5);

    console.log('📊 Units query result:', { units, error });

    // Also try to get table info
    let tableExists = false;
    try {
      // Use a simple query to check if table exists
      const { error: tableError } = await rlsSupabase.raw
        .from('units')
        .select('id')
        .limit(1);
      
      tableExists = !tableError;
      console.log('🗄️ Table exists:', tableExists);
    } catch (rpcError) {
      console.log('⚠️ Could not check table existence');
      tableExists = false;
    }

    return NextResponse.json({
      success: !error,
      units: units || [],
      error: error?.message || null,
      tableExists,
      unitsCount: units?.length || 0
    });

  } catch (error) {
    console.error('💥 Debug error:', error);
    return NextResponse.json({ 
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      units: [],
      tableExists: false,
      unitsCount: 0
    }, { status: 500 });
  }
}