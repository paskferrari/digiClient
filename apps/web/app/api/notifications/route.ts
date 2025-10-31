import type { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api/errors';
import { createSupabaseRouteClient, createSupabaseServiceClient } from '@/lib/api/supabase';
import { requireOrg } from '@/lib/api/tenant';

export async function GET(req: NextRequest) {
  try {
    const { supabase, token } = createSupabaseRouteClient(req);
    if (!token) return jsonError(401, 'UNAUTHORIZED', 'Missing user session');
    const { orgId } = await requireOrg(req, supabase);

    const { data: auth } = await supabase.auth.getUser();
    const uid = auth?.user?.id;
    if (!uid) return jsonError(401, 'UNAUTHORIZED', 'Missing user');

    // Use service client to ensure we can read audit logs even if RLS restricts
    const svc = createSupabaseServiceClient();
    const { data, error } = await svc
      .from('audit_logs')
      .select('id, action, target_table, target_id, diff, created_at')
      .eq('org_id', orgId)
      .eq('action', 'notification_sent')
      .eq('actor_user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50);
    if (error) return jsonError(500, 'DB_ERROR', error.message);

    return jsonOk({ items: data ?? [] });
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonError(500, 'INTERNAL_ERROR', 'Unexpected error');
  }
}