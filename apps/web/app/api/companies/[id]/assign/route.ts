import type { NextRequest } from 'next/server';
import { jsonError, jsonOk, handleZod } from '@/lib/api/errors';
import { createSupabaseRouteClient } from '@/lib/api/supabase';
import { requireOrg } from '@/lib/api/tenant';
import { UUID } from '@/lib/api/schemas';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, token } = createSupabaseRouteClient(req);
    if (!token) return jsonError(401, 'UNAUTHORIZED', 'Missing user session');
    const { orgId } = await requireOrg(req, supabase);

    const body = await req.json();
    const assigned_to = UUID.parse(body?.assigned_to);

    const { id } = await params;
    const companyId = id;

    // Ensure company exists in org
    const { data: company, error: cErr } = await supabase
      .from('companies')
      .select('id')
      .eq('id', companyId)
      .eq('org_id', orgId)
      .maybeSingle();
    if (cErr) return jsonError(500, 'DB_ERROR', cErr.message);
    if (!company) return jsonError(404, 'NOT_FOUND', 'Company not found');

    const { data: updated, error: uErr } = await supabase
      .from('companies')
      .update({ assigned_to })
      .eq('id', companyId)
      .eq('org_id', orgId)
      .select('id, assigned_to')
      .maybeSingle();
    if (uErr) return jsonError(500, 'DB_ERROR', uErr.message);

    // Record event with actor membership
    try {
      const { data: authInfo } = await supabase.auth.getUser();
      const uid = authInfo?.user?.id;
      let actorId: string | null = null;
      if (uid) {
        const { data: membership } = await supabase
          .from('memberships')
          .select('id')
          .eq('org_id', orgId)
          .eq('user_id', uid)
          .limit(1)
          .maybeSingle();
        actorId = membership?.id ?? null;
      }
      await supabase.from('company_events').insert({ company_id: companyId, org_id: orgId, actor_membership_id: actorId, type: 'ASSIGNMENT', payload: { assigned_to } });
    } catch {}

    return jsonOk(updated);
  } catch (err) {
    if (err instanceof Response) return err;
    return handleZod(err);
  }
}