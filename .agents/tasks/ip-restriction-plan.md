# Implementation Plan: Per-Group IP Restriction

## Overview

Add IP-based access restriction at the group level. Groups can optionally require that members only access the system from a defined list of IPv4 addresses or CIDR ranges. The middleware enforces this on every request for authenticated users. Admins manage the allowlist through the groups management UI.

---

## File List & Changes

### New files

| File | Purpose |
|------|---------|
| `middleware.ts` (project root) | Next.js middleware — IP enforcement on every request |
| `lib/utils/ip-utils.ts` | Pure-TS CIDR matching + IP extraction helpers |
| `app/ip-blocked/page.tsx` | Hebrew "access denied" error page |
| `app/api/admin/groups/[id]/ip-restrictions/route.ts` | GET allowlist, POST add pattern |
| `app/api/admin/groups/[id]/ip-restrictions/[patternId]/route.ts` | DELETE a pattern |
| `app/components/GroupIpRestrictionManager.tsx` | UI sub-component for managing IP allowlist per group |
| `supabase/migrations/add_ip_restriction_to_groups.sql` | DB migration SQL |

### Modified files

| File | Change |
|------|--------|
| `app/api/admin/groups/[id]/route.ts` | Add PATCH handler for toggling `ip_restriction_enabled` |
| `lib/services/groupService.ts` | Add `updateIpRestriction()` method; update type interfaces |
| `lib/types/database.types.ts` | Add `group_ip_allowlist` table types; extend `groups` Row/Insert/Update with `ip_restriction_enabled` |
| `app/components/OrganizationGroupsManagement.tsx` | Import and render `GroupIpRestrictionManager` in the groups list |

---

## 1. Database Migration

**File:** `supabase/migrations/add_ip_restriction_to_groups.sql`

```sql
-- Add IP restriction toggle to groups
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS ip_restriction_enabled boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.groups.ip_restriction_enabled IS
  'כאשר מופעל, גישה מותרת רק מכתובות IP שהוגדרו ברשימת ה-allowlist של הקבוצה';

-- Create allowlist table
CREATE TABLE IF NOT EXISTS public.group_ip_allowlist (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id      uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  ip_pattern    text NOT NULL,          -- IPv4 exact ("1.2.3.4") or CIDR ("10.0.0.0/24")
  description   text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_group_ip_allowlist_group_id
  ON public.group_ip_allowlist(group_id);

COMMENT ON TABLE public.group_ip_allowlist IS
  'רשימת כתובות IP מורשות לגישה לכל קבוצה. תקף רק כאשר ip_restriction_enabled=true בקבוצה';

-- RLS on group_ip_allowlist
ALTER TABLE public.group_ip_allowlist ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "admins_manage_ip_allowlist" ON public.group_ip_allowlist
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profile
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Authenticated users can read the allowlist for their own group
CREATE POLICY "users_read_own_group_allowlist" ON public.group_ip_allowlist
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profile
      WHERE user_id = auth.uid() AND group_id = group_ip_allowlist.group_id
    )
  );
```

**Why separate table instead of array column:** Easier to add/remove individual entries, index on `group_id`, and track `created_at` per entry. The allowlist is read on every authenticated request via the middleware's admin client (bypasses RLS), so RLS on this table is defence-in-depth only.

---

## 2. TypeScript Types (`lib/types/database.types.ts`)

Add to the `Tables` object inside `Database['public']`:

```typescript
group_ip_allowlist: {
  Row: {
    id: string;
    group_id: string;
    ip_pattern: string;
    description: string | null;
    created_at: string;
  };
  Insert: {
    id?: string;
    group_id: string;
    ip_pattern: string;
    description?: string | null;
    created_at?: string;
  };
  Update: {
    id?: string;
    group_id?: string;
    ip_pattern?: string;
    description?: string | null;
    created_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: "group_ip_allowlist_group_id_fkey";
      columns: ["group_id"];
      referencedRelation: "groups";
      referencedColumns: ["id"];
    }
  ];
};
```

Extend `groups.Row` / `Insert` / `Update` with:
```typescript
ip_restriction_enabled: boolean;   // Row  (required)
ip_restriction_enabled?: boolean;  // Insert (optional, defaults to false)
ip_restriction_enabled?: boolean;  // Update (optional)
```

Also add at the bottom of the file:
```typescript
export type GroupIpAllowlist = Database['public']['Tables']['group_ip_allowlist']['Row'];
export type GroupIpAllowlistInsert = Database['public']['Tables']['group_ip_allowlist']['Insert'];
```

---

## 3. IP Utility Library (`lib/utils/ip-utils.ts`)

Pure TypeScript — no new npm packages.

### IP extraction

```typescript
export function extractClientIp(request: Request): string | null {
  // x-forwarded-for may be a comma-separated list; take the first (original client)
  const xff = request.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  return request.headers.get('x-real-ip');
}
```

**Caveat:** In production behind a reverse proxy/CDN, only the first `x-forwarded-for` value is trusted. Document this in comments.

### CIDR matching algorithm

```typescript
/**
 * Parse an IPv4 address string to a 32-bit unsigned integer.
 */
function ipToInt(ip: string): number {
  const parts = ip.split('.');
  if (parts.length !== 4) throw new Error(`Invalid IPv4: ${ip}`);
  return parts.reduce((acc, octet) => {
    const n = parseInt(octet, 10);
    if (isNaN(n) || n < 0 || n > 255) throw new Error(`Invalid octet: ${octet}`);
    return (acc * 256 + n) >>> 0;
  }, 0);
}

/**
 * Returns true if `ip` matches `pattern`.
 * `pattern` is either:
 *   - an exact IPv4 address: "192.168.1.10"
 *   - a CIDR range:          "10.0.0.0/24"
 */
export function ipMatchesPattern(ip: string, pattern: string): boolean {
  try {
    if (pattern.includes('/')) {
      const [network, prefixStr] = pattern.split('/');
      const prefix = parseInt(prefixStr, 10);
      if (isNaN(prefix) || prefix < 0 || prefix > 32) return false;
      const mask = prefix === 0 ? 0 : (~0 << (32 - prefix)) >>> 0;
      return (ipToInt(ip) & mask) === (ipToInt(network) & mask);
    }
    // Exact match
    return ipToInt(ip) === ipToInt(pattern);
  } catch {
    return false; // Malformed pattern — treat as no-match, fail open
  }
}

/**
 * Returns true if `ip` is in any of the given patterns.
 */
export function isIpAllowed(ip: string, patterns: string[]): boolean {
  return patterns.some(p => ipMatchesPattern(ip, p));
}

/**
 * Validates that a string is a syntactically valid IPv4 address or CIDR range.
 * Used for form validation before saving.
 */
export function isValidIpPattern(pattern: string): boolean {
  const cidrRegex = /^(\d{1,3}\.){3}\d{1,3}(\/([0-9]|[1-2][0-9]|3[0-2]))?$/;
  if (!cidrRegex.test(pattern)) return false;
  try {
    const base = pattern.split('/')[0];
    ipToInt(base); // will throw on invalid octets
    return true;
  } catch {
    return false;
  }
}
```

---

## 4. Next.js Middleware (`middleware.ts`)

**Location:** project root (same level as `package.json`).

### Session extraction approach

The existing `lib/supabase-server.ts` uses `createServerSupabaseClient(request)` which searches cookies for `sb-{projectRef}-auth-token` and falls back to an `Authorization` header. The middleware must do the same but **cannot import** from `lib/supabase-server.ts` because Next.js middleware runs in the Edge Runtime, which does not support the Node.js built-ins that the Supabase admin client uses.

**Decision:** The middleware uses `@supabase/supabase-js` directly with `createClient` (anon key) + manual cookie extraction — the same logic as `supabase-server.ts` — wrapped in a lightweight helper inside `middleware.ts` itself. It does **not** use `supabaseAdmin` (which requires `SUPABASE_SECRET_KEY` and Node.js). For reading the allowlist it calls the Supabase REST API directly via `fetch()` with the service role key in the `Authorization` header (this is an HTTP call, no Node.js module required).

### Paths to skip

```
/ip-blocked
/login
/api/auth/*       (Supabase auth callbacks)
/_next/*
/favicon*
/public/*
```

These are excluded so the blocked page and login page are always reachable, and static assets never trigger the check.

### Flow

```
Request arrives
  └─ Is path excluded? → pass through
  └─ Extract JWT from cookies (same logic as supabase-server.ts)
  └─ No token? → pass through (login page will redirect)
  └─ Call supabase.auth.getUser(token)
  └─ No user or error? → pass through (fail open)
  └─ Fetch user_profile WHERE user_id = uid (via supabaseAdmin REST)
  └─ No profile? → pass through
  └─ profile.group_id is null? → pass through (no group, no restriction)
  └─ Fetch groups WHERE id = group_id, select ip_restriction_enabled
  └─ ip_restriction_enabled = false? → pass through
  └─ Fetch group_ip_allowlist WHERE group_id = group.id
  └─ Any Supabase error? → pass through (fail open)
  └─ Extract client IP from x-forwarded-for / x-real-ip
  └─ IP in allowlist? → pass through
  └─ IP NOT in allowlist → redirect to /ip-blocked?ip={clientIp}
```

**Fail-open policy:** Any unexpected error (Supabase unavailable, malformed data) lets the request through. Security is best-effort; availability is the priority.

### Caching consideration

Fetching the user's group + allowlist on every request is potentially slow. For this initial implementation, no caching is added — the middleware makes 2-3 DB calls per request for affected users. A future optimisation would be to cache group settings in a short-lived in-memory or edge KV store. Document this as a known performance risk.

### Runtime export

```typescript
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

---

## 5. IP-Blocked Error Page (`app/ip-blocked/page.tsx`)

Server Component (no `'use client'`). Reads the `ip` query param from `searchParams`.

**Content (Hebrew, RTL, Tailwind):**
- Title: "הגישה חסומה"
- Message: "הגישה למערכת מכתובת IP זו אינה מורשית עבור הקבוצה שלך."
- Shows the user's IP address
- Contact admin suggestion: "אנא פנה למנהל המערכת לקבלת גישה"
- Back/Home link
- Style: consistent with existing app (white card, slate border, emerald accent — matching `/login` page palette)

---

## 6. API Routes

### `app/api/admin/groups/[id]/ip-restrictions/route.ts`

**GET** — Returns `{ patterns: GroupIpAllowlist[] }` for the group.
- Auth: admin or org_admin with ownership check (same pattern as existing `[id]/route.ts`)
- Uses `supabaseAdmin.from('group_ip_allowlist').select('*').eq('group_id', id).order('created_at')`

**POST** — Adds a new IP pattern.
- Body: `{ ip_pattern: string, description?: string }`
- Validates with `isValidIpPattern()` from `lib/utils/ip-utils.ts`
- Error on duplicate: catch postgres `23505` unique violation (add a unique constraint `UNIQUE(group_id, ip_pattern)` to the migration)
- Returns `{ pattern: GroupIpAllowlist }`

### `app/api/admin/groups/[id]/ip-restrictions/[patternId]/route.ts`

**DELETE** — Removes a single pattern by `patternId`.
- Auth: same admin ownership check
- Verifies the pattern belongs to the stated group_id before deleting (prevent IDOR)

### `app/api/admin/groups/[id]/route.ts` — PATCH handler

**PATCH** — Toggles `ip_restriction_enabled`.
- Body: `{ ip_restriction_enabled: boolean }`
- Uses `groupService.updateIpRestriction(id, enabled)`
- Auth: same pattern as existing PUT handler

---

## 7. GroupService additions (`lib/services/groupService.ts`)

Add method:

```typescript
async updateIpRestriction(id: string, enabled: boolean): Promise<Group> {
  const admin = this.getSupabaseAdmin();
  const { data, error } = await admin
    .from('groups')
    .update({ ip_restriction_enabled: enabled, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as Group;
}
```

Also update `CreateGroupData`, `UpdateGroupData`, and `GroupWithUserCount` interfaces to include `ip_restriction_enabled?: boolean`.

---

## 8. Admin UI Component (`app/components/GroupIpRestrictionManager.tsx`)

A client component rendered inside the existing group list item in `OrganizationGroupsManagement.tsx` (expand-on-click, collapsible panel).

**Props:**
```typescript
interface Props {
  groupId: string;
  groupName: string;
  ipRestrictionEnabled: boolean;
  onRestrictionToggled: () => void; // triggers fetchGroups() in parent
}
```

**State:**
- `patterns: GroupIpAllowlist[]`
- `loadingPatterns: boolean`
- `newPattern: string`
- `newDescription: string`
- `validationError: string | null`
- `saving: boolean`
- `expanded: boolean`

**Behaviour:**
1. On expand, fetch `GET /api/admin/groups/{id}/ip-restrictions`
2. Toggle switch calls `PATCH /api/admin/groups/{id}` with `{ ip_restriction_enabled }`, then calls `onRestrictionToggled()`
3. Add pattern: validates client-side with `isValidIpPattern()`, then `POST /api/admin/groups/{id}/ip-restrictions`
4. Delete pattern: `DELETE /api/admin/groups/{id}/ip-restrictions/{patternId}`

**Integration in `OrganizationGroupsManagement.tsx`:**
- `GroupWithUserCount` interface gets `ip_restriction_enabled: boolean` added
- In the groups list, below the existing name/badge row, render `<GroupIpRestrictionManager ... />`
- Pass `onRestrictionToggled={() => fetchGroups()}` to refresh after toggle

---

## 9. Validation — Frontend IP Pattern

`isValidIpPattern` from `lib/utils/ip-utils.ts` is imported directly into `GroupIpRestrictionManager.tsx` — no separate client-side file needed since `lib/utils/ip-utils.ts` contains no server-only imports.

---

## Risks & Caveats

1. **Middleware Edge Runtime limitation:** `lib/supabase-server.ts` and `lib/supabase.ts` (admin client) cannot be imported in `middleware.ts`. All DB access from the middleware must use plain `fetch()` against the Supabase REST API with the service role key. The REST endpoint is `${SUPABASE_URL}/rest/v1/{table}?select=...` with `Authorization: Bearer ${SERVICE_ROLE_KEY}` and `apikey: ${ANON_KEY}` headers.

2. **Performance:** Two to three REST calls per request for users in restricted groups. If traffic is high this will add latency. A `Cache-Control` or edge KV cache on the group settings (not the user session) would help but is out of scope.

3. **IPv6:** Not supported in this implementation — only IPv4. If IPv6 is needed in the future, the `ipToInt` logic needs a separate `ip6ToBytes` path. Document this.

4. **Proxy headers trust:** `x-forwarded-for` can be spoofed unless your deployment infrastructure strips/overwrites it. This is a deployment concern, not code. Document it.

5. **Admin bypass:** Admins are not exempt from IP restriction in this design — an admin logging in from a restricted IP would also be blocked. If this is undesired, add a role check (`profile.role === 'admin'`) before the IP check in the middleware.

6. **Supabase UNIQUE constraint:** The migration must include `UNIQUE (group_id, ip_pattern)` on `group_ip_allowlist` so that duplicate patterns for the same group are rejected at the DB level.

---

## Verification Steps

After implementation:

```bash
# TypeScript compilation
npm run build

# Unit tests (CIDR matching logic)
npm test

# Lint
npm run lint
```

Manual smoke test checklist:
- Admin adds IP restriction to a group, adds own IP → access works
- Admin adds IP restriction, does not add own IP → redirected to `/ip-blocked`
- Group with `ip_restriction_enabled=false` → no restriction regardless of allowlist
- User not in any group → no restriction
- `/ip-blocked` page renders correctly with user's IP shown
- CIDR range test: user IP `10.0.0.5`, pattern `10.0.0.0/24` → allowed
- CIDR range test: user IP `10.0.1.5`, pattern `10.0.0.0/24` → blocked
