import type { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api/errors';
import { createSupabaseRouteClient, createSupabaseServiceClient } from '@/lib/api/supabase';
// import { requireOrg } from '@/lib/api/tenant';

export async function GET(req: NextRequest) {
  try {
    let supabase: any, token: string | null;
    try {
      ({ supabase, token } = createSupabaseRouteClient(req));
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'Supabase configuration error';
      return jsonError(500, 'CONFIG_ERROR', msg);
    }
    if (!token) return jsonError(401, 'UNAUTHORIZED', 'Missing user session');

    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return jsonError(401, 'UNAUTHORIZED', 'Missing user');

    // Read memberships via service client to avoid recursive RLS policy on memberships
    let svc: any;
    try {
      svc = createSupabaseServiceClient();
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'Supabase service configuration error';
      return jsonError(500, 'CONFIG_ERROR', msg);
    }

    const [{ data: profile, error: pErr }, { data: memberships, error: mErr }] = await Promise.all([
      svc.from('profiles').select('id, email, full_name').eq('id', uid).limit(1).maybeSingle(),
      svc.from('memberships').select('org_id, role').eq('user_id', uid),
    ]);
    if (pErr || mErr) return jsonError(500, 'DB_ERROR', (pErr || mErr)!.message);

    // Enrich memberships with organization names
    let enrichedMemberships = memberships ?? [];
    try {
      const orgIds = (memberships ?? []).map((m: any) => m.org_id);
      if (orgIds.length > 0) {
        const { data: orgs, error: oErr } = await svc
          .from('organizations')
          .select('id, name')
          .in('id', orgIds);
        if (oErr) throw oErr;
        const nameById = Object.fromEntries((orgs ?? []).map((o: any) => [o.id, o.name]));
        enrichedMemberships = (memberships ?? []).map((m: any) => ({ ...m, org_name: nameById[m.org_id] ?? null }));
      }
    } catch (e: any) {
      // If enrichment fails, continue with bare memberships
      enrichedMemberships = memberships ?? [];
    }

    const headerOrgId = req.headers.get('x-org-id');
    const roleFromHeader = headerOrgId ? (enrichedMemberships ?? []).find((m: any) => m.org_id === headerOrgId)?.role ?? null : null;
    const fallback = (enrichedMemberships ?? [])[0] || null;
    const currentOrg = headerOrgId && roleFromHeader
      ? { org_id: headerOrgId, role: roleFromHeader }
      : (fallback ? { org_id: fallback.org_id, role: fallback.role } : undefined);

    return jsonOk({ profile, memberships: enrichedMemberships, currentOrg });
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonError(500, 'INTERNAL_ERROR', 'Unexpected error');
  }
}