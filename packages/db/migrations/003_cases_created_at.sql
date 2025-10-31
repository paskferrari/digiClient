-- Add created_at to public.cases with safe backfill
alter table public.cases add column if not exists created_at timestamptz;

-- Backfill existing rows: prefer earliest known timestamp
update public.cases
set created_at = coalesce(created_at, updated_at, now())
where created_at is null;

-- Enforce NOT NULL and default for future inserts
alter table public.cases alter column created_at set not null;
alter table public.cases alter column created_at set default now();

-- Helpful index for filtering by org and ordering by creation date
create index if not exists cases_org_created_idx on public.cases(org_id, created_at);