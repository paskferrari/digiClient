import type { NextRequest } from 'next/server';
import { jsonError, jsonOk } from '@/lib/api/errors';
import { createSupabaseRouteClient } from '@/lib/api/supabase';
import { requireOrg } from '@/lib/api/tenant';

// Next.js 15 requires awaiting `params` in dynamic API routes
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { supabase, token } = createSupabaseRouteClient(req);
    if (!token) return jsonError(401, 'UNAUTHORIZED', 'Missing user session');
    const { orgId } = await requireOrg(req, supabase);

    const { id } = await params;
    const caseId = id;
    const { data: kase, error: caseErr } = await supabase
      .from('cases')
      .select('id, org_id, company_id, status, priority, assigned_to')
      .eq('id', caseId)
      .eq('org_id', orgId)
      .maybeSingle();
    if (caseErr) return jsonError(500, 'DB_ERROR', caseErr.message);
    if (!kase) return jsonError(404, 'NOT_FOUND', 'Case not found');

    const [{ data: events, error: evErr }, { data: documents, error: docErr }, { data: tasks, error: taskErr }] = await Promise.all([
      supabase
        .from('case_events')
        .select('id, type, payload, created_at')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false }),
      // Select actual columns from documents table and map to API shape
      supabase
        .from('documents')
        .select('id, filename, storage_path, created_at')
        .eq('case_id', caseId)
        .order('created_at', { ascending: false }),
      supabase
        .from('tasks')
        .select('id, title, status')
        .eq('case_id', caseId)
        .order('id', { ascending: false }),
    ]);

    if (evErr || docErr || taskErr) {
      const err = evErr || docErr || taskErr!;
      return jsonError(500, 'DB_ERROR', err.message);
    }

    const docs = (documents ?? []).map((d: any) => ({ id: d.id, name: d.filename, url: d.storage_path, created_at: d.created_at }));
    const evs = (events ?? []).map((e: any) => ({ id: e.id, type: e.type, content: (typeof e.payload === 'string' ? e.payload : (e.payload?.content ?? '')), created_at: e.created_at }));
    const tks = (tasks ?? []).map((t: any) => ({ id: t.id, title: t.title, status: t.status, created_at: t.created_at ?? null }));
    return jsonOk({ case: kase, events: evs, documents: docs, tasks: tks });
  } catch (err) {
    if (err instanceof Response) return err;
    return jsonError(500, 'INTERNAL_ERROR', 'Unexpected error');
  }
}