-- Triggers and functions for automatic updates and audit

-- Update cases.updated_at on related changes
create or replace function public.touch_cases_updated_at()
returns trigger as $$
begin
  update public.cases set updated_at = now() where id = coalesce(NEW.case_id, OLD.case_id);
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists touch_cases_on_case_events on public.case_events;
create trigger touch_cases_on_case_events
after insert or update or delete on public.case_events
for each row execute function public.touch_cases_updated_at();

drop trigger if exists touch_cases_on_tasks on public.tasks;
create trigger touch_cases_on_tasks
after insert or update or delete on public.tasks
for each row execute function public.touch_cases_updated_at();

-- Maintain documents.updated_at on content changes
create or replace function public.touch_documents_updated_at()
returns trigger as $$
begin
  update public.documents set updated_at = now() where id = coalesce(NEW.id, OLD.id);
  return null;
end;
$$ language plpgsql security definer;

drop trigger if exists touch_documents_on_update on public.documents;
create trigger touch_documents_on_update
after update on public.documents
for each row execute function public.touch_documents_updated_at();

-- Audit log helper and triggers
create or replace function public.audit_log_change()
returns trigger as $$
declare
  v_action text;
  v_actor_user uuid;
  v_org uuid;
begin
  if tg_op = 'INSERT' then v_action := 'INSERT';
  elsif tg_op = 'UPDATE' then v_action := 'UPDATE';
  elsif tg_op = 'DELETE' then v_action := 'DELETE';
  end if;

  -- Infer org and actor_user_id depending on table
  if tg_table_name = 'companies' then
    v_org := coalesce(NEW.org_id, OLD.org_id);
    select user_id into v_actor_user from public.memberships where id = coalesce(NEW.created_by, OLD.created_by);
  elsif tg_table_name = 'cases' then
    v_org := coalesce(NEW.org_id, OLD.org_id);
    select user_id into v_actor_user from public.memberships where id = coalesce(NEW.created_by, OLD.created_by);
  elsif tg_table_name = 'documents' then
    v_org := coalesce(NEW.org_id, OLD.org_id);
    select user_id into v_actor_user from public.memberships where id = coalesce(NEW.uploaded_by, OLD.uploaded_by);
  elsif tg_table_name = 'tasks' then
    select c.org_id into v_org from public.cases c where c.id = coalesce(NEW.case_id, OLD.case_id);
    select user_id into v_actor_user from public.memberships where id = coalesce(NEW.created_by, OLD.created_by);
  elsif tg_table_name = 'invitations' then
    v_org := coalesce(NEW.org_id, OLD.org_id);
    select user_id into v_actor_user from public.memberships where id = coalesce(NEW.invited_by, OLD.invited_by);
  elsif tg_table_name = 'settings' then
    v_org := coalesce(NEW.org_id, OLD.org_id);
    v_actor_user := auth.uid();
    if v_actor_user is null then
      select user_id into v_actor_user from public.memberships where org_id = v_org order by created_at limit 1;
    end if;
  end if;

  insert into public.audit_logs(org_id, actor_user_id, action, target_table, target_id)
  values (v_org, v_actor_user, v_action, tg_table_name, coalesce(NEW.id, OLD.id));

  return null;
end;
$$ language plpgsql security definer;

-- Attach audit triggers to selected tables
drop trigger if exists audit_on_companies on public.companies;
create trigger audit_on_companies
after insert or update or delete on public.companies
for each row execute function public.audit_log_change();

drop trigger if exists audit_on_cases on public.cases;
create trigger audit_on_cases
after insert or update or delete on public.cases
for each row execute function public.audit_log_change();

drop trigger if exists audit_on_documents on public.documents;
create trigger audit_on_documents
after insert or update or delete on public.documents
for each row execute function public.audit_log_change();

drop trigger if exists audit_on_tasks on public.tasks;
create trigger audit_on_tasks
after insert or update or delete on public.tasks
for each row execute function public.audit_log_change();

drop trigger if exists audit_on_invitations on public.invitations;
create trigger audit_on_invitations
after insert or update or delete on public.invitations
for each row execute function public.audit_log_change();

drop trigger if exists audit_on_settings on public.settings;
create trigger audit_on_settings
after insert or update or delete on public.settings
for each row execute function public.audit_log_change();