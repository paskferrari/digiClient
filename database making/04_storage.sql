-- Storage bucket for documents and related policies

-- Create bucket if not exists (Supabase storage)
insert into storage.buckets (id, name, public)
select 'documents', 'documents', false
where not exists (select 1 from storage.buckets where id = 'documents');

-- Restrict object access by org membership using a naming convention:
-- path: <org_id>/<document_id>/<filename>

-- Read access: user must be a member of the org encoded in the first path segment
create policy "read documents by org membership" on storage.objects
  for select using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.org_id::text = split_part(storage.objects.name, '/', 1)
    )
  );

-- Upload: OPERATOR+ in org can upload into their org namespace
create policy "upload documents by org operators" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.role in ('OPERATOR','MANAGER','ADMIN')
        and m.org_id::text = split_part(storage.objects.name, '/', 1)
    )
  );

-- Update metadata: OPERATOR+
create policy "update documents by org operators" on storage.objects
  for update using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.org_id::text = split_part(storage.objects.name, '/', 1)
    )
  )
  with check (
    exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.role in ('OPERATOR','MANAGER','ADMIN')
        and m.org_id::text = split_part(storage.objects.name, '/', 1)
    )
  );

-- Delete: MANAGER+
create policy "delete documents by org managers" on storage.objects
  for delete using (
    bucket_id = 'documents'
    and exists (
      select 1 from public.memberships m
      where m.user_id = auth.uid()
        and m.role in ('MANAGER','ADMIN')
        and m.org_id::text = split_part(storage.objects.name, '/', 1)
    )
  );