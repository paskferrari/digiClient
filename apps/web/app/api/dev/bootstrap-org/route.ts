import type { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api/errors';
import { createSupabaseRouteClient, createSupabaseServiceClient } from '@/lib/api/supabase';

export async function POST(req: NextRequest) {
  try {
    const { supabase, token } = createSupabaseRouteClient(req);
    if (!token) return jsonError(401, 'UNAUTHORIZED', 'Missing user session');

    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return jsonError(401, 'UNAUTHORIZED', 'Missing user');

    let svc: any;
    try {
      svc = createSupabaseServiceClient();
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'Supabase service configuration error';
      return jsonError(500, 'CONFIG_ERROR', msg);
    }

    // Create organization
    const name = 'Organizzazione Demo';
    const { data: org, error: orgErr } = await svc
      .from('organizations')
      .insert({ name, type: 'association' })
      .select('id')
      .maybeSingle();
    if (orgErr) return jsonError(500, 'DB_ERROR', orgErr.message);
    if (!org) return jsonError(500, 'DB_ERROR', 'Organization creation failed');

    // Ensure profile exists (profiles table references auth.users)
    // Insert profile if missing
    const { data: prof, error: profErr } = await svc
      .from('profiles')
      .select('id')
      .eq('id', uid)
      .maybeSingle();
    if (profErr) return jsonError(500, 'DB_ERROR', profErr.message);
    if (!prof) {
      const email = auth?.user?.email || `${uid}@example.local`;
      const full_name = auth?.user?.user_metadata?.full_name || auth?.user?.user_metadata?.name || null;
      const { error: insProfErr } = await svc
        .from('profiles')
        .insert({ id: uid, email, full_name });
      if (insProfErr) return jsonError(500, 'DB_ERROR', insProfErr.message);
    }

    // Add membership for current user as MANAGER
    const { data: mem, error: memErr } = await svc
      .from('memberships')
      .insert({ org_id: org.id, user_id: uid, role: 'MANAGER' })
      .select('id')
      .maybeSingle();
    if (memErr) return jsonError(500, 'DB_ERROR', memErr.message);
    if (!mem) return jsonError(500, 'DB_ERROR', 'Membership creation failed');

    return jsonOk({ org_id: org.id, role: 'MANAGER' }, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonError(500, 'INTERNAL_ERROR', 'Unexpected error');
  }
}