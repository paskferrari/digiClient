import type { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api/errors';
import { createSupabaseRouteClient, createSupabaseServiceClient } from '@/lib/api/supabase';
import { OrgHeaderSchema } from '@/lib/api/tenant';

function randVat(seed: string, i: number) {
  const base = [...seed].reduce((a, c) => (a * 33 + c.charCodeAt(0)) % 1000000000, 7);
  const num = (base + i * 12345).toString().padStart(11, '0');
  return `IT${num}`;
}

export async function POST(req: NextRequest) {
  try {
    let supabase: any, token: string | null;
    try {
      ({ supabase, token } = createSupabaseRouteClient(req));
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'Supabase configuration error';
      return jsonError(500, 'CONFIG_ERROR', msg);
    }
    if (!token) return jsonError(401, 'UNAUTHORIZED', 'Missing user session');

    // Validate org header locally to allow bootstrap of membership if missing
    const orgHeader = req.headers.get('x-org-id');
    const parsed = OrgHeaderSchema.safeParse({ orgId: orgHeader });
    if (!parsed.success) return jsonError(400, 'ORG_HEADER_INVALID', 'Missing or invalid x-org-id');
    const orgId = parsed.data.orgId;

    // Resolve current user's membership id
    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return jsonError(401, 'UNAUTHORIZED', 'Missing user');
    let role: 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER' | null = null;
    let membership: { id: string } | null = null;
    // Use service client to read memberships to avoid RLS recursion
    let svc: any;
    try {
      svc = createSupabaseServiceClient();
    } catch (e: any) {
      const msg = typeof e?.message === 'string' ? e.message : 'Supabase service configuration error';
      return jsonError(500, 'CONFIG_ERROR', msg);
    }
    const { data: memRow, error: memErr } = await svc
      .from('memberships')
      .select('id, role')
      .eq('org_id', orgId)
      .eq('user_id', uid)
      .maybeSingle();
    if (memErr) return jsonError(500, 'DB_ERROR', memErr.message);
    if (memRow) {
      membership = { id: memRow.id };
      role = memRow.role as any;
    } else {
      // Create membership via service client so the user can seed/demo
      const { data: ins, error: insErr } = await svc
        .from('memberships')
        .insert({ org_id: orgId, user_id: uid, role: 'MANAGER' })
        .select('id, role')
        .maybeSingle();
      if (insErr) return jsonError(500, 'DB_ERROR', insErr.message);
      if (!ins) return jsonError(500, 'DB_ERROR', 'Membership insert failed');
      membership = { id: ins.id };
      role = (ins as any).role as any ?? 'MANAGER';
    }

    const allowViewerSeed = (process.env.ALLOW_DEV_SEED_FOR_VIEWER === 'true') || (process.env.NODE_ENV !== 'production');
    if (role === 'VIEWER' && !allowViewerSeed) return jsonError(403, 'FORBIDDEN', 'Role cannot seed data');

    // Create a few companies
    const companiesPayload = Array.from({ length: 5 }).map((_, i) => ({
      org_id: orgId,
      vat_number: randVat(orgId, i + 1),
      legal_name: `Azienda Demo ${i + 1}`,
      ateco_code: `62.${(10 + i).toString().padStart(2, '0')}`,
      province: ['MI', 'RM', 'TO', 'BO', 'NA'][i % 5],
      created_by: membership!.id,
    }));
    const { data: companies, error: cErr } = await supabase
      .from('companies')
      .upsert(companiesPayload, { onConflict: 'org_id,vat_number', ignoreDuplicates: true })
      .select('id');
    if (cErr) return jsonError(500, 'DB_ERROR', cErr.message);

    // Create cases linked to companies
    const statuses = ['NEW','SCREENING','APPROVED','ASSIGNED','IN_PROGRESS','SUBMITTED'] as const;
    const casesPayload = (companies || []).slice(0, 5).map((c: any, i: number) => ({
      org_id: orgId,
      company_id: c.id,
      status: statuses[i % statuses.length],
      priority: ['LOW','MEDIUM','HIGH'][i % 3],
      created_by: membership!.id,
    }));
    const { data: cases, error: kErr } = await supabase
      .from('cases')
      .insert(casesPayload)
      .select('id');
    if (kErr) return jsonError(500, 'DB_ERROR', kErr.message);

    // Create tasks for first few cases
    const tasksPayload = (cases || []).slice(0, 5).map((k: any, i: number) => ({
      org_id: orgId,
      case_id: k.id,
      title: `Task demo ${i + 1}`,
      description: 'Esempio di attività',
      status: 'OPEN',
    }));
    const { error: tErr } = await supabase.from('tasks').insert(tasksPayload);
    if (tErr) return jsonError(500, 'DB_ERROR', tErr.message);

    return jsonOk({ companies: companies?.length || 0, cases: cases?.length || 0, tasks: tasksPayload.length }, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonError(500, 'INTERNAL_ERROR', 'Unexpected error');
  }
}