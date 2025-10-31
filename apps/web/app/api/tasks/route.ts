import type { NextRequest } from 'next/server';
import { jsonError, jsonOk, handleZod } from '@/lib/api/errors';
import { createSupabaseRouteClient } from '@/lib/api/supabase';
import { requireOrg } from '@/lib/api/tenant';
import { RBAC } from '@/lib/rbac';
import { CreateTaskRequestSchema } from '@/lib/api/schemas';

export async function POST(req: NextRequest) {
  try {
    const { supabase, token } = createSupabaseRouteClient(req);
    if (!token) return jsonError(401, 'UNAUTHORIZED', 'Missing user session');
    const { orgId, role } = await requireOrg(req, supabase);
    if (!RBAC[role].tasks.create) return jsonError(403, 'FORBIDDEN', 'Role cannot create tasks');

    const body = await req.json();
    const parsed = CreateTaskRequestSchema.parse(body);

    const payload = { org_id: orgId, title: parsed.title, description: parsed.description, case_id: parsed.case_id, status: 'OPEN', due_date: parsed.due_date };
    const { data, error } = await supabase
      .from('tasks')
      .insert(payload)
      .select('id, title, status')
      .maybeSingle();
    if (error) return jsonError(500, 'DB_ERROR', error.message);
    return jsonOk(data, 201);
  } catch (err) {
    if (err instanceof Response) return err;
    return handleZod(err);
  }
}