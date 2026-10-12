import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// ---------------------------------------------------------------------------
// IP utility helpers — copied inline to avoid Node.js-only imports
// (Edge Runtime isolation: cannot import from lib/utils/ip-utils.ts because
//  that file may be tree-shaken with Node.js modules in other code paths)
// ---------------------------------------------------------------------------

function ipToUint32(ip: string): number {
  const parts = ip.split('.');
  if (parts.length !== 4) return NaN;
  let result = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return NaN;
    const octet = parseInt(part, 10);
    if (octet < 0 || octet > 255) return NaN;
    result = (result * 256 + octet) >>> 0;
  }
  return result;
}

function extractClientIp(request: NextRequest): string | null {
  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    const first = forwarded.split(',')[0].trim();
    if (first) return first;
  }
  const realIp = request.headers.get('x-real-ip');
  if (realIp) {
    const trimmed = realIp.trim();
    if (trimmed) return trimmed;
  }
  return null;
}

function ipMatchesPattern(ip: string, pattern: string): boolean {
  try {
    const slashIndex = pattern.indexOf('/');
    if (slashIndex === -1) {
      return ip.trim() === pattern.trim();
    }
    const networkAddress = pattern.slice(0, slashIndex);
    const prefixLengthStr = pattern.slice(slashIndex + 1);
    if (!/^\d+$/.test(prefixLengthStr)) return false;
    const prefixLength = parseInt(prefixLengthStr, 10);
    if (prefixLength < 0 || prefixLength > 32) return false;
    const ipInt = ipToUint32(ip.trim());
    const networkInt = ipToUint32(networkAddress.trim());
    if (isNaN(ipInt) || isNaN(networkInt)) return false;
    if (prefixLength === 0) return true;
    const mask = (0xffffffff << (32 - prefixLength)) >>> 0;
    return (ipInt & mask) >>> 0 === (networkInt & mask) >>> 0;
  } catch {
    return false;
  }
}

function isIpAllowed(ip: string, patterns: string[]): boolean {
  return patterns.some((pattern) => ipMatchesPattern(ip, pattern));
}

// ---------------------------------------------------------------------------
// Cookie-based JWT extraction — replicates createServerSupabaseClient logic
// without importing lib/supabase-server.ts (which uses Node.js built-ins)
// ---------------------------------------------------------------------------

function extractTokenFromCookies(request: NextRequest): string | null {
  // Check Authorization header first
  const authHeader = request.headers.get('authorization');
  if (authHeader) {
    const token = authHeader.replace('Bearer ', '').trim();
    if (token) return token;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  let projectRef = 'lzedeawtmzfenyrewhmo'; // default fallback
  const match = supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
  if (match) {
    projectRef = match[1];
  }

  const cookies = request.cookies;

  // Primary cookie name
  const primaryCookieName = `sb-${projectRef}-auth-token`;
  const primaryValue = cookies.get(primaryCookieName)?.value;
  if (primaryValue) {
    try {
      const parsed = JSON.parse(primaryValue);
      if (parsed.access_token) return parsed.access_token as string;
    } catch {
      if (primaryValue.startsWith('eyJ')) return primaryValue;
    }
  }

  // Fallback: scan all sb- cookies
  for (const cookie of cookies.getAll()) {
    if (cookie.name.startsWith('sb-') && cookie.value) {
      try {
        const parsed = JSON.parse(cookie.value);
        if (parsed.access_token) return parsed.access_token as string;
      } catch {
        // not JSON, skip
      }
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Paths that are always allowed through without IP checks
// ---------------------------------------------------------------------------

const SKIP_PATHS = [
  '/ip-blocked',
  '/login',
  '/api/auth',
  '/_next',
  '/favicon',
];

function shouldSkip(pathname: string): boolean {
  return SKIP_PATHS.some((p) => pathname.startsWith(p));
}

// ---------------------------------------------------------------------------
// Middleware
// ---------------------------------------------------------------------------

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow through skipped paths
  if (shouldSkip(pathname)) {
    return NextResponse.next();
  }

  try {
    // Extract JWT from cookies / Authorization header
    const token = extractTokenFromCookies(request);
    if (!token) {
      // Not authenticated — let the app handle auth redirects normally
      return NextResponse.next();
    }

    // Get the authenticated user using the Supabase JS client with anon key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      // Invalid/expired token — pass through (auth layer will redirect)
      return NextResponse.next();
    }

    // Fetch the user's profile and group via the Supabase REST API
    // (must use service-role key to bypass RLS)
    const restBase = `${supabaseUrl}/rest/v1`;
    const adminHeaders: HeadersInit = {
      Authorization: `Bearer ${process.env.SUPABASE_SECRET_KEY}`,
      apikey: supabaseAnonKey,
      'Content-Type': 'application/json',
    };

    const profileRes = await fetch(
      `${restBase}/user_profile?user_id=eq.${encodeURIComponent(user.id)}&select=group_id&limit=1`,
      { headers: adminHeaders }
    );

    if (!profileRes.ok) {
      // Fail open — cannot determine group, allow through
      return NextResponse.next();
    }

    const profileData = await profileRes.json() as Array<{ group_id: string | null }>;
    if (!profileData.length || !profileData[0].group_id) {
      // No group assigned — allow through
      return NextResponse.next();
    }

    const groupId = profileData[0].group_id;

    // Fetch the group's IP restriction settings
    const groupRes = await fetch(
      `${restBase}/groups?id=eq.${encodeURIComponent(groupId)}&select=ip_restriction_enabled&limit=1`,
      { headers: adminHeaders }
    );

    if (!groupRes.ok) {
      return NextResponse.next();
    }

    const groupData = await groupRes.json() as Array<{ ip_restriction_enabled: boolean }>;
    if (!groupData.length || !groupData[0].ip_restriction_enabled) {
      // IP restriction not enabled for this group — allow through
      return NextResponse.next();
    }

    // Fetch the allow-listed IP patterns for this group
    const allowlistRes = await fetch(
      `${restBase}/group_ip_allowlist?group_id=eq.${encodeURIComponent(groupId)}&select=ip_pattern`,
      { headers: adminHeaders }
    );

    if (!allowlistRes.ok) {
      // Fail open
      return NextResponse.next();
    }

    const allowlistData = await allowlistRes.json() as Array<{ ip_pattern: string }>;
    const patterns = allowlistData.map((r) => r.ip_pattern);

    if (patterns.length === 0) {
      // No patterns configured — fail open (misconfiguration protection)
      return NextResponse.next();
    }

    // Determine the client IP
    const clientIp = extractClientIp(request);
    if (!clientIp) {
      // Cannot determine IP — fail open
      return NextResponse.next();
    }

    if (!isIpAllowed(clientIp, patterns)) {
      const blockedUrl = new URL('/ip-blocked', request.url);
      blockedUrl.searchParams.set('ip', clientIp);
      return NextResponse.redirect(blockedUrl);
    }

    return NextResponse.next();
  } catch {
    // Fail open on any unexpected error — never lock out the user due to middleware bugs
    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
