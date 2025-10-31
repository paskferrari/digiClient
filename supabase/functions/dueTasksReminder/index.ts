// @ts-nocheck
// deno-lint-ignore-file no-explicit-any
// Supabase Edge Function: dueTasksReminder
// Schedule: daily at 08:30 Europe/Rome via Supabase cron configuration
// Example deploy & schedule:
// supabase functions deploy dueTasksReminder --project-ref <ref>
// supabase functions update dueTasksReminder --schedule "30 8 * * *" --region <region>
// Remember to set env: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

function log(msg: string, data?: any) {
  console.log(`[dueTasksReminder] ${msg}`, data ?? "");
}

serve(async (_req: Request) => {
  try {
    const url = Deno.env.get("SUPABASE_URL");
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!url || !key) {
      log("Missing env SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY");
      return new Response("Missing env", { status: 500 });
    }
    const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

    // Compute "today" in Europe/Rome
    const now = new Date();
    const tz = "Europe/Rome";
    const today = new Date(new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now));
    const isoDate = today.toISOString().slice(0, 10);

    // Find tasks due today and still OPEN/IN_PROGRESS
    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('id, org_id, title, assignee_membership_id, due_date, status')
      .not('due_date', 'is', null)
      .gte('due_date', isoDate)
      .lte('due_date', isoDate)
      .in('status', ['OPEN','IN_PROGRESS'])
      .limit(1000);
    if (error) {
      log("DB error", error.message);
      return new Response("DB error", { status: 500 });
    }

    // For each task, resolve assignee user_id from membership and log audit notification_sent
    for (const t of tasks ?? []) {
      const { data: mem } = await supabase
        .from('memberships')
        .select('user_id')
        .eq('id', t.assignee_membership_id)
        .maybeSingle();
      const toUserId = mem?.user_id;
      // Se non troviamo l'utente destinatario, saltiamo il log per evitare violazioni NOT NULL
      if (!toUserId) continue;
      await supabase.from('audit_logs').insert({
        org_id: t.org_id,
        actor_user_id: toUserId,
        action: 'notification_sent',
        target_table: 'tasks',
        target_id: String(t.id),
        diff: { type: 'task_due', channel: 'email', subject: `Task in scadenza: ${t.title}` },
      });
      // L'invio email avviene dall'API Next.js via SMTP; opzionalmente potremmo chiamare un webhook qui.
    }

    log(`Processed tasks: ${tasks?.length ?? 0}`);
    return new Response(JSON.stringify({ processed: tasks?.length ?? 0 }), { headers: { 'content-type': 'application/json' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    log("Unhandled error", msg);
    return new Response("Internal error", { status: 500 });
  }
});