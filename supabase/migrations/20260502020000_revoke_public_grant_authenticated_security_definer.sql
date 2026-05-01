-- Corrección de la migration 20260502010000: REVOKE FROM anon no surtió efecto
-- porque las funciones SECURITY DEFINER tienen GRANT EXECUTE TO PUBLIC por default
-- y todo role (incluido anon) hereda de PUBLIC.
--
-- Patrón correcto: REVOKE FROM PUBLIC, luego GRANT a roles autorizados (authenticated,
-- service_role). Esto cierra anon y mantiene los flujos legítimos.
--
-- Las helpers RLS también necesitan EXECUTE para postgres role (rol que ejecuta RLS
-- evaluations en algunos contextos). Por seguridad, GRANT TO authenticated cubre las
-- llamadas via PostgREST y la evaluación de policies se hace con el rol del caller
-- autenticado, así que basta con authenticated.
--
-- Auditoría: docs/audit/20260501_db_audit.md (sección 4 · Crítica).

do $$
declare
  r record;
  signature text;
begin
  for r in
    select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as args
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef = true
  loop
    signature := format('public.%I(%s)', r.proname, r.args);
    execute format('revoke execute on function %s from public', signature);
    execute format('revoke execute on function %s from anon', signature);
    execute format('grant execute on function %s to authenticated', signature);
    execute format('grant execute on function %s to service_role', signature);
  end loop;
end$$;
