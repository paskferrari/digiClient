-- Demo seed script
-- NOTE: sostituisci {{USER_ID}} e {{SECOND_USER_ID}} con UUID reali di utenti
-- registrati in Supabase Auth prima di eseguire questo seed.

do $$
declare
  v_org uuid := gen_random_uuid();
  v_company uuid := gen_random_uuid();
  v_case uuid := gen_random_uuid();
  v_doc uuid := gen_random_uuid();
  v_admin_membership uuid := gen_random_uuid();
  v_operator_membership uuid := gen_random_uuid();
  v_user uuid := '605e90bc-0d20-4036-841b-e907a245de42'::uuid;   -- ADMIN
  v_user2 uuid := 'dee89b76-9baa-4a8d-bc5d-551396947946'::uuid;   -- OPERATOR
begin
  -- Organization
  insert into public.organizations(id, name, type)
  values (v_org, 'Organizzazione Demo', 'association');

  -- Memberships (richiede che gli utenti esistano in auth.users)
  insert into public.memberships(id, org_id, user_id, role)
  values
    (v_admin_membership, v_org, v_user, 'ADMIN'),
    (v_operator_membership, v_org, v_user2, 'OPERATOR');

  -- Company
  insert into public.companies(id, org_id, vat_number, legal_name, created_by)
  values (v_company, v_org, 'IT12345678901', 'ACME S.p.A.', v_admin_membership);

  -- Case
  insert into public.cases(id, org_id, company_id, status, priority, created_by)
  values (v_case, v_org, v_company, 'NEW', 'MEDIUM', v_admin_membership);

  -- Case events
  insert into public.case_events(id, case_id, actor_membership_id, type, payload)
  values
    (gen_random_uuid(), v_case, v_admin_membership, 'STATUS_CHANGE', '{"status":"NEW"}'),
    (gen_random_uuid(), v_case, v_admin_membership, 'NOTE', '{"text":"Raccolti documenti preliminari"}');

  -- Tasks
  insert into public.tasks(id, case_id, title, status, created_by)
  values
    (gen_random_uuid(), v_case, 'Verificare visura camerale', 'OPEN', v_admin_membership),
    (gen_random_uuid(), v_case, 'Contattare referente ACME', 'OPEN', v_admin_membership);

  -- Document
  insert into public.documents(
    id, case_id, org_id, kind, filename, storage_path, mime, size, uploaded_by, status
  )
  values (
    v_doc, v_case, v_org, 'ALTRO', 'contratto.pdf', v_org::text || '/' || v_doc::text || '/contratto.pdf',
    'application/pdf', 12345, v_admin_membership, 'PENDING'
  );

  -- Settings
  insert into public.settings(id, org_id, key, value)
  values (gen_random_uuid(), v_org, 'notifications_enabled', 'true'::jsonb);
end $$;