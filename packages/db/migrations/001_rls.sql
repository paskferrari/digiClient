-- Drizzle SQL migration: Row Level Security (RLS) policies
-- Default: deny all. Then allow per-org membership and role-based mutations.

-- Enable RLS on target tables
alter table public.cases enable row level security;
alter table public.documents enable row level security;
alter table public.companies enable row level security;
alter table public.case_events enable row level security;
alter table public.tasks enable row level security;
alter table public.settings enable row level security;

// Aggiunta: rendi idempotente la migrazione eliminando le policy esistenti
drop policy if exists superadmin_bypass on public.cases;
drop policy if exists superadmin_bypass on public.documents;
drop policy if exists superadmin_bypass on public.companies;
drop policy if exists superadmin_bypass on public.case_events;
drop policy if exists superadmin_bypass on public.tasks;
drop policy if exists superadmin_bypass on public.settings;

drop policy if exists org_members_read_cases on public.cases;
drop policy if exists org_members_read_documents on public.documents;
drop policy if exists org_members_read_companies on public.companies;
drop policy if exists org_members_read_case_events on public.case_events;
drop policy if exists org_members_read_tasks on public.tasks;
drop policy if exists org_members_read_settings on public.settings;

drop policy if exists org_operator_plus_insert_companies on public.companies;
drop policy if exists org_operator_plus_insert_cases on public.cases;
drop policy if exists org_operator_plus_insert_documents on public.documents;
drop policy if exists org_operator_plus_insert_case_events on public.case_events;
drop policy if exists org_operator_plus_insert_tasks on public.tasks;
drop policy if exists org_admin_insert_settings on public.settings;

drop policy if exists org_operator_plus_update_companies on public.companies;
drop policy if exists org_operator_plus_update_cases on public.cases;
drop policy if exists org_operator_plus_update_documents on public.documents;
drop policy if exists org_operator_plus_update_case_events on public.case_events;
drop policy if exists org_operator_plus_update_tasks on public.tasks;
drop policy if exists org_admin_update_settings on public.settings;

drop policy if exists org_operator_plus_delete_companies on public.companies;
drop policy if exists org_operator_plus_delete_cases on public.cases;
drop policy if exists org_operator_plus_delete_documents on public.documents;
drop policy if exists org_operator_plus_delete_case_events on public.case_events;
drop policy if exists org_operator_plus_delete_tasks on public.tasks;
drop policy if exists org_admin_delete_settings on public.settings;

-- =====================================================================
-- Super-admin bypass: membership on platform org with role ADMIN
-- =====================================================================
create policy superadmin_bypass on public.cases
  for all using (
    exists (
      select 1 from public.memberships m
      join public.organizations o on o.id = m.org_id
      where m.user_id = auth.uid() and o.type = 'platform' and m.role = 'ADMIN'
    )
  );

create policy superadmin_bypass on public.documents
  for all using (
    exists (
      select 1 from public.memberships m
      join public.organizations o on o.id = m.org_id
      where m.user_id = auth.uid() and o.type = 'platform' and m.role = 'ADMIN'
    )
  );

create policy superadmin_bypass on public.companies
  for all using (
    exists (
      select 1 from public.memberships m
      join public.organizations o on o.id = m.org_id
      where m.user_id = auth.uid() and o.type = 'platform' and m.role = 'ADMIN'
    )
  );

create policy superadmin_bypass on public.case_events
  for all using (
    exists (
      select 1 from public.memberships m
      join public.organizations o on o.id = m.org_id
      where m.user_id = auth.uid() and o.type = 'platform' and m.role = 'ADMIN'
    )
  );

create policy superadmin_bypass on public.tasks
  for all using (
    exists (
      select 1 from public.memberships m
      join public.organizations o on o.id = m.org_id
      where m.user_id = auth.uid() and o.type = 'platform' and m.role = 'ADMIN'
    )
  );

create policy superadmin_bypass on public.settings
  for all using (
    exists (
      select 1 from public.memberships m
      join public.organizations o on o.id = m.org_id
      where m.user_id = auth.uid() and o.type = 'platform' and m.role = 'ADMIN'
    )
  );

-- =====================================================================
-- Same-org read access: any member of the org can SELECT rows of that org
-- =====================================================================
create policy org_members_read_cases on public.cases
  for select using (
    exists (
      select 1 from public.memberships m
      where m.org_id = public.cases.org_id and m.user_id = auth.uid()
    )
  );

create policy org_members_read_documents on public.documents
  for select using (
    exists (
      select 1 from public.memberships m
      where m.org_id = public.documents.org_id and m.user_id = auth.uid()
    )
  );

create policy org_members_read_companies on public.companies
  for select using (
    exists (
      select 1 from public.memberships m
      where m.org_id = public.companies.org_id and m.user_id = auth.uid()
    )
  );

create policy org_members_read_case_events on public.case_events
  for select using (
    exists (
      select 1 from public.memberships m
      join public.cases c on c.id = public.case_events.case_id
      where m.org_id = c.org_id and m.user_id = auth.uid()
    )
  );

create policy org_members_read_tasks on public.tasks
  for select using (
    exists (
      select 1 from public.memberships m
      join public.cases c on c.id = public.tasks.case_id
      where m.org_id = c.org_id and m.user_id = auth.uid()
    )
  );

-- Settings: only org members can read, only ADMIN can write
create policy org_members_read_settings on public.settings
  for select using (
    exists (
      select 1 from public.memberships m
      where m.org_id = public.settings.org_id and m.user_id = auth.uid()
    )
  );

-- =====================================================================
-- Insert policies (role-based)
-- =====================================================================
-- Companies: OPERATOR+ can insert
create policy org_operator_plus_insert_companies on public.companies
  for insert with check (
    exists (
      select 1 from public.memberships m
      where m.org_id = public.companies.org_id and m.user_id = auth.uid()
        and m.role in ('OPERATOR','MANAGER','ADMIN')
    )
  );

-- Cases: OPERATOR+ can insert
create policy org_operator_plus_insert_cases on public.cases
  for insert with check (
    exists (
      select 1 from public.memberships m
      where m.org_id = public.cases.org_id and m.user_id = auth.uid()
        and m.role in ('OPERATOR','MANAGER','ADMIN')
    )
  );

-- Documents: OPERATOR+ can insert
create policy org_operator_plus_insert_documents on public.documents
  for insert with check (
    exists (
      select 1 from public.memberships m
      where m.org_id = public.documents.org_id and m.user_id = auth.uid()
        and m.role in ('OPERATOR','MANAGER','ADMIN')
    )
  );

-- Case events: OPERATOR+ can insert; ASSIGNMENT requires MANAGER+
create policy org_operator_plus_insert_case_events on public.case_events
  for insert with check (
    exists (
      select 1 from public.memberships m
      join public.cases c on c.id = public.case_events.case_id
      where m.org_id = c.org_id and m.user_id = auth.uid()
        and (
          (public.case_events.type <> 'ASSIGNMENT' and m.role in ('OPERATOR','MANAGER','ADMIN'))
          or (public.case_events.type = 'ASSIGNMENT' and m.role in ('MANAGER','ADMIN'))
        )
    )
  );

-- Tasks: OPERATOR+ can insert
create policy org_operator_plus_insert_tasks on public.tasks
  for insert with check (
    exists (
      select 1 from public.memberships m
      join public.cases c on c.id = public.tasks.case_id
      where m.org_id = c.org_id and m.user_id = auth.uid()
        and m.role in ('OPERATOR','MANAGER','ADMIN')
    )
  );

-- Settings: only ADMIN can insert/update/delete
create policy org_admin_insert_settings on public.settings
  for insert with check (
    exists (
      select 1 from public.memberships m
      where m.org_id = public.settings.org_id and m.user_id = auth.uid() and m.role = 'ADMIN'
    )
  );

-- =====================================================================
-- Update policies (role-based, with manager+ guard on certain fields)
-- =====================================================================
-- Companies: OPERATOR+ can update
create policy org_operator_plus_update_companies on public.companies
  for update using (
    exists (
      select 1 from public.memberships m
      where m.org_id = public.companies.org_id and m.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.memberships m
      where m.org_id = public.companies.org_id and m.user_id = auth.uid()
        and m.role in ('OPERATOR','MANAGER','ADMIN')
    )
  );

-- Cases: OPERATOR+ can update generally; ASSIGNMENT/APPROVAL require MANAGER+
create policy org_operator_plus_update_cases on public.cases
  for update using (
    exists (
      select 1 from public.memberships m
      where m.org_id = public.cases.org_id and m.user_id = auth.uid()
    )
  ) with check (
    -- Must be member with OPERATOR+ and if assignment/approval, must be MANAGER+
    exists (
      select 1 from public.memberships m
      where m.org_id = public.cases.org_id and m.user_id = auth.uid()
        and m.role in ('OPERATOR','MANAGER','ADMIN')
    )
    and (
      -- no special action
      (
        (public.cases.assigned_to is null) and public.cases.status not in ('APPROVED','REJECTED','ASSIGNED')
      )
      or (
        exists (
          select 1 from public.memberships m2
          where m2.org_id = public.cases.org_id and m2.user_id = auth.uid() and m2.role in ('MANAGER','ADMIN')
        )
      )
    )
  );

-- Documents: OPERATOR+ can update generally; APPROVE/REJECT require MANAGER+
create policy org_operator_plus_update_documents on public.documents
  for update using (
    exists (
      select 1 from public.memberships m
      where m.org_id = public.documents.org_id and m.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.memberships m
      where m.org_id = public.documents.org_id and m.user_id = auth.uid()
        and m.role in ('OPERATOR','MANAGER','ADMIN')
    )
    and (
      (public.documents.status not in ('APPROVED','REJECTED'))
      or (
        exists (
          select 1 from public.memberships m2
          where m2.org_id = public.documents.org_id and m2.user_id = auth.uid() and m2.role in ('MANAGER','ADMIN')
        )
      )
    )
  );

-- Case events: OPERATOR+ can update (rare), ASSIGNMENT requires MANAGER+
create policy org_operator_plus_update_case_events on public.case_events
  for update using (
    exists (
      select 1 from public.memberships m
      join public.cases c on c.id = public.case_events.case_id
      where m.org_id = c.org_id and m.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.memberships m
      join public.cases c on c.id = public.case_events.case_id
      where m.org_id = c.org_id and m.user_id = auth.uid()
        and (
          (public.case_events.type <> 'ASSIGNMENT' and m.role in ('OPERATOR','MANAGER','ADMIN'))
          or (public.case_events.type = 'ASSIGNMENT' and m.role in ('MANAGER','ADMIN'))
        )
    )
  );

-- Tasks: OPERATOR+ can update
create policy org_operator_plus_update_tasks on public.tasks
  for update using (
    exists (
      select 1 from public.memberships m
      join public.cases c on c.id = public.tasks.case_id
      where m.org_id = c.org_id and m.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.memberships m
      join public.cases c on c.id = public.tasks.case_id
      where m.org_id = c.org_id and m.user_id = auth.uid()
        and m.role in ('OPERATOR','MANAGER','ADMIN')
    )
  );

-- Settings: ADMIN only update
create policy org_admin_update_settings on public.settings
  for update using (
    exists (
      select 1 from public.memberships m
      where m.org_id = public.settings.org_id and m.user_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.memberships m
      where m.org_id = public.settings.org_id and m.user_id = auth.uid() and m.role = 'ADMIN'
    )
  );

-- =====================================================================
-- Delete policies
-- =====================================================================
-- Companies: OPERATOR+ can delete
create policy org_operator_plus_delete_companies on public.companies
  for delete using (
    exists (
      select 1 from public.memberships m
      where m.org_id = public.companies.org_id and m.user_id = auth.uid() and m.role in ('OPERATOR','MANAGER','ADMIN')
    )
  );

-- Cases: OPERATOR+ can delete
create policy org_operator_plus_delete_cases on public.cases
  for delete using (
    exists (
      select 1 from public.memberships m
      where m.org_id = public.cases.org_id and m.user_id = auth.uid() and m.role in ('OPERATOR','MANAGER','ADMIN')
    )
  );

-- Documents: OPERATOR+ can delete
create policy org_operator_plus_delete_documents on public.documents
  for delete using (
    exists (
      select 1 from public.memberships m
      where m.org_id = public.documents.org_id and m.user_id = auth.uid() and m.role in ('OPERATOR','MANAGER','ADMIN')
    )
  );

-- Case events: OPERATOR+ can delete
create policy org_operator_plus_delete_case_events on public.case_events
  for delete using (
    exists (
      select 1 from public.memberships m
      join public.cases c on c.id = public.case_events.case_id
      where m.org_id = c.org_id and m.user_id = auth.uid() and m.role in ('OPERATOR','MANAGER','ADMIN')
    )
  );

-- Tasks: OPERATOR+ can delete
create policy org_operator_plus_delete_tasks on public.tasks
  for delete using (
    exists (
      select 1 from public.memberships m
      join public.cases c on c.id = public.tasks.case_id
      where m.org_id = c.org_id and m.user_id = auth.uid() and m.role in ('OPERATOR','MANAGER','ADMIN')
    )
  );

-- Settings: ADMIN only delete
create policy org_admin_delete_settings on public.settings
  for delete using (
    exists (
      select 1 from public.memberships m
      where m.org_id = public.settings.org_id and m.user_id = auth.uid() and m.role = 'ADMIN'
    )
  );

-- End of RLS policies