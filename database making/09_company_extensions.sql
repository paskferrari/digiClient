-- Company extensions: status, assignment, timestamps, and events

-- Enum for company status (idempotent)
do $$ begin
  if not exists (select 1 from pg_type where typname = 'company_status') then
    create type company_status as enum ('ACTIVE','PENDING','SUSPENDED','ARCHIVED');
  end if;
end $$;

-- Extend companies table
alter table public.companies
  add column if not exists status company_status not null default 'PENDING';

alter table public.companies
  add column if not exists assigned_to uuid references public.memberships(id) on delete set null;

alter table public.companies
  add column if not exists created_at timestamptz not null default now();

alter table public.companies
  add column if not exists updated_at timestamptz;

-- Helpful indexes
create index if not exists companies_status_idx on public.companies(status);
create index if not exists companies_assigned_to_idx on public.companies(assigned_to);

-- Company events table (idempotent create)
create table if not exists public.company_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_membership_id uuid not null references public.memberships(id) on delete restrict,
  type text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists company_events_company_idx on public.company_events(company_id);
create index if not exists company_events_org_idx on public.company_events(org_id);

-- Enable RLS and policies for company_events
alter table public.company_events enable row level security;

-- Read: same-org members
drop policy if exists org_members_read_company_events on public.company_events;
create policy org_members_read_company_events on public.company_events
  for select using (
    exists (
      select 1 from public.memberships m
      join public.companies c on c.id = public.company_events.company_id
      where m.org_id = c.org_id and m.user_id = auth.uid()
    )
  );

-- Insert: OPERATOR+ in org
drop policy if exists org_operator_plus_insert_company_events on public.company_events;
create policy org_operator_plus_insert_company_events on public.company_events
  for insert with check (
    exists (
      select 1 from public.memberships m
      join public.companies c on c.id = public.company_events.company_id
      where m.org_id = c.org_id and m.user_id = auth.uid() and m.role in ('OPERATOR','MANAGER','ADMIN')
    )
  );

-- Update: OPERATOR+ in org
drop policy if exists org_operator_plus_update_company_events on public.company_events;
create policy org_operator_plus_update_company_events on public.company_events
  for update using (
    exists (
      select 1 from public.memberships m
      join public.companies c on c.id = public.company_events.company_id
      where m.org_id = c.org_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      join public.companies c on c.id = public.company_events.company_id
      where m.org_id = c.org_id and m.user_id = auth.uid() and m.role in ('OPERATOR','MANAGER','ADMIN')
    )
  );

-- Delete: OPERATOR+ in org
drop policy if exists org_operator_plus_delete_company_events on public.company_events;
create policy org_operator_plus_delete_company_events on public.company_events
  for delete using (
    exists (
      select 1 from public.memberships m
      join public.companies c on c.id = public.company_events.company_id
      where m.org_id = c.org_id and m.user_id = auth.uid() and m.role in ('OPERATOR','MANAGER','ADMIN')
    )
  );