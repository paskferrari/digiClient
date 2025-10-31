-- Audit log performance indexes and trigram search support (environment setup script)
-- Safe to run multiple times due to IF NOT EXISTS

-- Enable pg_trgm for fast ILIKE matching on text columns
create extension if not exists pg_trgm;

-- Composite index to speed up filtering by organization and ordering by date
create index if not exists audit_logs_org_created_idx on public.audit_logs(org_id, created_at);

-- Equality filter indexes
create index if not exists audit_logs_action_idx on public.audit_logs(action);
create index if not exists audit_logs_target_table_idx on public.audit_logs(target_table);
create index if not exists audit_logs_actor_idx on public.audit_logs(actor_user_id);
create index if not exists audit_logs_target_id_idx on public.audit_logs(target_id);

-- Trigram GIN indexes to accelerate free-text searches (q) on text fields
create index if not exists audit_logs_action_trgm_idx on public.audit_logs using gin (action gin_trgm_ops);
create index if not exists audit_logs_target_table_trgm_idx on public.audit_logs using gin (target_table gin_trgm_ops);

-- Cases: speed up org filter + created ordering on lists
create index if not exists cases_org_created_idx on public.cases(org_id, created_at);