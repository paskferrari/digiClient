-- Add company_status enum, assigned_to column, and company_events table
do $$ begin
  if not exists (select 1 from pg_type where typname = 'company_status') then
    create type company_status as enum ('ACTIVE','PENDING','SUSPENDED','ARCHIVED');
  end if;
end $$;

-- Add status and assigned_to to companies
alter table if exists public.companies
  add column if not exists status company_status default 'ACTIVE' not null,
  add column if not exists assigned_to uuid null;

-- Foreign key to memberships for assignment
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_name = 'companies' and constraint_type = 'FOREIGN KEY' and constraint_name = 'companies_assigned_to_fkey'
  ) then
    alter table public.companies
      add constraint companies_assigned_to_fkey foreign key (assigned_to)
        references public.memberships (id) on delete set null;
  end if;
end $$;

-- Company events table
create table if not exists public.company_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null,
  company_id uuid not null,
  actor_membership_id uuid null,
  type text not null check (type in ('NOTE','COMMENT','STATUS_CHANGE','ASSIGNMENT')),
  payload jsonb not null,
  created_at timestamptz not null default now()
);

-- FKs and indexes
do $$ begin
  if not exists (
    select 1 from information_schema.table_constraints
    where table_name = 'company_events' and constraint_type = 'FOREIGN KEY' and constraint_name = 'company_events_company_id_fkey'
  ) then
    alter table public.company_events
      add constraint company_events_company_id_fkey foreign key (company_id)
        references public.companies (id) on delete cascade;
  end if;
end $$;

create index if not exists company_events_company_id_idx on public.company_events(company_id);
create index if not exists company_events_org_id_idx on public.company_events(org_id);
create index if not exists company_events_created_at_idx on public.company_events(created_at desc);

-- Enable RLS and add basic policies for company_events (mirroring case_events)
alter table public.company_events enable row level security;

-- Drop if exist (idempotency)
do $$ begin
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'company_events' and polname = 'company_events_super_admin_bypass') then
    drop policy company_events_super_admin_bypass on public.company_events;
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'company_events' and polname = 'company_events_same_org_read') then
    drop policy company_events_same_org_read on public.company_events;
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public' and tablename = 'company_events' and polname = 'company_events_insert_operator_plus') then
    drop policy company_events_insert_operator_plus on public.company_events;
  end if;
end $$;

create policy company_events_super_admin_bypass on public.company_events
  for all using (true) with check (true);

create policy company_events_same_org_read on public.company_events
  for select using (
    org_id = (select org_id from public.memberships m where m.user_id = auth.uid() limit 1)
  );

create policy company_events_insert_operator_plus on public.company_events
  for insert with check (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.org_id = company_events.org_id
        and m.role in ('OPERATOR','MANAGER','ADMIN')
      limit 1
    )
  );