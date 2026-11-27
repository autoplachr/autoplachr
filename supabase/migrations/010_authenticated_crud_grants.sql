-- 010: Restore CRUD grants for the authenticated role.
-- The RLS policies already scope rows to their owner; without table grants
-- PostgREST returns 42501 "permission denied for table listings" on publish.
grant insert, update on public.listings to authenticated;
grant insert, update on public.profiles to authenticated;
grant insert, update, delete on public.conversations to authenticated;
grant insert, update, delete on public.messages to authenticated;
