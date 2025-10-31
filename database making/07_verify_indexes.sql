-- Verify audit_logs indexes and pg_trgm extension
-- Safe to run; uses EXPLAIN and metadata queries only

begin;

-- Confirm current DB and schema
select current_database() as db, current_schema() as schema;

-- Check table existence
select to_regclass('public.audit_logs') as audit_logs_exists;

-- Confirm pg_trgm is installed
select extname from pg_extension where extname = 'pg_trgm';

-- List indexes on audit_logs
select indexname, indexdef
from pg_indexes
where schemaname = 'public' and tablename = 'audit_logs'
order by indexname;

-- Encourage planner to use indexes for testing
set enable_seqscan = off;

-- Test trigram GIN index usage on action
explain (analyze, buffers)
select id
from public.audit_logs
where action ilike '%approve%'
limit 10;

-- Test trigram GIN index usage on target_table
explain (analyze, buffers)
select id
from public.audit_logs
where target_table ilike '%case%'
limit 10;

-- Test btree composite index on (org_id, created_at)
explain (analyze, buffers)
select id
from public.audit_logs
where org_id is not null
order by created_at desc
limit 10;

rollback;