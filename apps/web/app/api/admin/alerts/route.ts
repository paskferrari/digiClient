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
    
    // Get recent audit logs that might indicate issues or important events
    const { data: auditLogs, error: auditError } = await svc
      .from('audit_logs')
      .select('id, action, target_table, target_id, diff, created_at, actor_user_id')
      .order('created_at', { ascending: false })
      .limit(50);
    
    if (auditError) return jsonError(500, 'DB_ERROR', auditError.message);

    // Transform audit logs into alert-like items
    const items = (auditLogs || []).map((log: any) => {
      let severity = 'info';
      let message = `${log.action} on ${log.target_table}`;
      
      // Determine severity based on action type
      if (log.action.includes('delete') || log.action.includes('reject')) {
        severity = 'warning';
      } else if (log.action.includes('error') || log.action.includes('fail')) {
        severity = 'error';
      } else if (log.action.includes('create') || log.action.includes('notification_sent')) {
        severity = 'success';
      }

      // Create more descriptive messages
      if (log.action === 'notification_sent') {
        const diff = typeof log.diff === 'string' ? JSON.parse(log.diff) : log.diff;
        message = `Notification sent: ${diff?.subject || 'Unknown'}`;
      } else if (log.action === 'case_created') {
        message = `New case created`;
      } else if (log.action === 'task_created') {
        message = `New task created`;
      } else if (log.action === 'status_change') {
        message = `Status changed for ${log.target_table}`;
      }

      return {
        id: log.id,
        message,
        severity,
        timestamp: log.created_at,
        details: {
          action: log.action,
          target_table: log.target_table,
          target_id: log.target_id,
          actor_user_id: log.actor_user_id
        }
      };
    });

    return jsonOk({ items });
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonError(500, 'INTERNAL_ERROR', 'Unexpected error');
  }
}