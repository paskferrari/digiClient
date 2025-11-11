import type { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api/errors';
import { createSupabaseRouteClient } from '@/lib/api/supabase';
import { requireOrg } from '@/lib/api/tenant';

// Next.js 15 requires awaiting `params` in dynamic API routes
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, token } = createSupabaseRouteClient(req);
    if (!token) return jsonError(401, 'UNAUTHORIZED', 'Missing user session');
    const { orgId } = await requireOrg(req, supabase);

    const { id } = await params;
    const companyId = id;
    const { data: company, error: cErr } = await supabase
      .from('companies')
      .select('id, org_id, legal_name, vat_number, status, assigned_to, created_at, updated_at')
      .eq('id', companyId)
      .eq('org_id', orgId)
      .maybeSingle();
    if (cErr) return jsonError(500, 'DB_ERROR', cErr.message);
    if (!company) return jsonError(404, 'NOT_FOUND', 'Company not found');

    const { data: events, error: eErr } = await supabase
      .from('company_events')
      .select('id, type, payload, created_at')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });
    if (eErr) return jsonError(500, 'DB_ERROR', eErr.message);

    const evs = (events ?? []).map((e: any) => ({ id: e.id, type: e.type, content: (typeof e.payload === 'string' ? e.payload : (e.payload?.content ?? '')), created_at: e.created_at }));
    return jsonOk({ company, events: evs });
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonError(500, 'INTERNAL_ERROR', 'Unexpected error');
  }
}