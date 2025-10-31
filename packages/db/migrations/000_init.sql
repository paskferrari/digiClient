-- Drizzle SQL migration: initial schema, enums, FKs, and indexes
-- Requires PostgreSQL and, if on Supabase, pgcrypto for gen_random_uuid()

create extension if not exists pgcrypto;

-- Enumerated types
do $$ begin
  if not exists (select 1 from pg_type where typname = 'organization_type') then
    create type organization_type as enum ('association', 'platform');
  end if;
  if not exists (select 1 from pg_type where typname = 'membership_role') then
    create type membership_role as enum ('ADMIN','MANAGER','OPERATOR','VIEWER');
  end if;
  if not exists (select 1 from pg_type where typname = 'case_status') then
    create type case_status as enum ('NEW','SCREENING','REJECTED','APPROVED','ASSIGNED','DOCS_REQUESTED','IN_PROGRESS','SUBMITTED','FUNDED','CLOSED_LOST');
  end if;
  if not exists (select 1 from pg_type where typname = 'priority_level') then
    create type priority_level as enum ('LOW','MEDIUM','HIGH');
  end if;
  if not exists (select 1 from pg_type where typname = 'case_event_type') then
    create type case_event_type as enum ('STATUS_CHANGE','COMMENT','DOC_REQUEST','DOC_UPLOAD','ASSIGNMENT','NOTE');
  end if;
  if not exists (select 1 from pg_type where typname = 'document_kind') then
    create type document_kind as enum ('ID','IBAN','BILANCIO','DURC','ALTRO');
  end if;
  if not exists (select 1 from pg_type where typname = 'document_status') then
    create type document_status as enum ('PENDING','APPROVED','REJECTED');
  end if;
  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type task_status as enum ('OPEN','DONE','CANCELLED');
  end if;
end $$;

-- Profiles (1:1 with auth.users)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text,
  phone text,
  created_at timestamptz not null default now()
);

-- Organizations
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  type organization_type not null,
  created_at timestamptz not null default now()
);

-- Memberships
create table if not exists public.memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role membership_role not null,
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);
create index if not exists memberships_org_idx on public.memberships(org_id);
create index if not exists memberships_user_idx on public.memberships(user_id);

-- Companies
create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  vat_number text not null,
  legal_name text not null,
  ateco_code text,
  province text,
  created_by uuid not null references public.memberships(id) on delete restrict
);
create unique index if not exists companies_org_vat_unique on public.companies(org_id, vat_number);
create index if not exists companies_vat_idx on public.companies(vat_number);
create index if not exists companies_org_idx on public.companies(org_id);

-- Cases
create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  status case_status not null,
  priority priority_level not null default 'MEDIUM',
  assigned_to uuid references public.memberships(id) on delete set null,
  created_by uuid not null references public.memberships(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz
);
create index if not exists cases_org_idx on public.cases(org_id);
create index if not exists cases_company_idx on public.cases(company_id);
create index if not exists cases_status_idx on public.cases(status);
create index if not exists cases_assigned_to_idx on public.cases(assigned_to);

-- Case events (timeline)
create table if not exists public.case_events (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  actor_membership_id uuid not null references public.memberships(id) on delete restrict,
  type case_event_type not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists case_events_case_idx on public.case_events(case_id);

-- Documents
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  org_id uuid not null references public.organizations(id) on delete cascade,
  kind document_kind not null,
  filename text not null,
  storage_path text not null,
  mime text not null,
  size integer not null,
  uploaded_by uuid not null references public.memberships(id) on delete restrict,
  status document_status not null default 'PENDING',
  virus_scanned boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists documents_org_idx on public.documents(org_id);
create index if not exists documents_case_idx on public.documents(case_id);
create index if not exists documents_status_idx on public.documents(status);

-- Tasks
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references public.cases(id) on delete cascade,
  title text not null,
  due_date date,
  status task_status not null default 'OPEN',
  assignee_membership_id uuid references public.memberships(id) on delete set null,
  created_by uuid not null references public.memberships(id) on delete restrict
);
create index if not exists tasks_case_idx on public.tasks(case_id);
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists tasks_assignee_idx on public.tasks(assignee_membership_id);

-- Invitations
create table if not exists public.invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  email text not null,
  role membership_role not null,
  invited_by uuid not null references public.memberships(id) on delete restrict,
  token text not null unique,
  expires_at timestamptz,
  accepted_at timestamptz
);
create index if not exists invitations_org_idx on public.invitations(org_id);

-- Audit logs
create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  actor_user_id uuid not null references public.profiles(id) on delete restrict,
  action text not null,
  target_table text not null,
  target_id uuid,
  diff jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_org_idx on public.audit_logs(org_id);

-- Settings
create table if not exists public.settings (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  key text not null,
  value jsonb not null,
  unique (org_id, key)
);
create index if not exists settings_org_idx on public.settings(org_id);

-- End of initial schema