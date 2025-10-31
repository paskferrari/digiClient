"use client";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabaseReal = url && key ? createClient(url, key) : null;

export const supabase: any = supabaseReal ?? {
  auth: {
    async getSession() {
      return { data: { session: null } } as any;
    },
    async signInWithPassword(_: any) {
      return { error: { message: "Supabase non configurato" } } as any;
    },
    async signInWithOtp(_: any) {
      return { error: { message: "Supabase non configurato" } } as any;
    },
  },
};

export async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}