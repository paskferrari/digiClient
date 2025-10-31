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
    const { data, error } = await svc.from('organizations').select('id, name, type, created_at').order('created_at', { ascending: false }).limit(500);
    if (error) return jsonError(500, 'DB_ERROR', error.message);
    return jsonOk({ items: data ?? [], audit_org: orgId });
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonError(500, 'INTERNAL_ERROR', 'Unexpected error');
  }
}

export async function POST(req: NextRequest) {
  try {
    const { supabase, token } = createSupabaseRouteClient(req);
    if (!token) return jsonError(401, 'UNAUTHORIZED', 'Missing user session');
    const { orgId, userId } = await requirePlatformAdminWithMFA(req, supabase);

    const body = await req.json();
    const name = (body?.name || '').toString().trim();
    const type = (body?.type || '').toString();
    if (!name) return jsonError(400, 'VALIDATION_ERROR', 'Name required');
    if (!['association','platform','company'].includes(type)) return jsonError(400, 'VALIDATION_ERROR', 'Invalid type');

    const svc = createSupabaseServiceClient();
    const { data, error } = await svc.from('organizations').insert({ name, type }).select('id, name, type, created_at').maybeSingle();
    if (error) return jsonError(500, 'DB_ERROR', error.message);
    if (data) await logAudit(svc, { orgId, actorUserId: userId, action: 'admin_org_create', target_table: 'organizations', target_id: data.id, diff: { name, type } });
    return jsonOk(data, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonError(500, 'INTERNAL_ERROR', 'Unexpected error');
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { supabase, token } = createSupabaseRouteClient(req);
    if (!token) return jsonError(401, 'UNAUTHORIZED', 'Missing user session');
    const { orgId, userId } = await requirePlatformAdminWithMFA(req, supabase);

    const body = await req.json();
    const id = (body?.id || '').toString();
    const updates: any = {};
    if (typeof body?.name === 'string') updates.name = body.name.trim();
    if (typeof body?.type === 'string') {
      const t = body.type.toString();
      if (!['association','platform','company'].includes(t)) return jsonError(400, 'VALIDATION_ERROR', 'Invalid type');
      updates.type = t;
    }
    if (!id) return jsonError(400, 'VALIDATION_ERROR', 'id required');
    if (Object.keys(updates).length === 0) return jsonError(400, 'VALIDATION_ERROR', 'No updates');

    const svc = createSupabaseServiceClient();
    const { data, error } = await svc.from('organizations').update(updates).eq('id', id).select('id, name, type, created_at').maybeSingle();
    if (error) return jsonError(500, 'DB_ERROR', error.message);
    if (!data) return jsonError(404, 'NOT_FOUND', 'Organization not found');
    await logAudit(svc, { orgId, actorUserId: userId, action: 'admin_org_update', target_table: 'organizations', target_id: id, diff: updates });
    return jsonOk(data);
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonError(500, 'INTERNAL_ERROR', 'Unexpected error');
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { supabase, token } = createSupabaseRouteClient(req);
    if (!token) return jsonError(401, 'UNAUTHORIZED', 'Missing user session');
    const { orgId, userId } = await requirePlatformAdminWithMFA(req, supabase);

    const body = await req.json();
    const id = (body?.id || '').toString();
    if (!id) return jsonError(400, 'VALIDATION_ERROR', 'id required');

    const svc = createSupabaseServiceClient();
    const { data, error } = await svc.from('organizations').delete().eq('id', id).select('id').maybeSingle();
    if (error) return jsonError(500, 'DB_ERROR', error.message);
    if (!data) return jsonError(404, 'NOT_FOUND', 'Organization not found');
    await logAudit(svc, { orgId, actorUserId: userId, action: 'admin_org_delete', target_table: 'organizations', target_id: id });
    return jsonOk({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonError(500, 'INTERNAL_ERROR', 'Unexpected error');
  }
}