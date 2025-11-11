import type { NextRequest } from 'next/server';
import { jsonError, jsonOk, handleZod } from '@/lib/api/errors';
import { createSupabaseRouteClient } from '@/lib/api/supabase';
import { requireOrg } from '@/lib/api/tenant';
import { AddEventRequestSchema } from '@/lib/api/schemas';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, token } = createSupabaseRouteClient(req);
    if (!token) return jsonError(401, 'UNAUTHORIZED', 'Missing user session');
    const { orgId } = await requireOrg(req, supabase);

    const body = await req.json();
    const parsed = AddEventRequestSchema.parse(body);

    const typeNorm = (parsed.type || '').toString().toUpperCase();
    const typeDb = typeNorm === 'COMMENT' ? 'COMMENT' : 'NOTE';

    const { id } = await params;
    const companyId = id;
    const { data: company, error: cErr } = await supabase
      .from('companies')
      .select('id')
      .eq('id', companyId)
      .eq('org_id', orgId)
      .maybeSingle();
    if (cErr) return jsonError(500, 'DB_ERROR', cErr.message);
    if (!company) return jsonError(404, 'NOT_FOUND', 'Company not found');

    const { data: authInfo } = await supabase.auth.getUser();
    const uid = authInfo?.user?.id;
    if (!uid) return jsonError(401, 'UNAUTHORIZED', 'Missing user');
    const { data: membership, error: memErr } = await supabase
      .from('memberships')
      .select('id')
      .eq('org_id', orgId)
      .eq('user_id', uid)
      .limit(1)
      .maybeSingle();
    if (memErr) return jsonError(500, 'DB_ERROR', memErr.message);
    const actorId = membership?.id ?? null;

    const { data: inserted, error: insErr } = await supabase
      .from('company_events')
      .insert({ company_id: companyId, org_id: orgId, actor_membership_id: actorId, type: typeDb, payload: { content: parsed.content } })
      .select('id, type, payload, created_at')
      .maybeSingle();
    if (insErr) return jsonError(500, 'DB_ERROR', insErr.message);
    return jsonOk({ id: inserted?.id, type: inserted?.type, content: (inserted?.payload?.content ?? ''), created_at: inserted?.created_at });
  } catch (err) {
    if (err instanceof Response) return err;
    return handleZod(err);
  }
}