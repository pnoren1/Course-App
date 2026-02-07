import { rlsSupabase } from '@/lib/supabase';

/**
 * Helper function to create authenticated headers for API calls
 */
export async function getAuthHeaders(): Promise<HeadersInit> {
  const { data: { session }, error } = await rlsSupabase.auth.getSession();
  
  const token = session?.access_token;
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json'
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  } else {
    console.log('❌ No token available for Authorization header');
  }
  
  return headers;
}

/**
 * Helper function to make authenticated API calls
 */
export async function authenticatedFetch(
  url: string, 
  options: RequestInit = {}
): Promise<Response> {
  
  const headers = await getAuthHeaders();
  
  const response = await fetch(url, {
    ...options,
    credentials: 'include', // Include cookies for authentication
    headers: {
      ...headers,
      ...options.headers
    }
  });
  
  return response;
}

/**
 * Helper function to make authenticated API calls with JSON response
 */
export async function authenticatedFetchJson<T = any>(
  url: string, 
  options: RequestInit = {}
): Promise<{ data: T | null; error: string | null; response: Response }> {
  try {
    const response = await authenticatedFetch(url, options);
    const data = await response.json();
    
    if (!response.ok) {
      return {
        data: null,
        error: data.error || `HTTP ${response.status}: ${response.statusText}`,
        response
      };
    }
    
    return {
      data,
      error: null,
      response
    };
  } catch (error) {
    return {
      data: null,
      error: error instanceof Error ? error.message : 'Unknown error',
      response: new Response(null, { status: 500 })
    };
  }
}