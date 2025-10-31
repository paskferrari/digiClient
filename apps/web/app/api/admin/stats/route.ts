import type { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api/errors';
import { createSupabaseRouteClient, createSupabaseServiceClient } from '@/lib/api/supabase';
import { requirePlatformAdminWithMFA } from '@/lib/api/admin';

export async function GET(req: NextRequest) {
  try {
    const { supabase, token } = createSupabaseRouteClient(req);
    if (!token) return jsonError(401, 'UNAUTHORIZED', 'Missing user session');
    const { orgId } = await requirePlatformAdminWithMFA(req, supabase);

    const svc = createSupabaseServiceClient();
    
    // Get user count
    const { count: userCount, error: userError } = await svc
      .from('profiles')
      .select('*', { count: 'exact', head: true });
    
    if (userError) return jsonError(500, 'DB_ERROR', userError.message);

    // Get membership count
    const { count: membershipCount, error: membershipError } = await svc
      .from('memberships')
      .select('*', { count: 'exact', head: true });
    
    if (membershipError) return jsonError(500, 'DB_ERROR', membershipError.message);

    // Get actions from last 7 days
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    
    const { count: actionCount, error: actionError } = await svc
      .from('audit_logs')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', sevenDaysAgo.toISOString());
    
    if (actionError) return jsonError(500, 'DB_ERROR', actionError.message);

    return jsonOk({
      users: userCount || 0,
      memberships: membershipCount || 0,
      last7d_actions: actionCount || 0
    });
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonError(500, 'INTERNAL_ERROR', 'Unexpected error');
  }
}