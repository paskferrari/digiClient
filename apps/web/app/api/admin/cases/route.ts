import type { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api/errors';
import { createSupabaseRouteClient, createSupabaseServiceClient } from '@/lib/api/supabase';
import { requirePlatformAdminWithMFA } from '@/lib/api/admin';
import { logAudit } from '@/lib/audit';

export async function GET(req: NextRequest) {
  try {
    const { supabase, token } = createSupabaseRouteClient(req);
    if (!token) return jsonError(401, 'UNAUTHORIZED', 'Missing user session');
    const { orgId } = await requirePlatformAdminWithMFA(req, supabase);

    const svc = createSupabaseServiceClient();
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    let query = svc.from('cases').select('id, title, status, type, org_id, assigned_to, created_at').order('created_at', { ascending: false }).limit(500);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) return jsonError(500, 'DB_ERROR', error.message);
    const items = (data || []).map((c: any) => ({ id: c.id, title: c.title, status: c.status, type: c.type, assigned_org_id: c.org_id }));
    return jsonOk({ items, audit_org: orgId });
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonError(500, 'INTERNAL_ERROR', 'Unexpected error');
  }
}

// Reassign case to a different organization
export async function POST(req: NextRequest) {
  try {
    const { supabase, token } = createSupabaseRouteClient(req);
    if (!token) return jsonError(401, 'UNAUTHORIZED', 'Missing user session');
    const { orgId, userId } = await requirePlatformAdminWithMFA(req, supabase);

    const body = await req.json();
    const caseId = (body?.caseId || '').toString();
    const targetOrgId = (body?.targetOrgId || '').toString();
    if (!caseId || !targetOrgId) return jsonError(400, 'VALIDATION_ERROR', 'caseId and targetOrgId required');

    const svc = createSupabaseServiceClient();
    const { data: updated, error } = await svc
      .from('cases')
      .update({ org_id: targetOrgId, assigned_to: null })
      .eq('id', caseId)
      .select('id, org_id, status, type')
      .maybeSingle();
    if (error) return jsonError(500, 'DB_ERROR', error.message);
    if (!updated) return jsonError(404, 'NOT_FOUND', 'Case not found');

    // Record case event and audit
    await svc.from('case_events').insert({ case_id: caseId, event_type: 'ASSIGNMENT', payload: { reassigned_to_org_id: targetOrgId }, org_id: targetOrgId });
    await logAudit(svc, { orgId, actorUserId: userId, action: 'admin_case_reassign', target_table: 'cases', target_id: caseId, diff: { targetOrgId } });
    return jsonOk(updated);
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonError(500, 'INTERNAL_ERROR', 'Unexpected error');
  }
}