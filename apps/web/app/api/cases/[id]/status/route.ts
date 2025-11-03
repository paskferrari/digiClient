import type { NextRequest } from 'next/server';
import { jsonError, jsonOk, handleZod } from '@/lib/api/errors';
import { createSupabaseRouteClient } from '@/lib/api/supabase';
import { requireOrg } from '@/lib/api/tenant';
import { UpdateCaseStatusRequestSchema } from '@/lib/api/schemas';
import { assertTransition } from '@/lib/rbac';
import { notifyStatusChange } from '@/lib/notifications';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, token } = createSupabaseRouteClient(req);
    if (!token) return jsonError(401, 'UNAUTHORIZED', 'Missing user session');
    const { orgId, role } = await requireOrg(req, supabase);

    const body = await req.json();
    const parsed = UpdateCaseStatusRequestSchema.parse(body);

    const { id } = await params;
    const caseId = id;
    const { data: kase, error: caseErr } = await supabase
      .from('cases')
      .select('id, status, assigned_to')
      .eq('id', caseId)
      .eq('org_id', orgId)
      .maybeSingle();
    if (caseErr) return jsonError(500, 'DB_ERROR', caseErr.message);
    if (!kase) return jsonError(404, 'NOT_FOUND', 'Case not found');

    // Validate transition by role
    try {
      assertTransition(role, kase.status as any, parsed.to as any);
    } catch (e: any) {
      return jsonError(403, 'TRANSITION_FORBIDDEN', e.message);
    }

    // Block submission if required docs missing
    if (parsed.to === 'SUBMITTED') {
      let requiredKinds: string[] = ['ID'];
      const { data: setting } = await supabase
        .from('settings')
        .select('value')
        .eq('org_id', orgId)
        .eq('key', 'required_docs')
        .maybeSingle();
      if (setting?.value && Array.isArray(setting.value)) {
        requiredKinds = setting.value.filter((k: any) => typeof k === 'string');
      }
      if (requiredKinds.length > 0) {
        const { data: approved, error: dErr } = await supabase
          .from('documents')
          .select('kind, status')
          .eq('case_id', caseId)
          .eq('org_id', orgId)
          .eq('status', 'APPROVED');
        if (dErr) return jsonError(500, 'DB_ERROR', dErr.message);
        const have = new Set((approved || []).map((d: any) => d.kind));
        const missing = requiredKinds.filter((k) => !have.has(k));
        if (missing.length > 0) {
          return jsonError(400, 'DOCS_REQUIRED_MISSING', `Mancano documenti approvati: ${missing.join(', ')}`);
        }
      }
    }

    const { data: updated, error: upErr } = await supabase
      .from('cases')
      .update({ status: parsed.to })
      .eq('id', caseId)
      .select('id, status')
      .maybeSingle();
    if (upErr) return jsonError(500, 'DB_ERROR', upErr.message);

    // Log event with actor and JSON payload
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
      await supabase.from('case_events').insert({ case_id: caseId, actor_membership_id: actorId, type: 'STATUS_CHANGE', payload: { from: kase.status, to: parsed.to } });
    } catch {}

    // Email + audit to current assignee if present
    if (kase.assigned_to) {
      await notifyStatusChange(supabase, orgId, kase.assigned_to, caseId, kase.status, parsed.to);
    }

    return jsonOk(updated);
  } catch (err) {
    if (err instanceof Response) return err;
    return handleZod(err);
  }
}