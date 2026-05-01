-- Fase RRHH · Fix de advisors de seguridad tras aplicar el schema.
--
-- 1. security_definer_view en salary_structure_current_amount:
--    Las vistas en Postgres 14+ pueden crearse con `security_invoker = true`
--    para que respeten RLS del usuario que consulta (no del creador).
--    La vista base no agrega lógica que justifique elevar privilegios.
--
-- 2. function_search_path_mutable en hr_recalc_settlement_totals:
--    El trigger necesita `set search_path = public` inmutable para
--    prevenir search-path hijacking. Además se marca explícitamente como
--    `security invoker` (es la semántica que necesitamos: el trigger corre
--    bajo el rol del usuario que disparó la mutación).
--
-- 3. hr_job_runs sin policy (INFO, no bloqueante):
--    La tabla sólo se escribe/lee desde RPCs SECURITY DEFINER. Para
--    silenciar el advisor y documentar explícitamente que ningún cliente
--    puede acceder, agregamos una policy `using (false)` deny-all.

drop view if exists public.salary_structure_current_amount;
create view public.salary_structure_current_amount
  with (security_invoker = true) as
select salary_structure_id, amount
from public.salary_structure_versions
where end_date is null;

create or replace function public.hr_recalc_settlement_totals()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_settlement_id uuid;
  v_adjustments_total numeric(18,2);
  v_base_amount numeric(18,2);
begin
  v_settlement_id := coalesce(new.settlement_id, old.settlement_id);
  select coalesce(sum(case when type = 'descuento' then -amount else amount end), 0)
    into v_adjustments_total
    from public.payroll_settlement_adjustments
    where settlement_id = v_settlement_id;
  select base_amount into v_base_amount
    from public.payroll_settlements
    where id = v_settlement_id;
  update public.payroll_settlements
     set adjustments_total = v_adjustments_total,
         total_amount = coalesce(v_base_amount, 0) + v_adjustments_total,
         updated_at = now()
   where id = v_settlement_id;
  return null;
end;
$$;

drop policy if exists hr_job_runs_no_direct_access on public.hr_job_runs;
create policy hr_job_runs_no_direct_access on public.hr_job_runs
  as permissive for all to authenticated
  using (false) with check (false);
