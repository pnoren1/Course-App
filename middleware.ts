// IP restriction enforcement is handled client-side in app/course/page.tsx
// via the /api/user/check-ip-access endpoint, because Supabase stores the
// session in localStorage (not cookies) and Edge Runtime cannot read it.

export function middleware() {
  // pass-through — no logic here
}

export const config = {
  matcher: [],
};
