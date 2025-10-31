-- RLS visibility tests (Supabase-compatible)
-- IMPORTANT: These tests assume the following test users exist in auth.users:
--   admin:    aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa
--   manager:  bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb
--   operator: cccccccc-cccc-cccc-cccc-cccccccccccc
--   viewer:   dddddddd-dddd-dddd-dddd-dddddddddddd
-- Create those users via Supabase auth admin API or insert manually if permitted.

begin;

-- Seed organizations
insert into public.organizations (id, name, type)
values
  ('00000000-0000-0000-0000-000000000001', 'DigiClient', 'platform')
on conflict (id) do nothing;

insert into public.organizations (id, name, type)
values
  ('11111111-1111-1111-1111-111111111111', 'Associazione Alfa', 'association')
on conflict (id) do nothing;

-- Seed profiles (1:1 con auth.users) - dinamico per evitare FK error
insert into public.profiles (id, email, full_name)
select u.id, u.email,
  case u.email
    when 'admin@example.com' then 'Admin User'
    when 'manager@example.com' then 'Manager User'
    when 'operator@example.com' then 'Operator User'
    when 'viewer@example.com' then 'Viewer User'
    else u.email
  end
from auth.users u
where u.email in ('admin@example.com','manager@example.com','operator@example.com','viewer@example.com')
on conflict (id) do nothing;

-- Precheck: assicurati che i 4 profili di test esistano prima di procedere
do $$
declare missing integer;
begin
  select 4 - count(*) into missing
  from public.profiles
  where email in (
    'admin@example.com','manager@example.com','operator@example.com','viewer@example.com'
  );
  if missing > 0 then
    raise exception 'Missing % test profiles. Create users in Supabase Auth (admin@example.com, manager@example.com, operator@example.com, viewer@example.com) before running tests.', missing;
  end if;
end $$;

-- Seed memberships usando gli id reali
insert into public.memberships (id, org_id, user_id, role)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaa01', '00000000-0000-0000-0000-000000000001', (select id from public.profiles where email = 'admin@example.com'), 'ADMIN'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', '11111111-1111-1111-1111-111111111111', (select id from public.profiles where email = 'manager@example.com'), 'MANAGER'),
  ('cccccccc-cccc-cccc-cccc-cccccccccc01', '11111111-1111-1111-1111-111111111111', (select id from public.profiles where email = 'operator@example.com'), 'OPERATOR'),
  ('dddddddd-dddd-dddd-dddd-dddddddddd01', '11111111-1111-1111-1111-111111111111', (select id from public.profiles where email = 'viewer@example.com'), 'VIEWER')
on conflict (id) do nothing;

-- Seed a company and a case under Associazione Alfa
insert into public.companies (id, org_id, vat_number, legal_name, ateco_code, province, created_by)
values (
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  '11111111-1111-1111-1111-111111111111',
  'IT12345678901',
  'Rossi S.p.A.',
  '62.01',
  'MI',
  'cccccccc-cccc-cccc-cccc-cccccccccc01' -- operator membership
)
on conflict (id) do nothing;

insert into public.cases (id, org_id, company_id, status, priority, assigned_to, created_by, updated_at)
values (
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  '11111111-1111-1111-1111-111111111111',
  'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  'NEW',
  'MEDIUM',
  null,
  'cccccccc-cccc-cccc-cccc-cccccccccc01',
  now()
)
on conflict (id) do nothing;

insert into public.documents (id, case_id, org_id, kind, filename, storage_path, mime, size, uploaded_by, status)
values (
  '99999999-9999-9999-9999-999999999999',
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  '11111111-1111-1111-1111-111111111111',
  'ID',
  'id-rossi.pdf',
  '/docs/id-rossi.pdf',
  'application/pdf',
  123456,
  'cccccccc-cccc-cccc-cccc-cccccccccc01',
  'PENDING'
)
on conflict (id) do nothing;

insert into public.tasks (id, case_id, title, due_date, status, assignee_membership_id, created_by)
values (
  '77777777-7777-7777-7777-777777777777',
  'ffffffff-ffff-ffff-ffff-ffffffffffff',
  'Raccogli documenti',
  current_date + 7,
  'OPEN',
  'cccccccc-cccc-cccc-cccc-cccccccccc01',
  'cccccccc-cccc-cccc-cccc-cccccccccc01'
)
on conflict (id) do nothing;

set role authenticated; -- applica RLS solo da qui in poi

-- ============ TESTS ============
select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select id from public.profiles where email = 'viewer@example.com'))::text,
  true
);
-- Read visibility
select 'viewer_companies_count', count(*) from public.companies where org_id = '11111111-1111-1111-1111-111111111111'; -- expected >= 1
select 'viewer_cases_count', count(*) from public.cases where org_id = '11111111-1111-1111-1111-111111111111'; -- expected >= 1
select 'viewer_documents_count', count(*) from public.documents where org_id = '11111111-1111-1111-1111-111111111111'; -- expected >= 1
select 'viewer_tasks_count', count(*) from public.tasks t join public.cases c on c.id = t.case_id where c.org_id = '11111111-1111-1111-1111-111111111111'; -- expected >= 1
-- Expected failures (permission denied)
-- update case should fail for viewer
do $$ begin
  update public.cases set status = 'IN_PROGRESS' where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
exception when others then
  raise notice 'viewer update cases denied: OK';
end $$;

-- Operator tests: can mutate (non-assignment/approval)
select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select id from public.profiles where email = 'operator@example.com'))::text,
  true
);
update public.cases set status = 'IN_PROGRESS' where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
update public.documents set virus_scanned = true where id = '99999999-9999-9999-9999-999999999999';
-- Attempt approval as operator (should fail)
do $$ begin
  update public.documents set status = 'APPROVED' where id = '99999999-9999-9999-9999-999999999999';
exception when others then
  raise notice 'operator approve document denied: OK';
end $$;

-- Manager tests: can assign and approve
select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select id from public.profiles where email = 'manager@example.com'))::text,
  true
);
update public.cases set assigned_to = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbb01', status = 'ASSIGNED' where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
update public.documents set status = 'APPROVED' where id = '99999999-9999-9999-9999-999999999999';

-- Super-admin bypass: can do everything anywhere
select set_config(
  'request.jwt.claims',
  json_build_object('sub', (select id from public.profiles where email = 'admin@example.com'))::text,
  true
);
update public.cases set status = 'SCREENING' where id = 'ffffffff-ffff-ffff-ffff-ffffffffffff';
delete from public.tasks where id = '77777777-7777-7777-7777-777777777777';
rollback; -- rollback test data