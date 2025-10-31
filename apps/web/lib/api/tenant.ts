import type { NextRequest } from 'next/server';
import { z } from 'zod';
import { jsonError } from './errors';

export const OrgHeaderSchema = z.object({ orgId: z.string().uuid('x-org-id must be a UUID') });

export async function requireOrg(req: NextRequest, supabase: any) {
  const orgId = req.headers.get('x-org-id');
  const parsed = OrgHeaderSchema.safeParse({ orgId });
  if (!parsed.success) {
    throw jsonError(400, 'ORG_HEADER_INVALID', 'Missing or invalid x-org-id');
  }
  // Validate membership for current user via RLS (returns only user's rows)
  const { data, error } = await supabase
    .from('memberships')
    .select('role')
    .eq('org_id', parsed.data.orgId)
    .limit(1)
    .maybeSingle();
  if (error) {
    throw jsonError(500, 'DB_ERROR', error.message);
  }
  if (!data) {
    throw jsonError(403, 'ORG_ACCESS_DENIED', 'User not a member of this org');
  }
  return { orgId: parsed.data.orgId, role: data.role as 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER' };
}