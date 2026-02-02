import { NextRequest, NextResponse } from 'next/server';

// HEAD /api/video/ping - Simple ping endpoint for latency estimation
export async function HEAD(request: NextRequest) {
  return new NextResponse(null, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}

// GET /api/video/ping - Alternative ping endpoint
export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    timestamp: Date.now(),
    status: 'ok' 
  }, { 
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
}