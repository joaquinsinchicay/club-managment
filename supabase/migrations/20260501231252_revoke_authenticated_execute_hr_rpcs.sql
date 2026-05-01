-- Cierra las 12 RPCs HR SECURITY DEFINER al rol authenticated.
--
-- Motivo: las funciones validan club_id contextual pero NO validan rol `rrhh`
-- internamente (verificado: prosrc no contiene `current_user_has_role('rrhh')`).
-- La autorización HR vive en lib/domain/authorization (server-side) y los repos
-- HR llaman a estas RPCs siempre via createRequiredAdminSupabaseClient (service_role),
-- nunca con el JWT del usuario.
--
-- Por lo tanto: revocar EXECUTE de authenticated NO rompe ningún flujo legítimo
-- (server sigue invocando con service_role). Cierra el gap de que cualquier signed-in
-- user con sesión activa pudiera setear app.current_club_id y operar payroll.
--
-- Auditoría: docs/audit/20260501_db_audit.md (sección 4 · "RPCs · authenticated · Alta").
-- Advisor 0029_authenticated_security_definer_function_executable.

revoke execute on function public.hr_annul_settlement(uuid, text)        from authenticated;
revoke execute on function public.hr_approve_settlement(uuid, boolean)   from authenticated;
revoke execute on function public.hr_approve_settlements_bulk(uuid[], boolean) from authenticated;
revoke execute on function public.hr_create_contract_with_initial_revision(uuid, uuid, date, date, numeric, text) from authenticated;
revoke execute on function public.hr_create_salary_revision(uuid, numeric, date, text) from authenticated;
revoke execute on function public.hr_create_salary_revisions_bulk(uuid[], public.salary_revision_adjustment_type, numeric, date, text) from authenticated;
revoke execute on function public.hr_finalize_contract(uuid, date, text) from authenticated;
revoke execute on function public.hr_finalize_contracts_due_today_all_clubs() from authenticated;
revoke execute on function public.hr_generate_monthly_settlements(uuid, integer, integer) from authenticated;
revoke execute on function public.hr_pay_settlement(uuid, uuid, date, text, text, text, uuid) from authenticated;
revoke execute on function public.hr_pay_settlements_batch(uuid[], uuid, date, text, text[]) from authenticated;
revoke execute on function public.hr_return_settlement_to_generated(uuid, text) from authenticated;
