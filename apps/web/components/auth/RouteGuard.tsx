"use client";
import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "../../lib/supabaseClient";

const PUBLIC_PATHS = [
  "/",
  "/healthz",
];

function isPublic(pathname: string): boolean {
  if (!pathname) return true;
  if (PUBLIC_PATHS.includes(pathname)) return true;
  if (pathname.startsWith("/favicon") || pathname.startsWith("/robots") || pathname.startsWith("/manifest")) return true;
  // static assets
  if (pathname.startsWith("/_next") || pathname.startsWith("/assets") || /\.[\w]+$/.test(pathname)) return true;
  return false;
}

export function RouteGuard() {
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    async function check() {
      if (isPublic(pathname || "/")) return;
      const { data } = await supabase.auth.getSession();
      const hasSession = !!data?.session;
      if (!hasSession && !cancelled) {
        // usare replace per non sporcare la history
        router.replace("/");
      }
    }
    check();

    // opzionale: reagire ai cambi di stato auth
    const { data: sub } = supabase.auth.onAuthStateChange(() => {
      if (isPublic(pathname || "/")) return;
      check();
    }) as any;
    return () => { cancelled = true; sub?.subscription?.unsubscribe?.(); };
  }, [pathname, router]);

  return null;
}