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
      .select('id, org_id, role, profiles:profiles(id, email, full_name), organizations:organizations(id, name), created_at')
      .limit(1000);
    if (error) return jsonError(500, 'DB_ERROR', error.message);
    const items = (data || []).map((m: any) => ({ id: m.id, org_id: m.org_id, org_name: m.organizations?.name ?? null, role: m.role, email: m.profiles?.email ?? '', full_name: m.profiles?.full_name ?? null }));
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
    const password = (body?.password || '').toString();
    const full_name = (body?.full_name || body?.name || '').toString().trim() || null;
    const role = (body?.role || '').toString();
    const targetOrgId = (body?.org_id || '').toString() || orgId;
    if (!email) return jsonError(400, 'VALIDATION_ERROR', 'Email required');
    if (!password || password.length < 8) return jsonError(400, 'VALIDATION_ERROR', 'Password must be at least 8 characters');
    if (!['ADMIN','MANAGER','OPERATOR','VIEWER'].includes(role)) return jsonError(400, 'VALIDATION_ERROR', 'Invalid role');

    const svc = createSupabaseServiceClient();

    // 1) Crea l'utente in Supabase Auth (email confermata)
    const { data: created, error: createErr } = await (svc as any).auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: full_name ? { full_name } : undefined,
    });

    let newUserId: string | null = created?.user?.id ?? null;

    // Se l'utente esiste già, procedi con membership; altrimenti errore diverso
    if (createErr && !newUserId) {
      // Prova a risolvere l'ID via profili esistenti
      const { data: existingProfile, error: profErr } = await svc
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();
      if (profErr) return jsonError(500, 'DB_ERROR', profErr.message);
      if (!existingProfile) {
        // Non possiamo proseguire se non troviamo l'utente.
        return jsonError(409, 'USER_EXISTS', createErr.message || 'User already exists');
      }
      newUserId = existingProfile.id as string;
    }

    // 2) Inserisci profilo se non esiste
    if (newUserId) {
      const { error: profileErr } = await svc
        .from('profiles')
        .upsert({ id: newUserId, email, full_name: full_name || undefined }, { onConflict: 'id' });
      if (profileErr) return jsonError(500, 'DB_ERROR', profileErr.message);
    }

    // 3) Crea membership nell'organizzazione target
    const { data: membership, error: memErr } = await svc
      .from('memberships')
      .insert({ org_id: targetOrgId, user_id: newUserId, role })
      .select('id, org_id, role')
      .maybeSingle();
    if (memErr) return jsonError(500, 'DB_ERROR', memErr.message);

    // 4) Audit
    await logAudit(svc, {
      orgId,
      actorUserId: userId,
      action: 'admin_user_create',
      target_table: 'memberships',
      target_id: membership?.id,
      diff: { email, role, org_id: targetOrgId },
    });

    return jsonOk({
      user_id: newUserId,
      membership,
    }, 201);
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
    if (!['ADMIN','MANAGER','OPERATOR','VIEWER'].includes(role)) return jsonError(400, 'VALIDATION_ERROR', 'Invalid role');

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