-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.audit_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  actor_user_id uuid NOT NULL,
  action text NOT NULL,
  target_table text NOT NULL,
  target_id uuid,
  diff jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT audit_logs_pkey PRIMARY KEY (id),
  CONSTRAINT audit_logs_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id),
  CONSTRAINT audit_logs_actor_user_id_fkey FOREIGN KEY (actor_user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.case_events (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  actor_membership_id uuid NOT NULL,
  type USER-DEFINED NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT case_events_pkey PRIMARY KEY (id),
  CONSTRAINT case_events_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id),
  CONSTRAINT case_events_actor_membership_id_fkey FOREIGN KEY (actor_membership_id) REFERENCES public.memberships(id)
);
CREATE TABLE public.cases (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  company_id uuid NOT NULL,
  status USER-DEFINED NOT NULL,
  priority USER-DEFINED NOT NULL DEFAULT 'MEDIUM'::priority_level,
  assigned_to uuid,
  created_by uuid NOT NULL,
  updated_at timestamp with time zone,
  CONSTRAINT cases_pkey PRIMARY KEY (id),
  CONSTRAINT cases_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id),
  CONSTRAINT cases_company_id_fkey FOREIGN KEY (company_id) REFERENCES public.companies(id),
  CONSTRAINT cases_assigned_to_fkey FOREIGN KEY (assigned_to) REFERENCES public.memberships(id),
  CONSTRAINT cases_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.memberships(id)
);
CREATE TABLE public.companies (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  vat_number text NOT NULL,
  legal_name text NOT NULL,
  ateco_code text,
  province text,
  created_by uuid NOT NULL,
  CONSTRAINT companies_pkey PRIMARY KEY (id),
  CONSTRAINT companies_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id),
  CONSTRAINT companies_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.memberships(id)
);
CREATE TABLE public.documents (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  org_id uuid NOT NULL,
  kind USER-DEFINED NOT NULL,
  filename text NOT NULL,
  storage_path text NOT NULL,
  mime text NOT NULL,
  size integer NOT NULL,
  uploaded_by uuid NOT NULL,
  status USER-DEFINED NOT NULL DEFAULT 'PENDING'::document_status,
  virus_scanned boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT documents_pkey PRIMARY KEY (id),
  CONSTRAINT documents_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id),
  CONSTRAINT documents_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id),
  CONSTRAINT documents_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.memberships(id)
);
CREATE TABLE public.invitations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  email text NOT NULL,
  role USER-DEFINED NOT NULL,
  invited_by uuid NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone,
  accepted_at timestamp with time zone,
  CONSTRAINT invitations_pkey PRIMARY KEY (id),
  CONSTRAINT invitations_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id),
  CONSTRAINT invitations_invited_by_fkey FOREIGN KEY (invited_by) REFERENCES public.memberships(id)
);
CREATE TABLE public.memberships (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role USER-DEFINED NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT memberships_pkey PRIMARY KEY (id),
  CONSTRAINT memberships_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id),
  CONSTRAINT memberships_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id)
);
CREATE TABLE public.organizations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type USER-DEFINED NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT organizations_pkey PRIMARY KEY (id)
);
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  email text NOT NULL UNIQUE,
  full_name text,
  phone text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.settings (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL,
  key text NOT NULL,
  value jsonb NOT NULL,
  CONSTRAINT settings_pkey PRIMARY KEY (id),
  CONSTRAINT settings_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organizations(id)
);
CREATE TABLE public.tasks (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  case_id uuid NOT NULL,
  title text NOT NULL,
  due_date date,
  status USER-DEFINED NOT NULL DEFAULT 'OPEN'::task_status,
  assignee_membership_id uuid,
  created_by uuid NOT NULL,
  CONSTRAINT tasks_pkey PRIMARY KEY (id),
  CONSTRAINT tasks_case_id_fkey FOREIGN KEY (case_id) REFERENCES public.cases(id),
  CONSTRAINT tasks_assignee_membership_id_fkey FOREIGN KEY (assignee_membership_id) REFERENCES public.memberships(id),
  CONSTRAINT tasks_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.memberships(id)
);

-- Indexes & extensions (context): align with production schema performance tweaks
-- Note: this file is context-only; actual execution happens via migrations and database making scripts

-- Trigram extension for faster ILIKE matching on text columns
-- create extension if not exists pg_trgm;

-- Audit logs: common filter/order indexes
-- create index if not exists audit_logs_org_created_idx on public.audit_logs(org_id, created_at);
-- create index if not exists audit_logs_action_idx on public.audit_logs(action);
-- create index if not exists audit_logs_target_table_idx on public.audit_logs(target_table);
-- create index if not exists audit_logs_actor_idx on public.audit_logs(actor_user_id);
-- create index if not exists audit_logs_target_id_idx on public.audit_logs(target_id);

-- Trigram GIN indexes for free-text search on audit logs
-- create index if not exists audit_logs_action_trgm_idx on public.audit_logs using gin (action gin_trgm_ops);
-- create index if not exists audit_logs_target_table_trgm_idx on public.audit_logs using gin (target_table gin_trgm_ops);