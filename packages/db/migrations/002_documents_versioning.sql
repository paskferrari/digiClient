-- Documents versioning: superseded_by
alter table public.documents add column if not exists superseded_by uuid references public.documents(id) on delete set null;
create index if not exists documents_superseded_idx on public.documents(superseded_by);