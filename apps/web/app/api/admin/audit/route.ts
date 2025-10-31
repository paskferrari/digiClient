import type { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api/errors';
import { createSupabaseRouteClient, createSupabaseServiceClient } from '@/lib/api/supabase';
import { requirePlatformAdminWithMFA } from '@/lib/api/admin';

type AuditItem = {
  id: string;
  created_at: string;
  action: string;
  target_table: string | null;
  target_id: string | null;
  actor_user_id: string;
  diff: any;
  actor?: { id: string; email?: string | null; full_name?: string | null };
};

function applyFilters(
  query: any,
  filters: {
    orgId: string;
    action?: string;
    table?: string;
    user?: string;
    from?: string;
    to?: string;
    q?: string;
  }
) {
  let q = query.eq('org_id', filters.orgId);
  if (filters.action) q = q.eq('action', filters.action);
  if (filters.table) q = q.eq('target_table', filters.table);
  if (filters.user) q = q.eq('actor_user_id', filters.user);
  if (filters.from) q = q.gte('created_at', filters.from);
  if (filters.to) q = q.lte('created_at', filters.to);
  if (filters.q) {
    const term = filters.q.replace(/[%]/g, '');
    q = q.or(
      `action.ilike.%${term}%,target_table.ilike.%${term}%,target_id.ilike.%${term}%`
    );
  }
  return q;
}

export async function GET(req: NextRequest) {
  try {
    const { supabase, token } = createSupabaseRouteClient(req);
    if (!token) return jsonError(401, 'UNAUTHORIZED', 'Missing user session');
    const { orgId } = await requirePlatformAdminWithMFA(req, supabase);

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.min(200, Math.max(1, parseInt(searchParams.get('limit') || '50', 10)));
    const action = searchParams.get('action') || undefined;
    const table = searchParams.get('table') || undefined;
    const user = searchParams.get('user') || undefined;
    const from = searchParams.get('from') || undefined; // ISO date
    const to = searchParams.get('to') || undefined; // ISO date
    const q = searchParams.get('q') || undefined;

    const svc = createSupabaseServiceClient();
    const base = svc.from('audit_logs');

    // Count query
    const countQuery = applyFilters(base.select('*', { count: 'exact', head: true }), {
      orgId,
      action,
      table,
      user,
      from,
      to,
      q,
    });
    const { count, error: countErr } = await countQuery;
    if (countErr) return jsonError(500, 'DB_ERROR', countErr.message);

    // Data query with pagination
    const fromIdx = (page - 1) * limit;
    const toIdx = fromIdx + limit - 1;
    let dataQuery = applyFilters(
      base
        .select('id, created_at, action, target_table, target_id, actor_user_id, diff, actor:profiles!audit_logs_actor_user_id_fkey(id,email,full_name)')
        .order('created_at', { ascending: false })
        .range(fromIdx, toIdx),
      { orgId, action, table, user, from, to, q }
    );

    const { data, error } = await dataQuery;
    if (error) return jsonError(500, 'DB_ERROR', error.message);
    const items: AuditItem[] = (data || []) as any;
    return jsonOk({ items, page, limit, total: count || 0 });
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonError(500, 'INTERNAL_ERROR', 'Unexpected error');
  }
}