import type { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api/errors';
import { createSupabaseRouteClient, createSupabaseServiceClient } from '@/lib/api/supabase';
import { requirePlatformAdminWithMFA } from '@/lib/api/admin';

export async function GET(req: NextRequest) {
  try {
    const { supabase, token } = createSupabaseRouteClient(req);
    if (!token) return jsonError(401, 'UNAUTHORIZED', 'Missing user session');
    const { orgId } = await requirePlatformAdminWithMFA(req, supabase);

    const svc = createSupabaseServiceClient();

    // Distinct actions (Supabase JS non supporta l'opzione 'distinct' tipizzata):
    // selezioniamo e deduplifichiamo lato applicazione
    const { data: actionsData, error: actionsErr } = await svc
      .from('audit_logs')
      .select('action')
      .eq('org_id', orgId)
      .not('action', 'is', null)
      .order('action');
    if (actionsErr) return jsonError(500, 'DB_ERROR', actionsErr.message);
    const actions = Array.from(new Set(((actionsData || []).map((r: any) => r.action).filter(Boolean))));

    // Distinct target tables (dedup lato applicazione)
    const { data: tablesData, error: tablesErr } = await svc
      .from('audit_logs')
      .select('target_table')
      .eq('org_id', orgId)
      .not('target_table', 'is', null)
      .order('target_table');
    if (tablesErr) return jsonError(500, 'DB_ERROR', tablesErr.message);
    const tables = Array.from(new Set(((tablesData || []).map((r: any) => r.target_table).filter(Boolean))));

    // Distinct actors then hydrate minimal profile info (dedup lato applicazione)
    const { data: actorsData, error: actorsErr } = await svc
      .from('audit_logs')
      .select('actor_user_id')
      .eq('org_id', orgId)
      .not('actor_user_id', 'is', null)
      .limit(500);
    if (actorsErr) return jsonError(500, 'DB_ERROR', actorsErr.message);
    const actorIds = Array.from(new Set((actorsData || []).map((r: any) => r.actor_user_id).filter(Boolean)));

    let users: { id: string; email?: string | null; full_name?: string | null }[] = [];
    if (actorIds.length > 0) {
      const { data: profiles, error: profErr } = await svc
        .from('profiles')
        .select('id, email, full_name')
        .in('id', actorIds);
      if (profErr) return jsonError(500, 'DB_ERROR', profErr.message);
      users = (profiles || []) as any[];
    }

    return jsonOk({ actions, tables, users });
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonError(500, 'INTERNAL_ERROR', 'Unexpected error');
  }
}