import type { NextRequest } from 'next/server';
import { jsonError, jsonOk, handleZod } from '@/lib/api/errors';
import { createSupabaseRouteClient } from '@/lib/api/supabase';
import { requireOrg } from '@/lib/api/tenant';
import { AssignCaseRequestSchema } from '@/lib/api/schemas';
import { RBAC } from '@/lib/rbac';
import { notifyAssignment } from '@/lib/notifications';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, token } = createSupabaseRouteClient(req);
    if (!token) return jsonError(401, 'UNAUTHORIZED', 'Missing user session');
    const { orgId, role } = await requireOrg(req, supabase);
    if (!RBAC[role].cases.assign) return jsonError(403, 'FORBIDDEN', 'Role cannot assign cases');

    const body = await req.json();
    const parsed = AssignCaseRequestSchema.parse(body);

    // ensure assignee is a member of org
    const { data: member, error: memErr } = await supabase
      .from('memberships')
      .select('user_id')
      .eq('org_id', orgId)
      .eq('user_id', parsed.assigned_to)
      .maybeSingle();
    if (memErr) return jsonError(500, 'DB_ERROR', memErr.message);
    if (!member) return jsonError(404, 'NOT_FOUND', 'Assignee not found in org');

    const { id } = await params;
    const caseId = id;
    const { data: updated, error: upErr } = await supabase
      .from('cases')
      .update({ assigned_to: parsed.assigned_to })
      .eq('id', caseId)
      .eq('org_id', orgId)
      .select('id, assigned_to')
      .maybeSingle();
    if (upErr) return jsonError(500, 'DB_ERROR', upErr.message);
    if (!updated) return jsonError(404, 'NOT_FOUND', 'Case not found');

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
      await supabase.from('case_events').insert({ case_id: caseId, actor_membership_id: actorId, type: 'ASSIGNMENT', payload: { assigned_to: parsed.assigned_to } });
    } catch {}

    // Email + audit
    await notifyAssignment(supabase, orgId, parsed.assigned_to, caseId);

    return jsonOk(updated);
  } catch (err) {
    if (err instanceof Response) return err;
    return handleZod(err);
  }
}