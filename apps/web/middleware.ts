import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { z } from 'zod';

// naive in-memory rate limit per ip
const buckets = new Map<string, { count: number; resetAt: number }>();
const LIMIT = 60;
const WINDOW_MS = 60_000;

export function middleware(req: NextRequest) {
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('x-real-ip') ||
    req.headers.get('cf-connecting-ip') ||
    'unknown';
  const now = Date.now();
  const b = buckets.get(ip) ?? { count: 0, resetAt: now + WINDOW_MS };
  if (now > b.resetAt) {
    b.count = 0;
    b.resetAt = now + WINDOW_MS;
  }
  b.count += 1;
  buckets.set(ip, b);
  if (b.count > LIMIT && req.nextUrl.pathname.startsWith('/api')) {
    return new NextResponse('Too Many Requests', { status: 429 });
  }

  // org header validation for API routes (basic presence/format)
  // Allow bootstrap route '/api/me' without org header to discover memberships
  if (
    req.nextUrl.pathname.startsWith('/api') &&
    !req.nextUrl.pathname.startsWith('/api/swagger.json') &&
    !req.nextUrl.pathname.startsWith('/api/me') &&
    true
  ) {
    const orgSchema = z.object({ org: z.string().uuid().optional() });
    const parsed = orgSchema.safeParse({ org: req.headers.get('x-org-id') ?? undefined });
    if (!parsed.success || !parsed.data.org) {
      return NextResponse.json({ error: 'Invalid or missing x-org-id' }, { status: 400 });
    }
    // For API requests, continue normally.
    return NextResponse.next();
  }

  // Do NOT enforce auth for non-API pages here.
  // Supabase JS stores the session in localStorage on the client; headers/cookies
  // are not available for page navigations. Page-level protection is handled client-side.
  return NextResponse.next();
}

export const config = {
  // Apply middleware to all routes to enforce auth on pages, keep API logic above.
  matcher: ['/(.*)']
};