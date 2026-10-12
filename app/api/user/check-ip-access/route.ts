import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedUser } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase';
import { extractClientIp, isIpAllowed } from '@/lib/utils/ip-utils';

/**
 * GET /api/user/check-ip-access
 *
 * Checks whether the requesting user's IP is allowed to access the course.
 * Called client-side when the course page loads.
 *
 * Returns:
 *   { allowed: true }                          — access granted
 *   { allowed: false, ip: string }             — access denied
 *   { allowed: true, reason: 'no-restriction'} — group has no IP restriction
 */
export async function GET(request: NextRequest) {
  try {
    const { user, error: authError } = await getAuthenticatedUser(request);

    if (authError || !user) {
      // Not authenticated — let the app's own auth guard handle this
      return NextResponse.json({ allowed: true, reason: 'unauthenticated' });
    }

    const supabaseAdmin = getSupabaseAdmin();

    // Get user's group_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('user_profile')
      .select('group_id')
      .eq('user_id', user.id)
      .single();

    if (profileError || !profile?.group_id) {
      // No group — no restriction applies
      return NextResponse.json({ allowed: true, reason: 'no-group' });
    }

    // Get group's IP restriction setting
    const { data: group, error: groupError } = await supabaseAdmin
      .from('groups')
      .select('ip_restriction_enabled')
      .eq('id', profile.group_id)
      .single();

    if (groupError || !group?.ip_restriction_enabled) {
      // Restriction not enabled
      return NextResponse.json({ allowed: true, reason: 'no-restriction' });
    }

    // Get allowlist for this group
    const { data: allowlist, error: allowlistError } = await supabaseAdmin
      .from('group_ip_allowlist')
      .select('ip_pattern')
      .eq('group_id', profile.group_id)
      .limit(500);

    if (allowlistError) {
      // DB error — fail open (don't lock user out due to infra issues)
      console.error('check-ip-access: allowlist fetch error', allowlistError);
      return NextResponse.json({ allowed: true, reason: 'db-error' });
    }

    const patterns = (allowlist ?? []).map((r) => r.ip_pattern);
    const clientIp = extractClientIp(request) ?? '';

    // Never block localhost — only relevant in local development
    if (clientIp === '::1' || clientIp === '127.0.0.1') {
      return NextResponse.json({ allowed: true, reason: 'localhost' });
    }

    // Fail-closed: restriction enabled + no patterns = block all
    if (patterns.length === 0 || !isIpAllowed(clientIp, patterns)) {
      return NextResponse.json({ allowed: false, ip: clientIp });
    }

    return NextResponse.json({ allowed: true });
  } catch (error) {
    console.error('check-ip-access error:', error);
    // Fail open on unexpected errors
    return NextResponse.json({ allowed: true, reason: 'error' });
  }
}
