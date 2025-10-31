import type { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api/errors';
import { createSupabaseRouteClient } from '@/lib/api/supabase';
import { requireOrg } from '@/lib/api/tenant';
import { RBAC } from '@/lib/rbac';
import { scanDocument } from '@/lib/edge/scanDocument';
import { notifyDocRejected } from '@/lib/notifications';

export async function POST(req: NextRequest, { params }: { params: { id: string, docId: string } }) {
  try {
    const { supabase, token } = createSupabaseRouteClient(req);
    if (!token) return jsonError(401, 'UNAUTHORIZED', 'Missing user session');
    const { orgId, role } = await requireOrg(req, supabase);
    if (!RBAC[role].documents.update) return jsonError(403, 'FORBIDDEN', 'Role cannot scan documents');

    const caseId = params.id;
    const docId = params.docId;

    // Load document and verify linkage
    const { data: doc, error: dErr } = await supabase
      .from('documents')
      .select('id, case_id, org_id, filename, mime, size, status, virus_scanned')
      .eq('id', docId)
      .eq('case_id', caseId)
      .eq('org_id', orgId)
      .maybeSingle();
    if (dErr) return jsonError(500, 'DB_ERROR', dErr.message);
    if (!doc) return jsonError(404, 'NOT_FOUND', 'Documento non trovato');

    const bodyRaw = await req.text();
    let force: 'APPROVED' | 'REJECTED' | undefined;
    try {
      const parsed = bodyRaw ? JSON.parse(bodyRaw) : {};
      if (parsed && (parsed.force === 'APPROVED' || parsed.force === 'REJECTED')) force = parsed.force;
    } catch {}

    const result = force ? { ok: force === 'APPROVED', reason: force === 'REJECTED' ? 'Forced reject' : undefined } : await scanDocument({ name: doc.filename, mime: doc.mime, size: doc.size });

    const newStatus = result.ok ? 'APPROVED' : 'REJECTED';
    const { data: updated, error: upErr } = await supabase
      .from('documents')
      .update({ status: newStatus, virus_scanned: true })
      .eq('id', docId)
      .eq('org_id', orgId)
      .select('id, status, virus_scanned')
      .maybeSingle();
    if (upErr) return jsonError(500, 'DB_ERROR', upErr.message);

    // Log event with scan outcome
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
      await supabase.from('case_events').insert({ case_id: caseId, actor_membership_id: actorId, type: 'DOC_UPLOAD', payload: { scan: newStatus, reason: result.reason ?? null } });
    } catch {}

    // Notify assignee if rejected
    if (newStatus === 'REJECTED') {
      const { data: kase } = await supabase
        .from('cases')
        .select('assigned_to')
        .eq('id', caseId)
        .eq('org_id', orgId)
        .maybeSingle();
      const assignee = (kase as any)?.assigned_to;
      if (assignee) {
        await notifyDocRejected(supabase, orgId, assignee, caseId, docId, result.reason);
      }
    }

    return jsonOk(updated);
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonError(500, 'INTERNAL_ERROR', 'Unexpected error');
  }
}