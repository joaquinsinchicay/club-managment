-- Endurecimiento de superficie de API: las 22 funciones SECURITY DEFINER del schema public
-- estaban ejecutables por el rol anon (verificado live + advisor 0028).
--
-- Decisión: REVOKE EXECUTE FROM anon en todas. authenticated y service_role conservan EXECUTE
-- porque la app y los flujos legítimos las invocan desde sesión activa o desde server.
--
-- Las 4 helpers usadas dentro de RLS policies (current_user_*, is_member_of_current_club)
-- también se revocan de anon: no hay flujo no-autenticado que las requiera.
--
-- Auditoría: docs/audit/20260501_db_audit.md (sección 4 · Crítica).
-- Advisor remediation: https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable

-- Helpers de identidad y rol (usadas internamente por RLS policies)
revoke execute on function public.current_user_has_role(text)            from anon;
revoke execute on function public.current_user_role()                    from anon;
revoke execute on function public.current_user_roles()                   from anon;
revoke execute on function public.is_member_of_current_club()            from anon;

-- Bootstrap de sesión por club
revoke execute on function public.set_current_club(uuid)                 from anon;

-- Membership management (admin-only en lógica interna)
revoke execute on function public.approve_membership_for_current_admin(uuid, public.membership_role) from anon;
revoke execute on function public.update_membership_roles_for_current_admin(uuid, public.membership_role[]) from anon;
revoke execute on function public.remove_membership_for_current_actor(uuid) from anon;
revoke execute on function public.get_club_members_for_current_admin(uuid) from anon;
revoke execute on function public.get_pending_club_invitations_for_current_admin(uuid) from anon;

-- Módulo RRHH (rrhh-only en lógica interna; ver docs/pdd/pdd_us_*_rrhh.md)
revoke execute on function public.hr_annul_settlement(uuid, text)        from anon;
revoke execute on function public.hr_approve_settlement(uuid, boolean)   from anon;
revoke execute on function public.hr_approve_settlements_bulk(uuid[], boolean) from anon;
revoke execute on function public.hr_create_contract_with_initial_revision(uuid, uuid, date, date, numeric, text) from anon;
revoke execute on function public.hr_create_salary_revision(uuid, numeric, date, text) from anon;
revoke execute on function public.hr_create_salary_revisions_bulk(uuid[], public.salary_revision_adjustment_type, numeric, date, text) from anon;
revoke execute on function public.hr_finalize_contract(uuid, date, text) from anon;
revoke execute on function public.hr_finalize_contracts_due_today_all_clubs() from anon;
revoke execute on function public.hr_generate_monthly_settlements(uuid, integer, integer) from anon;
revoke execute on function public.hr_pay_settlement(uuid, uuid, date, text, text, text, uuid) from anon;
revoke execute on function public.hr_pay_settlements_batch(uuid[], uuid, date, text, text[]) from anon;
revoke execute on function public.hr_return_settlement_to_generated(uuid, text) from anon;
