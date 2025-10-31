import type { NextRequest } from 'next/server';
import { jsonError, jsonOk, handleZod } from '@/lib/api/errors';
import { createSupabaseRouteClient } from '@/lib/api/supabase';
import { requireOrg } from '@/lib/api/tenant';
import { RBAC } from '@/lib/rbac';
import { CreateCaseRequestSchema } from '@/lib/api/schemas';

export async function POST(req: NextRequest) {
  try {
    const { supabase, token } = createSupabaseRouteClient(req);
    if (!token) return jsonError(401, 'UNAUTHORIZED', 'Missing user session');
    const { orgId, role } = await requireOrg(req, supabase);
    if (!RBAC[role].cases.create) return jsonError(403, 'FORBIDDEN', 'Role cannot create cases');

    const body = await req.json();
    const parsed = CreateCaseRequestSchema.parse(body);

    const payload = {
      org_id: orgId,
      company_id: parsed.company_id,
      status: 'NEW',
      priority: parsed.priority,
    };
    const { data, error } = await supabase
      .from('cases')
      .insert(payload)
      .select('id, status, priority, company_id')
      .maybeSingle();
    if (error) return jsonError(500, 'DB_ERROR', error.message);
    return jsonOk(data);
  } catch (err) {
    if (err instanceof Response) return err;
    return handleZod(err);
  }
}