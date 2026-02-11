// import { NextRequest, NextResponse } from 'next/server';
// import { logCriticalError } from '@/lib/services/errorLoggerService';

// export async function GET(request: NextRequest) {
//   const { searchParams } = new URL(request.url);
//   const errorType = searchParams.get('type') || 'api';

//   try {
//     switch (errorType) {
//       case 'api':
//         // Trigger an API error
//         throw new Error('Test API error with sensitive data: password=secret123 token=abc-def-ghi');

//       case 'supabase':
//         // Simulate Supabase initialization error
//         await logCriticalError({
//           logType: 'SUPABASE_INIT_ERROR',
//           message: 'supabaseUrl is required - Test error',
//           metadata: {
//             environment: 'test',
//             browser: request.headers.get('user-agent'),
//             referrer: request.headers.get('referer'),
//           },
//         });
//         return NextResponse.json({ 
//           success: true, 
//           message: 'Supabase init error logged' 
//         });

//       case 'with-user':
//         // Test error with user context (will capture from session if available)
//         await logCriticalError({
//           logType: 'TEST_ERROR_WITH_USER',
//           message: 'Test error to verify user context capture',
//           error: new Error('Test error with stack trace'),
//           metadata: {
//             testData: 'This is a test',
//             apiKey: 'should-be-sanitized-123',
//           },
//         });
//         return NextResponse.json({ 
//           success: true, 
//           message: 'Error with user context logged' 
//         });

//       case 'long-message':
//         // Test field truncation
//         const longMessage = 'A'.repeat(6000); // Exceeds 5000 char limit
//         await logCriticalError({
//           logType: 'TEST_LONG_MESSAGE',
//           message: longMessage,
//           error: new Error('Error with long stack trace: ' + 'B'.repeat(6000)),
//         });
//         return NextResponse.json({ 
//           success: true, 
//           message: 'Long message error logged (should be truncated)' 
//         });

//       case 'no-user':
//         // Test error without user context
//         await logCriticalError({
//           logType: 'TEST_ERROR_NO_USER',
//           message: 'Test error without user context',
//           metadata: {
//             anonymous: true,
//           },
//         });
//         return NextResponse.json({ 
//           success: true, 
//           message: 'Error without user context logged' 
//         });

//       default:
//         return NextResponse.json({ 
//           error: 'Invalid error type. Use: api, supabase, with-user, long-message, or no-user' 
//         }, { status: 400 });
//     }
//   } catch (error) {
//     // This will be caught by the API error handler if wrapped
//     // For now, manually log it
//     await logCriticalError({
//       logType: 'API_ERROR',
//       message: error instanceof Error ? error.message : 'Unknown error',
//       error: error instanceof Error ? error : undefined,
//       metadata: {
//         method: request.method,
//         path: request.nextUrl.pathname,
//       },
//     });

//     return NextResponse.json({ 
//       success: true, 
//       message: 'API error logged',
//       error: error instanceof Error ? error.message : 'Unknown error'
//     });
//   }
// }
