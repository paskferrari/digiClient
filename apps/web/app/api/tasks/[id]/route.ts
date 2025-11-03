import type { NextRequest } from 'next/server';
import { jsonError, jsonOk, handleZod } from '@/lib/api/errors';
import { createSupabaseRouteClient } from '@/lib/api/supabase';
import { requireOrg } from '@/lib/api/tenant';
import { RBAC } from '@/lib/rbac';
import { UpdateTaskRequestSchema } from '@/lib/api/schemas';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, token } = createSupabaseRouteClient(req);
    if (!token) return jsonError(401, 'UNAUTHORIZED', 'Missing user session');
    const { orgId, role } = await requireOrg(req, supabase);
    if (!RBAC[role].tasks.update) return jsonError(403, 'FORBIDDEN', 'Role cannot update tasks');

    const body = await req.json();
    const parsed = UpdateTaskRequestSchema.parse(body);

    const { data, error } = await supabase
      .from('tasks')
      .update(parsed)
      .eq('id', (await params).id)
      .eq('org_id', orgId)
      .select('id, title, status')
      .maybeSingle();
    if (error) return jsonError(500, 'DB_ERROR', error.message);
    if (!data) return jsonError(404, 'NOT_FOUND', 'Task not found');
    return jsonOk(data);
  } catch (err) {
    if (err instanceof Response) return err;
    return handleZod(err);
  }
}