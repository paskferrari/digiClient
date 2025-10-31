import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { jsonError, jsonOk, handleZod } from '@/lib/api/errors';
import { createSupabaseRouteClient, createSupabaseServiceClient } from '@/lib/api/supabase';
import { requireOrg } from '@/lib/api/tenant';
import { logAudit } from '@/lib/audit';

const ChannelPrefsSchema = z.object({ email: z.boolean().optional(), inapp: z.boolean().optional() });
const NotificationPrefsSchema = z.object({
  assignment: ChannelPrefsSchema.optional(),
  status_change: ChannelPrefsSchema.optional(),
  doc_rejected: ChannelPrefsSchema.optional(),
  task_due: ChannelPrefsSchema.optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { supabase, token } = createSupabaseRouteClient(req);
    if (!token) return jsonError(401, 'UNAUTHORIZED', 'Missing user session');
    const { orgId } = await requireOrg(req, supabase);

    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return jsonError(401, 'UNAUTHORIZED', 'Missing user');

    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('org_id', orgId)
      .eq('key', 'notifications_prefs')
      .maybeSingle();
    if (error) return jsonError(500, 'DB_ERROR', error.message);

    const defaults = { assignment: { email: true, inapp: true }, status_change: { email: true, inapp: true }, doc_rejected: { email: true, inapp: true }, task_due: { email: true, inapp: true } };
    let prefs = defaults;
    if (data?.value) {
      try {
        const map = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
        prefs = { ...defaults, ...(map?.[uid] || {}) };
      } catch {}
    }
    return jsonOk(prefs);
  } catch (err) {
    if (err instanceof Response) return err;
    return handleZod(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { supabase, token } = createSupabaseRouteClient(req);
    if (!token) return jsonError(401, 'UNAUTHORIZED', 'Missing user session');
    const { orgId } = await requireOrg(req, supabase);

    const body = await req.json();
    const parsed = NotificationPrefsSchema.parse(body);

    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return jsonError(401, 'UNAUTHORIZED', 'Missing user');

    const svc = createSupabaseServiceClient();

    // load existing map
    const { data: existing } = await svc
      .from('settings')
      .select('id, value')
      .eq('org_id', orgId)
      .eq('key', 'notifications_prefs')
      .maybeSingle();

    let map: Record<string, any> = {};
    if (existing?.value) {
      try { map = typeof existing.value === 'string' ? JSON.parse(existing.value) : existing.value; } catch {}
    }
    map[uid] = { ...(map[uid] || {}), ...parsed };

    const payload = { org_id: orgId, key: 'notifications_prefs', value: JSON.stringify(map) } as any;
    if (existing?.id) {
      const { error: upErr } = await svc.from('settings').update({ value: payload.value }).eq('id', existing.id);
      if (upErr) return jsonError(500, 'DB_ERROR', upErr.message);
    } else {
      const { error: insErr } = await svc.from('settings').insert(payload);
      if (insErr) return jsonError(500, 'DB_ERROR', insErr.message);
    }

    await logAudit(svc as any, { orgId, actorUserId: uid, action: 'preferences_update', target_table: 'settings', target_id: 'notifications_prefs', diff: parsed });

    return jsonOk({ ok: true });
  } catch (err) {
    if (err instanceof Response) return err;
    return handleZod(err);
  }
}