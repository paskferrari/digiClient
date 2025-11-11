import { z } from 'zod';
import type { CaseStatus } from '@/lib/rbac';

export const UUID = z.string().uuid();

export const VATBulkRequestSchema = z.object({
  vats: z.array(z.string().min(8).max(16)),
  enrich: z.boolean().optional().default(false),
});
export type VATBulkRequest = z.infer<typeof VATBulkRequestSchema>;

export const CompanySchema = z.object({
  id: UUID.optional(),
  org_id: UUID.optional(),
  legal_name: z.string().min(1),
  vat_number: z.string().min(8).max(16),
  address: z.string().optional(),
  city: z.string().optional(),
  country: z.string().optional(),
  ateco_code: z.string().optional(),
  status: z.enum(['ACTIVE','PENDING','SUSPENDED','ARCHIVED']).optional(),
  assigned_to: UUID.optional().nullable(),
});
export type Company = z.infer<typeof CompanySchema>;

export const CompaniesListResponseSchema = z.object({
  items: z.array(CompanySchema),
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1),
  total: z.number().int().min(0),
});

// Creazione azienda (richiesta)
export const CompanyStatusEnum = z.enum(['ACTIVE','PENDING','SUSPENDED','ARCHIVED']);

export const CreateCompanyRequestSchema = z.object({
  legal_name: z.string().min(1),
  vat_number: z.string().min(8).max(16),
  ateco_code: z.string().optional(),
  province: z.string().optional(),
  status: CompanyStatusEnum.optional(),
  assigned_to: UUID.optional(),
});
export type CreateCompanyRequest = z.infer<typeof CreateCompanyRequestSchema>;

export const CreateCaseRequestSchema = z.object({
  company_id: UUID,
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
});

export const UpdateCaseStatusRequestSchema = z.object({
  to: z.enum([
    'NEW',
    'SCREENING',
    'REJECTED',
    'APPROVED',
    'ASSIGNED',
    'DOCS_REQUESTED',
    'IN_PROGRESS',
    'SUBMITTED',
    'FUNDED',
    'CLOSED_LOST',
  ] as const),
});

export const AssignCaseRequestSchema = z.object({ assigned_to: UUID });

export const CaseResponseSchema = z.object({
  case: z.object({
    id: UUID,
    org_id: UUID,
    company_id: UUID,
    status: z.string(),
    priority: z.string(),
    assigned_to: UUID.nullable().optional(),
    created_at: z.string().optional(),
  }),
  events: z.array(z.object({ id: UUID, type: z.string(), content: z.string(), created_at: z.string() })),
  documents: z.array(z.object({ id: UUID, name: z.string(), url: z.string().url().optional(), created_at: z.string() })),
  tasks: z.array(z.object({ id: UUID, title: z.string(), status: z.string(), created_at: z.string() })),
});

// Document kinds aligned to DB enum
export const DocumentKindEnum = z.enum(['ID','IBAN','BILANCIO','DURC','ALTRO']);

export const UploadDocumentRequestSchema = z.object({
  name: z.string().min(1),
  contentType: z.string().min(3),
  kind: DocumentKindEnum,
  size: z.number().int().positive().optional(),
});
export const UploadDocumentResponseSchema = z.object({
  uploadUrl: z.string().url(),
  document: z.object({ id: UUID, name: z.string(), path: z.string(), case_id: UUID }),
});

export const ScanDocumentRequestSchema = z.object({
  force: z.enum(['APPROVED','REJECTED']).optional(),
});
export const ScanDocumentResponseSchema = z.object({
  id: UUID,
  status: z.enum(['PENDING','APPROVED','REJECTED']),
  virus_scanned: z.boolean(),
});

export const AddEventRequestSchema = z.object({
  type: z.enum(['note', 'comment']).default('note'),
  content: z.string().min(1).max(1000),
});

export const CreateTaskRequestSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  case_id: UUID.optional(),
  due_date: z.string().datetime().optional(),
});
export const UpdateTaskRequestSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  status: z.enum(['OPEN', 'IN_PROGRESS', 'DONE']).optional(),
  assigned_to: UUID.optional(),
  due_date: z.string().datetime().optional(),
});

export const MeResponseSchema = z.object({
  profile: z.object({ id: UUID, email: z.string().email(), full_name: z.string().nullable().optional() }),
  memberships: z.array(z.object({ org_id: UUID, role: z.string(), org_name: z.string().nullable().optional() })),
  currentOrg: z.object({ org_id: UUID, role: z.string() }),
});

export type MeResponse = z.infer<typeof MeResponseSchema>;