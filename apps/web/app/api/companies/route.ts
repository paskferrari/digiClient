import type { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api/errors';
import { createSupabaseRouteClient } from '@/lib/api/supabase';
import { requireOrg } from '@/lib/api/tenant';
import { RBAC } from '@/lib/rbac';
import { CreateCompanyRequestSchema } from '@/lib/api/schemas';

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

export async function POST(req: NextRequest) {
  try {
    const { supabase, token } = createSupabaseRouteClient(req);
    if (!token) return jsonError(401, 'UNAUTHORIZED', 'Missing user session');
    const { orgId, role } = await requireOrg(req, supabase);
    if (!RBAC[role].companies.create) return jsonError(403, 'FORBIDDEN', 'Role cannot create companies');

    // Resolve membership id for current user within this org
    const { data: membership, error: memErr } = await supabase
      .from('memberships')
      .select('id')
      .eq('org_id', orgId)
      .limit(1)
      .maybeSingle();
    if (memErr) return jsonError(500, 'DB_ERROR', memErr.message);
    if (!membership?.id) return jsonError(403, 'FORBIDDEN', 'Membership not found for this org');

    const body = await req.json();
    const parsed = CreateCompanyRequestSchema.parse(body);

    // Prevent duplicate VAT within org
    const { data: existing, error: selErr } = await supabase
      .from('companies')
      .select('id, legal_name, vat_number')
      .eq('org_id', orgId)
      .eq('vat_number', parsed.vat_number)
      .maybeSingle();
    if (selErr) return jsonError(500, 'DB_ERROR', selErr.message);
    if (existing) return jsonError(409, 'COMPANY_EXISTS', 'Company with this VAT already exists');

    const payload: any = {
      org_id: orgId,
      legal_name: parsed.legal_name,
      vat_number: parsed.vat_number,
      created_by: membership.id,
    };
    if (parsed.ateco_code) payload.ateco_code = parsed.ateco_code;
    if (parsed.province) payload.province = parsed.province;
    if (parsed.status) payload.status = parsed.status;
    if (parsed.assigned_to) payload.assigned_to = parsed.assigned_to;

    const { data: inserted, error: insErr } = await supabase
      .from('companies')
      .insert(payload)
      .select('id, legal_name, vat_number, status, assigned_to')
      .maybeSingle();
    if (insErr) return jsonError(500, 'DB_ERROR', insErr.message);
    if (!inserted) return jsonError(500, 'DB_ERROR', 'Insert failed');

    return jsonOk(inserted);
  } catch (err: any) {
    if (err instanceof Response) return err;
    return jsonError(400, 'BAD_REQUEST', err?.message || 'Invalid request');
  }
}