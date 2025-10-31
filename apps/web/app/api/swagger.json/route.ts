import type { NextRequest } from 'next/server';
import { jsonOk } from '@/lib/api/errors';
import {
  VATBulkRequestSchema,
  CompaniesListResponseSchema,
  CreateCaseRequestSchema,
  UpdateCaseStatusRequestSchema,
  AssignCaseRequestSchema,
  CaseResponseSchema,
  UploadDocumentRequestSchema,
  UploadDocumentResponseSchema,
  ScanDocumentRequestSchema,
  ScanDocumentResponseSchema,
  AddEventRequestSchema,
  CreateTaskRequestSchema,
  UpdateTaskRequestSchema,
  MeResponseSchema,
} from '@/lib/api/schemas';
import { z, ZodTypeAny } from 'zod';

function schemaToOpenApi(schema: ZodTypeAny): any {
  const json = schema.safeParse({});
  // naive conversion: expose zod type via examples; proper conversion omitted for brevity
  return { schema: { example: schema._def || {} } } as any;
}

function pathItem(method: 'GET'|'POST'|'PATCH'|'PUT', summary: string, reqSchema?: ZodTypeAny, resSchema?: ZodTypeAny, params?: any[], needsOrgHeader = true) {
  const item: any = { [method.toLowerCase()]: { summary, responses: { 200: { description: 'OK' } } } };
  if (reqSchema) item[method.toLowerCase()].requestBody = schemaToOpenApi(reqSchema);
  if (resSchema) item[method.toLowerCase()].responses[200].content = { 'application/json': schemaToOpenApi(resSchema) };
  if (params) item[method.toLowerCase()].parameters = params;
  if (needsOrgHeader) {
    item[method.toLowerCase()].parameters = [...(item[method.toLowerCase()].parameters || []), { in: 'header', name: 'x-org-id', required: true, schema: { type: 'string', format: 'uuid' } }];
  }
  return item;
}

export async function GET(_req: NextRequest) {
  const doc = {
    openapi: '3.0.0',
    info: { title: 'DigiClient API', version: '1.0.0' },
    servers: [{ url: '/' }],
    paths: {
      '/api/import/vat-bulk': pathItem('POST', 'Bulk import companies by VAT', VATBulkRequestSchema, z.object({ created: z.number(), items: z.array(z.object({ id: z.string(), legal_name: z.string(), vat_number: z.string() })) })),
      '/api/companies': pathItem('GET', 'List companies by search', undefined, CompaniesListResponseSchema, undefined, true),
      '/api/cases': pathItem('POST', 'Create case', CreateCaseRequestSchema, z.object({ id: z.string(), status: z.string(), priority: z.string(), company_id: z.string() })),
      '/api/cases/{id}': pathItem('GET', 'Get case details', undefined, CaseResponseSchema, [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }]),
      '/api/cases/{id}/status': pathItem('PATCH', 'Update case status', UpdateCaseStatusRequestSchema, z.object({ id: z.string(), status: z.string() }), [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }]),
      '/api/cases/{id}/assign': pathItem('PATCH', 'Assign case', AssignCaseRequestSchema, z.object({ id: z.string(), assigned_to: z.string() }), [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }]),
      '/api/cases/{id}/documents': pathItem('POST', 'Upload case document (signed URL)', UploadDocumentRequestSchema, UploadDocumentResponseSchema, [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }]),
      '/api/cases/{id}/documents/{docId}/scan': pathItem('POST', 'Scan document', ScanDocumentRequestSchema, ScanDocumentResponseSchema, [
        { in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } },
        { in: 'path', name: 'docId', required: true, schema: { type: 'string', format: 'uuid' } },
      ]),
      '/api/cases/{id}/events': pathItem('POST', 'Add case event', AddEventRequestSchema, z.object({ id: z.string(), type: z.string(), content: z.string() }), [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }]),
      '/api/tasks': pathItem('POST', 'Create task', CreateTaskRequestSchema, z.object({ id: z.string(), title: z.string(), status: z.string() })),
      '/api/tasks/{id}': pathItem('PATCH', 'Update task', UpdateTaskRequestSchema, z.object({ id: z.string(), title: z.string(), status: z.string() }), [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }]),
      '/api/me': pathItem('GET', 'Get current user profile and memberships', undefined, MeResponseSchema),
      '/api/notifications': pathItem('GET', 'List my notifications', undefined, z.object({ items: z.array(z.object({ id: z.string(), action: z.string(), target_table: z.string(), target_id: z.string(), diff: z.any(), created_at: z.string() })) })),
      '/api/notifications/preferences': {
        ...pathItem('GET', 'Get my notification preferences', undefined, z.object({ assignment: z.object({ email: z.boolean(), inapp: z.boolean() }), status_change: z.object({ email: z.boolean(), inapp: z.boolean() }), doc_rejected: z.object({ email: z.boolean(), inapp: z.boolean() }), task_due: z.object({ email: z.boolean(), inapp: z.boolean() }) })),
        ...pathItem('PUT', 'Update my notification preferences', z.object({ assignment: z.any().optional(), status_change: z.any().optional(), doc_rejected: z.any().optional(), task_due: z.any().optional() }), z.object({ ok: z.boolean() })),
      },
    },
  };
  return jsonOk(doc);
}