import { createClient } from '@supabase/supabase-js';
import type { NextRequest } from 'next/server';

export function getAccessToken(req: NextRequest): string | null {
  const auth = req.headers.get('authorization');
  if (auth && auth.toLowerCase().startsWith('bearer ')) {
    return auth.slice(7);
  }
  const cookie = req.headers.get('cookie') || '';
  // Try common cookie names used by Supabase Auth helpers
  const m = cookie.match(/sb-access-token=([^;]+)/) || cookie.match(/sb:token=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function createSupabaseRouteClient(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Supabase env vars missing: NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY');
  }
  const token = getAccessToken(req);
  const supabase = createClient(url, key, {
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : undefined,
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return { supabase, token };
}

export function createSupabaseServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE;
  if (!url || !serviceKey) {
    throw new Error('Supabase service env vars missing: NEXT_PUBLIC_SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY');
  }
  // Service client bypasses RLS; do NOT expose service key client-side.
  const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  return supabase;
}