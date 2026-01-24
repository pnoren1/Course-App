import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // בדיקת headers
    const authHeader = request.headers.get('authorization');
    const allHeaders: Record<string, string> = {};
    
    request.headers.forEach((value, key) => {
      allHeaders[key] = value;
    });
    
    // בדיקת cookies
    const cookies: Record<string, string> = {};
    
    // request.cookies.forEach((value, key) => {
    //   cookies[key] = value;
    // });
    
    return NextResponse.json({
      headers: {
        authorization: authHeader,
        all: allHeaders
      },
      cookies,
      url: request.url,
      method: request.method
    });

  } catch (error) {
    console.error('Error in debug-auth API:', error);
    return NextResponse.json({
      error: 'שגיאה פנימית בשרת',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}