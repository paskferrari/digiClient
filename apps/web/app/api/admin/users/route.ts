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
    const { data, error } = await svc
      .from('memberships')
      .select('id, org_id, role, profiles:profiles(id, email, full_name), created_at')
      .limit(1000);
    if (error) return jsonError(500, 'DB_ERROR', error.message);
    const items = (data || []).map((m: any) => ({ id: m.id, org_id: m.org_id, role: m.role, email: m.profiles?.email ?? '', full_name: m.profiles?.full_name ?? null }));
    return jsonOk({ items, audit_org: orgId });
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonError(500, 'INTERNAL_ERROR', 'Unexpected error');
  }
}

// Invite sub-user to an org via memberships/invitations
export async function POST(req: NextRequest) {
  try {
    const { supabase, token } = createSupabaseRouteClient(req);
    if (!token) return jsonError(401, 'UNAUTHORIZED', 'Missing user session');
    const { orgId, userId } = await requirePlatformAdminWithMFA(req, supabase);

    const body = await req.json();
    const email = (body?.email || '').toString().trim().toLowerCase();
    const role = (body?.role || '').toString();
    const targetOrgId = (body?.org_id || '').toString();
    if (!email) return jsonError(400, 'VALIDATION_ERROR', 'Email required');
    if (!['ADMIN','MANAGER','STAFF','VIEWER'].includes(role)) return jsonError(400, 'VALIDATION_ERROR', 'Invalid role');

    const svc = createSupabaseServiceClient();
    // Find inviter membership id in current platform org
    const { data: inviter, error: memErr } = await svc
      .from('memberships')
      .select('id')
      .eq('org_id', orgId)
      .eq('user_id', userId)
      .maybeSingle();
    if (memErr) return jsonError(500, 'DB_ERROR', memErr.message);
    if (!inviter) return jsonError(403, 'FORBIDDEN', 'Inviter membership not found');

    const { data, error } = await svc
      .from('invitations')
      .insert({ org_id: targetOrgId || orgId, invited_by: inviter.id, invitee_email: email, role })
      .select('id, org_id, invitee_email, role, created_at')
      .maybeSingle();
    if (error) return jsonError(500, 'DB_ERROR', error.message);
    if (data) await logAudit(svc, { orgId, actorUserId: userId, action: 'admin_user_invite', target_table: 'invitations', target_id: data.id, diff: { email, role, org_id: targetOrgId || orgId } });
    return jsonOk(data, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonError(500, 'INTERNAL_ERROR', 'Unexpected error');
  }
}

// Update membership role
export async function PATCH(req: NextRequest) {
  try {
    const { supabase, token } = createSupabaseRouteClient(req);
    if (!token) return jsonError(401, 'UNAUTHORIZED', 'Missing user session');
    const { orgId, userId } = await requirePlatformAdminWithMFA(req, supabase);

    const body = await req.json();
    const membershipId = (body?.membership_id || body?.membershipId || '').toString();
    const role = (body?.role || '').toString();
    if (!membershipId) return jsonError(400, 'VALIDATION_ERROR', 'membershipId required');
    if (!['ADMIN','MANAGER','STAFF','VIEWER'].includes(role)) return jsonError(400, 'VALIDATION_ERROR', 'Invalid role');

    const svc = createSupabaseServiceClient();
    const { data, error } = await svc
      .from('memberships')
      .update({ role })
      .eq('id', membershipId)
      .select('id, org_id, role')
      .maybeSingle();
    if (error) return jsonError(500, 'DB_ERROR', error.message);
    if (!data) return jsonError(404, 'NOT_FOUND', 'Membership not found');
    await logAudit(svc, { orgId, actorUserId: userId, action: 'admin_membership_update', target_table: 'memberships', target_id: membershipId, diff: { role } });
    return jsonOk(data);
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonError(500, 'INTERNAL_ERROR', 'Unexpected error');
  }
}

// Delete membership (remove sub-user)
export async function DELETE(req: NextRequest) {
  try {
    const { supabase, token } = createSupabaseRouteClient(req);
    if (!token) return jsonError(401, 'UNAUTHORIZED', 'Missing user session');
    const { orgId, userId } = await requirePlatformAdminWithMFA(req, supabase);

    const body = await req.json();
    const membershipId = (body?.membership_id || body?.membershipId || '').toString();
    if (!membershipId) return jsonError(400, 'VALIDATION_ERROR', 'membershipId required');

    const svc = createSupabaseServiceClient();
    const { data, error } = await svc
      .from('memberships')
      .delete()
      .eq('id', membershipId)
      .select('id')
      .maybeSingle();
    if (error) return jsonError(500, 'DB_ERROR', error.message);
    if (!data) return jsonError(404, 'NOT_FOUND', 'Membership not found');
    await logAudit(svc, { orgId, actorUserId: userId, action: 'admin_membership_delete', target_table: 'memberships', target_id: membershipId });
    return jsonOk({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonError(500, 'INTERNAL_ERROR', 'Unexpected error');
  }
}