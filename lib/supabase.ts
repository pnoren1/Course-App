import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Database } from "./types/database.types";
import { getSupabaseUrl, getSupabaseAnonKey } from "./env";

// Create the base Supabase client
export const supabase = createClient<Database>(
  getSupabaseUrl(),
  getSupabaseAnonKey(),
  {
    auth: {
      // הגדרת זמן תוקף הסשן (בשניות)
      // 1800 = 30 דקות, 900 = 15 דקות
      autoRefreshToken: true, // רענון אוטומטי
      persistSession: true, // שמירת סשן בלוקל סטורג'
      detectSessionInUrl: true, // זיהוי סשן מ-URL
      // flowType: 'pkce' // אבטחה משופרת
    }
  }
);

// Create admin client with service role key (server-side only)
// Only create if service role key is available
function createAdminClient() {
  // Don't create admin client on client side
  if (typeof window !== 'undefined') {
    return null;
  }
  
  const supabaseUrl = getSupabaseUrl();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    return null;
  }
  
  return createClient<Database>(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );
}

export const supabaseAdmin = createAdminClient();

// Function to get admin client safely (server-side only)
export function getSupabaseAdmin(): SupabaseClient<Database> {
  // Check if we're on the server side
  if (typeof window !== 'undefined') {
    throw new Error('getSupabaseAdmin() can only be called on the server side');
  }
  
  if (!supabaseAdmin) {
    const supabaseUrl = getSupabaseUrl();
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Missing environment variables for admin client');
      throw new Error('Missing environment variables for admin client');
    }
    
    return createClient<Database>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  
  return supabaseAdmin;
}

/**
 * Enhanced Supabase client with simplified error handling
 */
export class RLSAwareSupabaseClient {
  private client: SupabaseClient<Database>;

  constructor(client: SupabaseClient<Database>) {
    this.client = client;
  }

  /**
   * Get the underlying Supabase client
   */
  get raw(): SupabaseClient<Database> {
    return this.client;
  }

  /**
   * Access to the from method for direct table queries
   */
  from(table: keyof Database['public']['Tables']) {
    return this.client.from(table);
  }

  /**
   * Access to auth methods
   */
  get auth() {
    return this.client.auth;
  }

  /**
   * Access to storage methods
   */
  get storage() {
    return this.client.storage;
  }

  /**
   * Access to RPC methods
   */
  rpc(fn: any, args?: any) {
    return this.client.rpc(fn, args);
  }

  /**
   * Enhanced query method with error handling
   */
  async query<T = any>(
    operation: () => Promise<{ data: T | null; error: any }>,
    context?: { table?: string; operation?: string }
  ): Promise<{ data: T | null; error: any }> {
    try {
      const result = await operation();
      
      if (result.error) {
        console.error(`Error in ${context?.operation || 'query'} on ${context?.table || 'unknown'}:`, result.error);
        return result;
      }
      
      return result;
    } catch (error) {
      console.error(`Error in ${context?.operation || 'query'} on ${context?.table || 'unknown'}:`, error);
      
      return {
        data: null,
        error
      };
    }
  }

  /**
   * Enhanced select with error handling
   */
  async select<T = any>(
    table: keyof Database['public']['Tables'],
    query?: string,
    filters?: Record<string, any>
  ) {
    return this.query(
      async () => {
        let queryBuilder = this.client.from(table).select(query || '*');
        
        if (filters) {
          Object.entries(filters).forEach(([key, value]) => {
            queryBuilder = queryBuilder.eq(key, value);
          });
        }
        
        return queryBuilder;
      },
      { table: table as string, operation: 'SELECT' }
    );
  }

  /**
   * Enhanced insert with error handling
   */
  async insert<T = any>(
    table: keyof Database['public']['Tables'],
    data: any
  ) {
    return this.query(
      async () => this.client.from(table).insert(data).select(),
      { table: table as string, operation: 'INSERT' }
    );
  }

  /**
   * Enhanced update with error handling
   */
  async update<T = any>(
    table: keyof Database['public']['Tables'],
    data: any,
    filters: Record<string, any>
  ) {
    return this.query(
      async () => {
        let queryBuilder = this.client.from(table).update(data);
        
        Object.entries(filters).forEach(([key, value]) => {
          queryBuilder = queryBuilder.eq(key, value);
        });
        
        return queryBuilder.select();
      },
      { table: table as string, operation: 'UPDATE' }
    );
  }

  /**
   * Enhanced delete with error handling
   */
  async delete(
    table: keyof Database['public']['Tables'],
    filters: Record<string, any>
  ) {
    return this.query(
      async () => {
        let queryBuilder = this.client.from(table).delete();
        
        Object.entries(filters).forEach(([key, value]) => {
          queryBuilder = queryBuilder.eq(key, value);
        });
        
        return queryBuilder;
      },
      { table: table as string, operation: 'DELETE' }
    );
  }

  /**
   * Get current user with error handling
   */
  async getCurrentUser() {
    try {
      const { data: { user }, error } = await this.client.auth.getUser();
      
      if (error) {
        console.error('Error getting user:', error);
        return { user: null, error };
      }
      
      return { user, error: null };
    } catch (error) {
      console.error('Error getting user:', error);
      return { user: null, error };
    }
  }

  /**
   * Check if user has specific role
   */
  async checkUserRole(role: string) {
    try {
      const { data, error } = await this.client.rpc('has_role', { role_name: role });
      
      if (error) {
        console.error('Error checking user role:', error);
        return { hasRole: false, error };
      }
      
      return { hasRole: data || false, error: null };
    } catch (error) {
      console.error('Error checking user role:', error);
      return { hasRole: false, error };
    }
  }

  /**
   * Check if user is admin
   */
  async isAdmin() {
    try {
      const { data, error } = await this.client.rpc('is_admin');
      
      if (error) {
        console.error('Error checking admin status:', error);
        return { isAdmin: false, error };
      }
      
      return { isAdmin: data || false, error: null };
    } catch (error) {
      console.error('Error checking admin status:', error);
      return { isAdmin: false, error };
    }
  }
}

// Create enhanced client instance
export const rlsSupabase = new RLSAwareSupabaseClient(supabase);

// Utility functions for common patterns
export const supabaseUtils = {
  /**
   * Handle authentication state changes
   */
  onAuthStateChange: (callback: (event: string, session: any) => void) => {
    return supabase.auth.onAuthStateChange((event, session) => {
      try {
        callback(event, session);
      } catch (error) {
        console.error('Error in auth state change:', error);
      }
    });
  },

  /**
   * Safe query execution with automatic retry for retryable errors
   */
  safeQuery: async <T = any>(
    operation: () => Promise<{ data: T | null; error: any }>,
    context?: { table?: string; operation?: string },
    maxRetries: number = 2
  ) => {
    let lastError;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await operation();
        if (!result.error) {
          return result;
        }
        lastError = result.error;
        
        // Only retry on certain types of errors
        if (attempt < maxRetries && result.error?.code === 'PGRST301') {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        
        return result;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
          continue;
        }
        throw error;
      }
    }
    
    throw lastError;
  },

  /**
   * Get user-friendly error message for UI display
   */
  getErrorMessage: (error: any, context?: any) => {
    if (!error) return null;
    
    // Handle common Supabase errors
    if (error.code === 'PGRST301') {
      return 'אין הרשאה לגשת למידע זה';
    }
    
    if (error.code === 'PGRST116') {
      return 'המידע המבוקש לא נמצא';
    }
    
    if (error.message?.includes('JWT')) {
      return 'נדרשת התחברות מחדש';
    }
    
    return error.message || 'אירעה שגיאה לא צפויה';
  },

  /**
   * בדיקת תוקף הסשן ויציאה אוטומטית אם פג תוקף
   */
  checkSessionExpiry: async (maxSessionTime: number = 30 * 60 * 1000) => { // 30 דקות ברירת מחדל
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        return { expired: true, session: null };
      }

      // בדיקה לפי expires_at של הטוקן
      const now = Math.floor(Date.now() / 1000); // Unix timestamp בשניות
      const expiresAt = session.expires_at;

      if (expiresAt && now >= expiresAt) {
        // הטוקן פג תוקף
        await supabase.auth.signOut();
        return { expired: true, session: null };
      }

      return { expired: false, session };
    } catch (error) {
      console.error('Error checking session expiry:', error);
      return { expired: true, session: null };
    }
  },

  /**
   * הגדרת טיימר לבדיקת תוקף סשן
   */
  setupSessionExpiryCheck: (
    maxSessionTime: number = 30 * 60 * 1000, // 30 דקות
    checkInterval: number = 5 * 60 * 1000 // בדיקה כל 5 דקות
  ) => {
    const intervalId = setInterval(async () => {
      const { expired } = await supabaseUtils.checkSessionExpiry(maxSessionTime);
      if (expired) {
        clearInterval(intervalId);
        // ניתן להוסיף כאן הפניה לדף התחברות
        window.location.href = '/login';
      }
    }, checkInterval);

    return intervalId;
  }
};