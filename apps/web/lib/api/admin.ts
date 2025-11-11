import type { NextRequest } from 'next/server';
import { jsonError } from './errors';
import { OrgHeaderSchema } from './tenant';
import { createSupabaseServiceClient } from './supabase';

export async function requirePlatformAdminWithMFA(req: NextRequest, supabase: any) {
  const { data: auth } = await supabase.auth.getUser();
  const user = auth?.user;
  if (!user) throw jsonError(401, 'UNAUTHORIZED', 'Missing user');

  const disableMFA =
    process.env.NODE_ENV === 'development' ||
    process.env.NEXT_PUBLIC_DISABLE_MFA === 'true' ||
    process.env.DISABLE_MFA === 'true';
  const mfaEnabled = Boolean((user as any)?.user_metadata?.mfa_enabled);
  if (!disableMFA && !mfaEnabled) {
    throw jsonError(403, 'MFA_REQUIRED', 'Two-factor authentication required');
  }

  // Parse and validate org header first
  const parsed = OrgHeaderSchema.safeParse({ orgId: req.headers.get('x-org-id') });
  if (!parsed.success) {
    throw jsonError(400, 'ORG_HEADER_INVALID', 'Missing or invalid x-org-id');
  }
  const orgId = parsed.data.orgId;

  // Use service client to resolve role and org type, bypassing RLS on memberships
  const svc = createSupabaseServiceClient();

  // Resolve role of current user in provided org
  const { data: membership, error: memErr } = await svc
    .from('memberships')
    .select('role')
    .eq('org_id', orgId)
    .eq('user_id', user.id as string)
    .limit(1)
    .maybeSingle();
  if (memErr) throw jsonError(500, 'DB_ERROR', memErr.message);
  if (!membership) {
    throw jsonError(403, 'ORG_ACCESS_DENIED', 'User not a member of this org');
  }

  const role = membership.role as 'ADMIN' | 'MANAGER' | 'OPERATOR' | 'VIEWER';
  const allowedRoles = ['ADMIN'];
  if (!allowedRoles.includes(role)) {
    throw jsonError(403, 'FORBIDDEN', 'Admin role required for current user');
  }

  const { data: org, error: orgErr } = await svc
    .from('organizations')
    .select('type')
    .eq('id', orgId)
    .limit(1)
    .maybeSingle();
  if (orgErr) throw jsonError(500, 'DB_ERROR', orgErr.message);
  if (!org) throw jsonError(403, 'FORBIDDEN', 'Organization not found');

  // Always require platform organization for admin actions
  const allowedTypes = ['platform'];
  if (!allowedTypes.includes(org.type)) throw jsonError(403, 'FORBIDDEN', 'Platform admin required');

  return { orgId, userId: user.id as string };
}