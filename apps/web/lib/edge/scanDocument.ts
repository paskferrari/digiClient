// Simple antivirus stub to simulate scanning logic
export type ScanMeta = { mime: string; size: number; name: string };
export type ScanResult = { ok: boolean; reason?: string };

const ALLOWED_MIME = ['application/pdf','image/png','image/jpeg'];
const MAX_MB = Number(process.env.MAX_UPLOAD_SIZE_MB || process.env.NEXT_PUBLIC_MAX_UPLOAD_SIZE_MB || 10);

export async function scanDocument(meta: ScanMeta): Promise<ScanResult> {
  // Reject suspicious names
  if (/virus|malware|trojan/i.test(meta.name)) {
    return { ok: false, reason: 'Suspicious filename' };
  }
  // MIME and size checks
  if (!ALLOWED_MIME.includes(meta.mime)) {
    return { ok: false, reason: `Unsupported MIME: ${meta.mime}` };
  }
  if (meta.size > MAX_MB * 1024 * 1024) {
    return { ok: false, reason: `Too large (> ${MAX_MB}MB)` };
  }
  return { ok: true };
}