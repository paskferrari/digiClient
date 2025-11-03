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

    // Normalize type to match DB enum (NOTE|COMMENT)
    const typeNorm = (parsed.type || '').toString().toUpperCase();
    const typeDb = typeNorm === 'COMMENT' ? 'COMMENT' : 'NOTE';

    const { id } = await params;
    const caseId = id;
    const { data: kase, error: caseErr } = await supabase
      .from('cases')
      .select('id')
      .eq('id', caseId)
      .eq('org_id', orgId)
      .maybeSingle();
    if (caseErr) return jsonError(500, 'DB_ERROR', caseErr.message);
    if (!kase) return jsonError(404, 'NOT_FOUND', 'Case not found');

    // Resolve current user's membership id for actor_membership_id
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
    if (!membership) return jsonError(403, 'ORG_ACCESS_DENIED', 'User not in org');

    const { data: ev, error: evErr } = await supabase
      .from('case_events')
      .insert({ case_id: caseId, actor_membership_id: membership.id, type: typeDb, payload: { content: parsed.content } })
      .select('id, type, payload')
      .maybeSingle();
    if (evErr) return jsonError(500, 'DB_ERROR', evErr.message);

    return jsonOk({ id: ev!.id, type: ev!.type, content: (typeof ev!.payload === 'string' ? ev!.payload : (ev!.payload?.content ?? '')) }, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    return handleZod(err);
  }
}