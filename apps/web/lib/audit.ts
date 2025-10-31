import { SupabaseClient } from '@supabase/supabase-js';

export async function logAudit(
  supabase: SupabaseClient,
  params: {
    orgId: string;
    actorUserId: string; // must be provided (NOT NULL in schema)
    action: string;
    target_table: string;
    target_id: string | number;
    diff?: unknown;
  }
) {
  const { orgId, actorUserId, action, target_table, target_id, diff } = params;
  // Store diff as JSONB object; default to {} to satisfy NOT NULL
  const diffValue = diff == null ? {} : diff;

  const { error } = await supabase
    .from('audit_logs')
    .insert({
      org_id: orgId,
      actor_user_id: actorUserId,
      action,
      target_table,
      target_id: String(target_id),
      diff: diffValue,
    });

  if (error) {
    console.warn('[audit] insert failed', error);
  }
}