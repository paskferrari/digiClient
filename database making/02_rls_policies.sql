-- Enable RLS and define policies

alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.memberships enable row level security;
alter table public.companies enable row level security;
alter table public.cases enable row level security;
alter table public.case_events enable row level security;
alter table public.documents enable row level security;
alter table public.tasks enable row level security;
alter table public.invitations enable row level security;
alter table public.audit_logs enable row level security;
alter table public.settings enable row level security;

-- Read policies: same-org members can select
create policy org_members_read_memberships on public.memberships
  for select using (exists (select 1 from public.memberships m where m.org_id = public.memberships.org_id and m.user_id = auth.uid()));

create policy org_members_read_companies on public.companies
  for select using (exists (select 1 from public.memberships m where m.org_id = public.companies.org_id and m.user_id = auth.uid()));

create policy org_members_read_cases on public.cases
  for select using (exists (select 1 from public.memberships m where m.org_id = public.cases.org_id and m.user_id = auth.uid()));

create policy org_members_read_documents on public.documents
  for select using (exists (select 1 from public.memberships m where m.org_id = public.documents.org_id and m.user_id = auth.uid()));

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

create policy org_members_read_invitations on public.invitations
  for select using (exists (select 1 from public.memberships m where m.org_id = public.invitations.org_id and m.user_id = auth.uid()));

create policy org_members_read_settings on public.settings
  for select using (exists (select 1 from public.memberships m where m.org_id = public.settings.org_id and m.user_id = auth.uid()));

create policy org_members_read_audit_logs on public.audit_logs
  for select using (exists (select 1 from public.memberships m where m.org_id = public.audit_logs.org_id and m.user_id = auth.uid()));

-- Insert policies: OPERATOR+ can insert in their org
create policy org_operator_plus_insert_companies on public.companies
  for insert with check (exists (select 1 from public.memberships m where m.org_id = public.companies.org_id and m.user_id = auth.uid() and m.role in ('OPERATOR','MANAGER','ADMIN')));

create policy org_operator_plus_insert_cases on public.cases
  for insert with check (exists (select 1 from public.memberships m where m.org_id = public.cases.org_id and m.user_id = auth.uid() and m.role in ('OPERATOR','MANAGER','ADMIN')));

create policy org_operator_plus_insert_documents on public.documents
  for insert with check (exists (select 1 from public.memberships m where m.org_id = public.documents.org_id and m.user_id = auth.uid() and m.role in ('OPERATOR','MANAGER','ADMIN')));

create policy org_operator_plus_insert_case_events on public.case_events
  for insert with check (
    exists (
      select 1 from public.memberships m
      join public.cases c on c.id = public.case_events.case_id
      where m.org_id = c.org_id and m.user_id = auth.uid() and m.role in ('OPERATOR','MANAGER','ADMIN')
    )
  );

create policy org_operator_plus_insert_tasks on public.tasks
  for insert with check (
    exists (
      select 1 from public.memberships m
      join public.cases c on c.id = public.tasks.case_id
      where m.org_id = c.org_id and m.user_id = auth.uid() and m.role in ('OPERATOR','MANAGER','ADMIN')
    )
  );

create policy org_admin_insert_invitations on public.invitations
  for insert with check (exists (select 1 from public.memberships m where m.org_id = public.invitations.org_id and m.user_id = auth.uid() and m.role = 'ADMIN'));

-- Update policies: OPERATOR+ generally; some actions require MANAGER+
create policy org_operator_plus_update_companies on public.companies
  for update using (exists (select 1 from public.memberships m where m.org_id = public.companies.org_id and m.user_id = auth.uid()))
  with check (
    exists (select 1 from public.memberships m where m.org_id = public.companies.org_id and m.user_id = auth.uid() and m.role in ('OPERATOR','MANAGER','ADMIN'))
  );

create policy org_operator_plus_update_cases on public.cases
  for update using (exists (select 1 from public.memberships m where m.org_id = public.cases.org_id and m.user_id = auth.uid()))
  with check (
    exists (select 1 from public.memberships m where m.org_id = public.cases.org_id and m.user_id = auth.uid() and m.role in ('OPERATOR','MANAGER','ADMIN'))
  );

create policy org_operator_plus_update_documents on public.documents
  for update using (exists (select 1 from public.memberships m where m.org_id = public.documents.org_id and m.user_id = auth.uid()))
  with check (
    exists (select 1 from public.memberships m where m.org_id = public.documents.org_id and m.user_id = auth.uid() and m.role in ('OPERATOR','MANAGER','ADMIN'))
  );

create policy org_operator_plus_update_case_events on public.case_events
  for update using (
    exists (
      select 1 from public.memberships m
      join public.cases c on c.id = public.case_events.case_id
      where m.org_id = c.org_id and m.user_id = auth.uid()
    )
  )
  with check (
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

create policy org_operator_plus_update_tasks on public.tasks
  for update using (
    exists (
      select 1 from public.memberships m
      join public.cases c on c.id = public.tasks.case_id
      where m.org_id = c.org_id and m.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      join public.cases c on c.id = public.tasks.case_id
      where m.org_id = c.org_id and m.user_id = auth.uid() and m.role in ('OPERATOR','MANAGER','ADMIN')
    )
  );

create policy org_admin_update_settings on public.settings
  for update using (exists (select 1 from public.memberships m where m.org_id = public.settings.org_id and m.user_id = auth.uid()))
  with check (exists (select 1 from public.memberships m where m.org_id = public.settings.org_id and m.user_id = auth.uid() and m.role = 'ADMIN'));

-- Delete policies
create policy org_operator_plus_delete_companies on public.companies
  for delete using (exists (select 1 from public.memberships m where m.org_id = public.companies.org_id and m.user_id = auth.uid() and m.role in ('OPERATOR','MANAGER','ADMIN')));

create policy org_operator_plus_delete_cases on public.cases
  for delete using (exists (select 1 from public.memberships m where m.org_id = public.cases.org_id and m.user_id = auth.uid() and m.role in ('OPERATOR','MANAGER','ADMIN')));

create policy org_operator_plus_delete_documents on public.documents
  for delete using (exists (select 1 from public.memberships m where m.org_id = public.documents.org_id and m.user_id = auth.uid() and m.role in ('OPERATOR','MANAGER','ADMIN')));

create policy org_operator_plus_delete_tasks on public.tasks
  for delete using (
    exists (select 1 from public.memberships m join public.cases c on c.id = public.tasks.case_id where m.org_id = c.org_id and m.user_id = auth.uid() and m.role in ('OPERATOR','MANAGER','ADMIN'))
  );

create policy org_admin_delete_settings on public.settings
  for delete using (exists (select 1 from public.memberships m where m.org_id = public.settings.org_id and m.user_id = auth.uid() and m.role = 'ADMIN'));