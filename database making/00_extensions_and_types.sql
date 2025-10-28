-- Extensions & Enums
create extension if not exists pgcrypto;

-- Organization types
do $$ begin
  if not exists (select 1 from pg_type where typname = 'organization_type') then
    create type organization_type as enum ('association','platform');
  end if;
end $$;

-- Roles
do $$ begin
  if not exists (select 1 from pg_type where typname = 'membership_role') then
    create type membership_role as enum ('ADMIN','MANAGER','OPERATOR','VIEWER');
  end if;
end $$;

-- Case status
do $$ begin
  if not exists (select 1 from pg_type where typname = 'case_status') then
    create type case_status as enum (
      'NEW','SCREENING','REJECTED','APPROVED','ASSIGNED','DOCS_REQUESTED',
      'IN_PROGRESS','SUBMITTED','FUNDED','CLOSED_LOST'
    );
  end if;
end $$;

-- Priority
do $$ begin
  if not exists (select 1 from pg_type where typname = 'priority_level') then
    create type priority_level as enum ('LOW','MEDIUM','HIGH');
  end if;
end $$;

-- Case event type
do $$ begin
  if not exists (select 1 from pg_type where typname = 'case_event_type') then
    create type case_event_type as enum ('STATUS_CHANGE','COMMENT','DOC_REQUEST','DOC_UPLOAD','ASSIGNMENT','NOTE');
  end if;
end $$;

-- Document status & kind
do $$ begin
  if not exists (select 1 from pg_type where typname = 'document_status') then
    create type document_status as enum ('PENDING','APPROVED','REJECTED');
  end if;
end $$;
do $$ begin
  if not exists (select 1 from pg_type where typname = 'document_kind') then
    create type document_kind as enum ('ID','IBAN','BILANCIO','DURC','ALTRO');
  end if;
end $$;

-- Task status
do $$ begin
  if not exists (select 1 from pg_type where typname = 'task_status') then
    create type task_status as enum ('OPEN','DONE','CANCELLED');
  end if;
end $$;