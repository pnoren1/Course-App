"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { usePathname, useRouter } from "next/navigation";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session && pathname !== "/login") {
        router.push("/login");
      }
      setLoading(false);
    });
  }, [pathname, router]);

  if (loading) return null;
  return <>{children}</>;
}
