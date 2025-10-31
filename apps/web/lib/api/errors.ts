import { ZodError } from 'zod';

export type ApiError = {
  code: string;
  message: string;
  details?: unknown;
};

export function jsonError(status: number, code: string, message: string, details?: unknown): Response {
  return new Response(JSON.stringify({ error: { code, message, details } }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export function jsonOk(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export function mapZodError(err: ZodError): ApiError {
  const formatted = err.flatten();
  return {
    code: 'VALIDATION_ERROR',
    message: 'Validation failed',
    details: { fieldErrors: formatted.fieldErrors, formErrors: formatted.formErrors },
  };
}

export function handleZod(err: unknown): Response {
  if (err instanceof ZodError) {
    const e = mapZodError(err);
    return jsonError(400, e.code, e.message, e.details);
  }
  return jsonError(500, 'INTERNAL_ERROR', 'Unexpected error');
}