"use client";
import { useEffect } from "react";
import { supabase } from "../lib/supabaseClient";
import { useRouter } from "next/navigation";

export function IdleTimeout({ minutes = 15 }: { minutes?: number }) {
  const router = useRouter();
  useEffect(() => {
    let last = Date.now();
    const reset = () => { last = Date.now(); };
    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"] as const;
    events.forEach((ev) => window.addEventListener(ev, reset));
    const interval = setInterval(async () => {
      if (Date.now() - last > minutes * 60 * 1000) {
        try { await supabase.auth.signOut(); } catch {}
        router.push("/");
      }
    }, 30000);
    return () => {
      events.forEach((ev) => window.removeEventListener(ev, reset));
      clearInterval(interval);
    };
  }, [minutes, router]);
  return null;
}