/**
 * Rate Limiting Middleware
 * מגן מפני brute force attacks ו-DoS
 */

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

// ניקוי אוטומטי של רשומות ישנות כל 10 דקות
setInterval(() => {
  const now = Date.now();
  Object.keys(store).forEach(key => {
    if (store[key].resetTime < now) {
      delete store[key];
    }
  });
}, 10 * 60 * 1000);

export interface RateLimitConfig {
  /**
   * מספר הבקשות המקסימלי בחלון הזמן
   */
  maxRequests: number;
  
  /**
   * חלון הזמן במילישניות
   */
  windowMs: number;
  
  /**
   * הודעת שגיאה מותאמת אישית
   */
  message?: string;
}

/**
 * יצירת rate limiter
 * @param config הגדרות rate limiting
 * @returns פונקציה לבדיקת rate limit
 */
export function createRateLimiter(config: RateLimitConfig) {
  const { maxRequests, windowMs, message } = config;

  return async (identifier: string): Promise<{ 
    allowed: boolean; 
    remaining: number;
    resetTime: number;
    error?: string;
  }> => {
    const now = Date.now();
    const key = identifier;

    // אם אין רשומה או שהזמן עבר, צור רשומה חדשה
    if (!store[key] || store[key].resetTime < now) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs
      };
      
      return {
        allowed: true,
        remaining: maxRequests - 1,
        resetTime: store[key].resetTime
      };
    }

    // הגדל את מונה הבקשות
    store[key].count++;

    // בדוק אם עברנו את המגבלה
    if (store[key].count > maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: store[key].resetTime,
        error: message || 'יותר מדי בקשות. אנא נסה שוב מאוחר יותר'
      };
    }

    return {
      allowed: true,
      remaining: maxRequests - store[key].count,
      resetTime: store[key].resetTime
    };
  };
}

/**
 * קבלת מזהה ייחודי מבקשה (IP או user ID)
 */
export function getRequestIdentifier(request: Request, userId?: string): string {
  // אם יש user ID, השתמש בו (מדויק יותר)
  if (userId) {
    return `user:${userId}`;
  }

  // אחרת, השתמש ב-IP
  const forwarded = request.headers.get('x-forwarded-for');
  const ip = forwarded ? forwarded.split(',')[0].trim() : 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  return `ip:${ip}`;
}

/**
 * Rate limiters מוגדרים מראש לשימוש נפוץ
 */
export const rateLimiters = {
  // הגנה על login - 5 ניסיונות ב-15 דקות
  auth: createRateLimiter({
    maxRequests: 5,
    windowMs: 15 * 60 * 1000,
    message: 'יותר מדי ניסיונות התחברות. אנא נסה שוב בעוד 15 דקות'
  }),

  // הגנה על יצירת משתמשים - 10 ב-שעה
  createUser: createRateLimiter({
    maxRequests: 10,
    windowMs: 60 * 60 * 1000,
    message: 'יותר מדי יצירות משתמשים. אנא נסה שוב בעוד שעה'
  }),

  // הגנה על API כללי - 100 בקשות ב-דקה
  api: createRateLimiter({
    maxRequests: 100,
    windowMs: 60 * 1000,
    message: 'יותר מדי בקשות. אנא המתן דקה ונסה שוב'
  }),

  // הגנה על העלאת קבצים - 20 ב-שעה
  fileUpload: createRateLimiter({
    maxRequests: 20,
    windowMs: 60 * 60 * 1000,
    message: 'יותר מדי העלאות קבצים. אנא נסה שוב בעוד שעה'
  }),

  // הגנה על bulk operations - 3 ב-שעה
  bulkOperation: createRateLimiter({
    maxRequests: 3,
    windowMs: 60 * 60 * 1000,
    message: 'יותר מדי פעולות המוניות. אנא נסה שוב בעוד שעה'
  })
};
