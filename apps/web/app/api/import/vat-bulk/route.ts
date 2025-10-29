import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { VATBulkRequestSchema } from '@/lib/api/schemas';
import { jsonError, jsonOk, handleZod } from '@/lib/api/errors';
import { createSupabaseRouteClient } from '@/lib/api/supabase';
import { requireOrg } from '@/lib/api/tenant';
import { RBAC } from '@/lib/rbac';
import { enrichCompany } from '@/lib/integrations/openapi-company';

export async function POST(req: NextRequest) {
  try {
    const { supabase, token } = createSupabaseRouteClient(req);
    if (!token) return jsonError(401, 'UNAUTHORIZED', 'Missing user session');
    const { orgId, role } = await requireOrg(req, supabase);
    if (!RBAC[role].companies.create) return jsonError(403, 'FORBIDDEN', 'Role cannot create companies');

    // Resolve current user's membership id in this org (via RLS)
    const { data: membership, error: memErr } = await supabase
      .from('memberships')
      .select('id')
      .eq('org_id', orgId)
      .limit(1)
      .maybeSingle();
    if (memErr) return jsonError(500, 'DB_ERROR', memErr.message);
    if (!membership?.id) return jsonError(403, 'FORBIDDEN', 'Membership not found for this org');

    const body = await req.json();
    const parsed = VATBulkRequestSchema.parse(body);

    const created: any[] = [];
    for (const vat of parsed.vats) {
      const { data: existing, error: selErr } = await supabase
        .from('companies')
        .select('id, legal_name, vat_number')
        .eq('org_id', orgId)
        .eq('vat_number', vat)
        .maybeSingle();
      if (selErr) return jsonError(500, 'DB_ERROR', selErr.message);
      if (existing) {
        created.push(existing);
        continue;
      }
      let payload: any = { org_id: orgId, vat_number: vat, created_by: membership.id };
      if (parsed.enrich) {
        const info = await enrichCompany(vat);
        payload = { ...payload, ...info };
      }
      const { data: inserted, error: insErr } = await supabase
        .from('companies')
        .insert(payload)
        .select('id, legal_name, vat_number')
        .maybeSingle();
      if (insErr) return jsonError(500, 'DB_ERROR', insErr.message);
      if (inserted) created.push(inserted);
    }

    return jsonOk({ created: created.length, items: created });
  } catch (err) {
    if (err instanceof Response) return err;
    return handleZod(err);
  }
}