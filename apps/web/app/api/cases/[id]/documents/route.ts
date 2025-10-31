import type { NextRequest } from 'next/server';
import { jsonError, jsonOk, handleZod } from '@/lib/api/errors';
import { createSupabaseRouteClient } from '@/lib/api/supabase';
import { requireOrg } from '@/lib/api/tenant';
import { UploadDocumentRequestSchema } from '@/lib/api/schemas';
import { RBAC } from '@/lib/rbac';

const ALLOWED_MIME = ['application/pdf','image/png','image/jpeg'];
const DEFAULT_MAX_MB = Number(process.env.MAX_UPLOAD_SIZE_MB || process.env.NEXT_PUBLIC_MAX_UPLOAD_SIZE_MB || 10);

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { supabase, token } = createSupabaseRouteClient(req);
    if (!token) return jsonError(401, 'UNAUTHORIZED', 'Missing user session');
    const { orgId, role } = await requireOrg(req, supabase);
    if (!RBAC[role].documents.upload) return jsonError(403, 'FORBIDDEN', 'Role cannot upload documents');

    const body = await req.json();
    const parsed = UploadDocumentRequestSchema.parse(body);

    if (!ALLOWED_MIME.includes(parsed.contentType)) {
      return jsonError(400, 'UNSUPPORTED_TYPE', `MIME non consentito: ${parsed.contentType}`);
    }
    if (parsed.size && parsed.size > DEFAULT_MAX_MB * 1024 * 1024) {
      return jsonError(413, 'FILE_TOO_LARGE', `Dimensione massima ${DEFAULT_MAX_MB}MB`);
    }

    const caseId = params.id;
    // ensure case exists & belongs to org
    const { data: kase, error: caseErr } = await supabase
      .from('cases')
      .select('id')
      .eq('id', caseId)
      .eq('org_id', orgId)
      .maybeSingle();
    if (caseErr) return jsonError(500, 'DB_ERROR', caseErr.message);
    if (!kase) return jsonError(404, 'NOT_FOUND', 'Case not found');

    // Resolve current user's membership id for this org
    const { data: authInfo } = await supabase.auth.getUser();
    const uid = authInfo?.user?.id;
    if (!uid) return jsonError(401, 'UNAUTHORIZED', 'Missing user');
    const { data: membership, error: memErr } = await supabase
      .from('memberships')
      .select('id')
      .eq('org_id', orgId)
      .eq('user_id', uid)
      .limit(1)
      .maybeSingle();
    if (memErr) return jsonError(500, 'DB_ERROR', memErr.message);
    if (!membership) return jsonError(403, 'ORG_ACCESS_DENIED', 'User not in org');

    // Build storage path with UUID filename
    const uuid = (globalThis.crypto?.randomUUID?.() || require('crypto').randomUUID());
    const ext = (parsed.name.split('.').pop() || 'bin').toLowerCase();
    const safeName = `${uuid}.${ext}`;
    const path = `${orgId}/${caseId}/${safeName}`;
    const bucket = 'documents'; // keep existing bucket name for compatibility

    const { data: upload, error: upErr } = await supabase.storage.from(bucket).createSignedUploadUrl(path);
    if (upErr || !upload) return jsonError(500, 'STORAGE_ERROR', upErr?.message || 'Cannot create signed upload URL');

    // Versioning: find previous same-kind document not superseded
    let previousId: string | null = null;
    try {
      const { data: prev } = await supabase
        .from('documents')
        .select('id')
        .eq('case_id', caseId)
        .eq('org_id', orgId)
        .eq('kind', parsed.kind)
        .is('superseded_by', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      previousId = prev?.id ?? null;
    } catch (_) {
      // Column superseded_by may not exist yet; ignore.
    }

    const payload = {
      case_id: caseId,
      org_id: orgId,
      kind: parsed.kind,
      filename: parsed.name,
      storage_path: path,
      mime: parsed.contentType,
      size: parsed.size ?? 0,
      uploaded_by: membership.id,
      status: 'PENDING',
      virus_scanned: false,
    };

    const { data: doc, error: docErr } = await supabase
      .from('documents')
      .insert(payload)
      .select('id, filename, storage_path, case_id')
      .maybeSingle();
    if (docErr) return jsonError(500, 'DB_ERROR', docErr.message);

    // Mark previous as superseded if present
    if (previousId && doc?.id) {
      try {
        await supabase
          .from('documents')
          .update({ superseded_by: doc.id })
          .eq('id', previousId)
          .eq('org_id', orgId);
      } catch (_) {
        // ignore if column missing
      }
    }

    // Log event for upload
    try {
      await supabase.from('case_events').insert({ case_id: caseId, actor_membership_id: membership.id, type: 'DOC_UPLOAD', payload: { kind: parsed.kind, name: parsed.name } });
    } catch (_) {}

    return jsonOk({ uploadUrl: upload.signedUrl, document: { id: doc!.id, name: doc!.filename, path: doc!.storage_path, case_id: caseId } });
  } catch (err) {
    if (err instanceof Response) return err;
    return handleZod(err);
  }
}