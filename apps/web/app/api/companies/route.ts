import type { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api/errors';
import { createSupabaseRouteClient } from '@/lib/api/supabase';
import { requireOrg } from '@/lib/api/tenant';

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  try {
    const { supabase, token } = createSupabaseRouteClient(req);
    if (!token) return jsonError(401, 'UNAUTHORIZED', 'Missing user session');
    const { orgId } = await requireOrg(req, supabase);

    const { searchParams } = new URL(req.url);
    const q = (searchParams.get('search') || '').trim();
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase.from('companies').select('*', { count: 'exact' }).eq('org_id', orgId);
    if (q) {
      const like = `%${q}%`;
      query = query.or(`legal_name.ilike.${like},vat_number.ilike.${like}`);
    }
    const { data, error, count } = await query.range(from, to);
    if (error) return jsonError(500, 'DB_ERROR', error.message);
    return jsonOk({ items: data ?? [], page, pageSize: PAGE_SIZE, total: count ?? 0 });
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonError(500, 'INTERNAL_ERROR', 'Unexpected error');
  }
}