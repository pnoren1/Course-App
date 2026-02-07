/**
 * Environment variables validation and access
 * This ensures environment variables are available both server and client side
 */

// Validate required environment variables at build time
const requiredEnvVars = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
} as const;

// Only validate on server side during build
if (typeof window === 'undefined') {
  const missing = Object.entries(requiredEnvVars)
    .filter(([_, value]) => !value)
    .map(([key]) => key);

  if (missing.length > 0) {
    console.error('Missing required environment variables:', missing.join(', '));
    // Don't throw during build, just warn
    console.warn('⚠️ Some environment variables are missing. The app may not work correctly.');
  }
}

/**
 * Get Supabase URL with fallback
 * Works on both server and client side
 */
export function getSupabaseUrl(): string {
  // Try multiple sources in order of preference
  const url = 
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    (typeof window !== 'undefined' && (window as any).__NEXT_DATA__?.props?.pageProps?.env?.NEXT_PUBLIC_SUPABASE_URL) ||
    'https://lzedeawtmzfenyrewhmo.supabase.co'; // Fallback to known URL

  if (!url) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL is not defined');
  }

  return url;
}

/**
 * Get Supabase Anon Key with fallback
 * Works on both server and client side
 */
export function getSupabaseAnonKey(): string {
  // Try multiple sources in order of preference
  const key = 
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    (typeof window !== 'undefined' && (window as any).__NEXT_DATA__?.props?.pageProps?.env?.NEXT_PUBLIC_SUPABASE_ANON_KEY) ||
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx6ZWRlYXd0bXpmZW55cmV3aG1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY5MTE4NzgsImV4cCI6MjA4MjQ4Nzg3OH0.IJ7tOANZzuqLsM7AtrDHX6H__xOcB80wF9QMbx1B1iQ'; // Fallback to known key

  if (!key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is not defined');
  }

  return key;
}

/**
 * Get site URL with fallback
 */
export function getSiteUrl(): string {
  return process.env.NEXT_PUBLIC_SITE_URL || 
    (typeof window !== 'undefined' ? window.location.origin : 'https://course-app-khaki.vercel.app');
}
