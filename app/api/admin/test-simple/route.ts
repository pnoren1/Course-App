import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    console.log('Test simple API called');
    
    const body = await request.json();
    console.log('Request body:', body);

    return NextResponse.json({
      success: true,
      message: 'API endpoint works correctly',
      timestamp: new Date().toISOString(),
      receivedData: body
    });

  } catch (error) {
    console.error('Error in test-simple API:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'שגיאה פנימית בשרת',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}