-- Security advisor 0008 (rls_enabled_no_policy): la tabla archive
-- tiene RLS activado sin policy → bloquea TODO acceso. Esto suele ser
-- accidental. Conserva acceso server-side via service_role + admin
-- client; bloquea anon/authenticated explicitamente con deny-all.

create policy treasury_account_currencies_archive_no_direct_access
  on public.treasury_account_currencies_archive
  as permissive for all to authenticated
  using (false) with check (false);
