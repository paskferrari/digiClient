import type { SupabaseClient } from '@supabase/supabase-js';
import { sendEmail } from './email';
import { logAudit } from './audit';

export type NotificationType = 'assignment' | 'status_change' | 'doc_rejected' | 'task_due';

type ChannelPrefs = { email: boolean; inapp: boolean };
export type UserNotificationPrefs = {
  assignment: ChannelPrefs;
  status_change: ChannelPrefs;
  doc_rejected: ChannelPrefs;
  task_due: ChannelPrefs;
};

function defaults(): UserNotificationPrefs {
  return {
    assignment: { email: true, inapp: true },
    status_change: { email: true, inapp: true },
    doc_rejected: { email: true, inapp: true },
    task_due: { email: true, inapp: true },
  };
}

async function getUserPrefs(supabase: SupabaseClient, orgId: string, userId: string): Promise<UserNotificationPrefs> {
  const { data, error } = await supabase
    .from('settings')
    .select('value')
    .eq('org_id', orgId)
    .eq('key', 'notifications_prefs')
    .maybeSingle();
  if (error || !data || !data.value) return defaults();
  try {
    const map = typeof data.value === 'string' ? JSON.parse(data.value) : data.value;
    const prefs = map?.[userId];
    return prefs ? ({ ...defaults(), ...prefs }) : defaults();
  } catch {
    return defaults();
  }
}

async function resolveProfileId(supabase: SupabaseClient, maybeUserOrMembershipId: string): Promise<string | null> {
  // try direct profile id
  const { data: p } = await supabase.from('profiles').select('id').eq('id', maybeUserOrMembershipId).limit(1).maybeSingle();
  if (p?.id) return p.id;
  // try membership id
  const { data: m } = await supabase.from('memberships').select('user_id').eq('id', maybeUserOrMembershipId).limit(1).maybeSingle();
  return m?.user_id ?? null;
}

async function getUserEmail(supabase: SupabaseClient, maybeUserOrMembershipId: string): Promise<string | null> {
  const profileId = await resolveProfileId(supabase, maybeUserOrMembershipId);
  if (!profileId) return null;
  const { data } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', profileId)
    .limit(1)
    .maybeSingle();
  return data?.email ?? null;
}

export async function notify(
  supabase: SupabaseClient,
  params: {
    orgId: string;
    toUserId: string;
    type: NotificationType;
    subject: string;
    text: string;
    html?: string;
    context?: { caseId?: string | number; documentId?: string | number; taskId?: string | number };
  }
) {
  const { orgId, toUserId, type, subject, text, html, context } = params;
  const prefs = await getUserPrefs(supabase, orgId, toUserId);
  const channels = (prefs as any)[type] as ChannelPrefs | undefined;
  const wantsEmail = channels ? channels.email : true;

  let emailOk: any = null;
  if (wantsEmail) {
    const to = await getUserEmail(supabase, toUserId);
    if (to) {
      emailOk = await sendEmail({ to, subject, text, html });
    }
  }

  await logAudit(supabase, {
    orgId,
    actorUserId: await resolveProfileId(supabase, toUserId),
    action: 'notification_sent',
    target_table: context?.caseId ? 'cases' : context?.documentId ? 'documents' : context?.taskId ? 'tasks' : 'unknown',
    target_id: (context?.caseId || context?.documentId || context?.taskId || 'n/a') as any,
    diff: { type, channel: wantsEmail ? 'email' : 'none', subject, email_result: emailOk },
  });
}

export async function notifyAssignment(supabase: SupabaseClient, orgId: string, toUserId: string, caseId: string | number) {
  return notify(supabase, {
    orgId,
    toUserId,
    type: 'assignment',
    subject: `Pratica #${caseId} assegnata a te`,
    text: `Sei stato assegnato alla pratica #${caseId}.`,
    html: `<p>Sei stato assegnato alla pratica <strong>#${caseId}</strong>.</p>`,
    context: { caseId },
  });
}

export async function notifyStatusChange(
  supabase: SupabaseClient,
  orgId: string,
  toUserId: string,
  caseId: string | number,
  from: string,
  to: string
) {
  return notify(supabase, {
    orgId,
    toUserId,
    type: 'status_change',
    subject: `Stato pratica #${caseId}: ${from} → ${to}`,
    text: `Lo stato della pratica #${caseId} è cambiato: ${from} → ${to}.`,
    html: `<p>Lo stato della pratica <strong>#${caseId}</strong> è cambiato: <strong>${from}</strong> → <strong>${to}</strong>.</p>`,
    context: { caseId },
  });
}

export async function notifyDocRejected(
  supabase: SupabaseClient,
  orgId: string,
  toUserId: string,
  caseId: string | number,
  documentId: string | number,
  reason?: string
) {
  return notify(supabase, {
    orgId,
    toUserId,
    type: 'doc_rejected',
    subject: `Documento rifiutato in pratica #${caseId}`,
    text: `Il documento #${documentId} della pratica #${caseId} è stato rifiutato.${reason ? ` Motivo: ${reason}` : ''}`,
    html: `<p>Il documento <strong>#${documentId}</strong> della pratica <strong>#${caseId}</strong> è stato rifiutato.${reason ? ` Motivo: ${reason}` : ''}</p>`,
    context: { caseId, documentId },
  });
}

export async function notifyTaskDue(
  supabase: SupabaseClient,
  orgId: string,
  toUserId: string,
  taskId: string | number,
  title: string,
  dueDate: string
) {
  return notify(supabase, {
    orgId,
    toUserId,
    type: 'task_due',
    subject: `Task in scadenza: ${title}`,
    text: `Il task \"${title}\" (ID #${taskId}) è in scadenza entro ${dueDate}.`,
    html: `<p>Il task <strong>${title}</strong> (ID <strong>#${taskId}</strong>) è in scadenza entro <strong>${dueDate}</strong>.</p>`,
    context: { taskId },
  });
}