import { NextResponse } from 'next/server';
import { errorLoggerService } from '../services/errorLoggerService';

/**
 * Context for API error logging
 */
interface APIErrorContext {
  method: string;
  path: string;
  request?: Request;
}

/**
 * Wrapper function to catch and log unhandled API route errors
 * 
 * Usage:
 * export async function GET(request: Request) {
 *   return withErrorLogging(
 *     async () => {
 *       // Your API logic here
 *       return NextResponse.json({ data: 'success' });
 *     },
 *     {
 *       method: 'GET',
 *       path: '/api/your-route',
 *       request
 *     }
 *   );
 * }
 * 
 * @param handler The async function containing the API route logic
 * @param context The API error context (method, path, request)
 * @returns The result of the handler or an error response
 */
export async function withErrorLogging<T>(
  handler: () => Promise<T>,
  context: APIErrorContext
): Promise<T | NextResponse> {
  try {
    return await handler();
  } catch (error) {
    // Log the error with API_ERROR type
    await errorLoggerService.logCriticalError(
      {
        logType: 'API_ERROR',
        message: error instanceof Error ? error.message : 'Unknown API error',
        error: error instanceof Error ? error : undefined,
        metadata: {
          method: context.method,
          path: context.path,
        }
      },
      context.request
    );

    // Return error response to client
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'An unexpected error occurred'
      },
      { status: 500 }
    );
  }
}
