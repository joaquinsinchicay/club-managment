create or replace function public.hr_generate_monthly_settlements(
  p_year int,
  p_month int
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club_id uuid;
  v_actor uuid;
  v_generated int := 0;
  v_skipped int := 0;
  v_errors int := 0;
  v_period_start date;
  v_period_end date;
  v_contract record;
  v_existing_id uuid;
  v_base_amount numeric(18,2);
  v_requires_hours boolean;
begin
  v_actor := auth.uid();

  begin
    v_club_id := nullif(current_setting('app.current_club_id', true), '')::uuid;
  exception when others then
    v_club_id := null;
  end;

  if v_club_id is null then
    return json_build_object('ok', false, 'code', 'forbidden');
  end if;
  if p_year is null or p_month is null or p_month < 1 or p_month > 12 then
    return json_build_object('ok', false, 'code', 'invalid_period');
  end if;

  v_period_start := make_date(p_year, p_month, 1);
  v_period_end := (v_period_start + interval '1 month - 1 day')::date;

  for v_contract in
    select c.id, c.staff_member_id, c.salary_structure_id,
           c.start_date, c.end_date,
           ss.remuneration_type
    from public.staff_contracts c
    join public.salary_structures ss on ss.id = c.salary_structure_id
    where c.club_id = v_club_id
      and c.status = 'vigente'
      and c.start_date <= v_period_end
      and (c.end_date is null or c.end_date >= v_period_start)
  loop
    select id into v_existing_id
    from public.payroll_settlements
    where contract_id = v_contract.id
      and period_year = p_year
      and period_month = p_month
      and status <> 'anulada'
    limit 1;

    if v_existing_id is not null then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    v_requires_hours := (v_contract.remuneration_type in ('por_hora', 'por_clase'));

    if v_requires_hours then
      v_base_amount := 0;
    else
      select amount
        into v_base_amount
      from public.staff_contract_revisions
      where contract_id = v_contract.id
        and effective_date <= v_period_start
        and (end_date is null or end_date >= v_period_start)
      order by effective_date desc
      limit 1;

      if v_base_amount is null then
        v_errors := v_errors + 1;
        continue;
      end if;
    end if;

    insert into public.payroll_settlements (
      club_id, contract_id, period_year, period_month,
      base_amount, adjustments_total, total_amount,
      hours_worked, classes_worked, requires_hours_input,
      status, created_by_user_id, updated_by_user_id
    ) values (
      v_club_id, v_contract.id, p_year, p_month,
      v_base_amount, 0, v_base_amount,
      0, 0, v_requires_hours,
      'generada', v_actor, v_actor
    );

    v_generated := v_generated + 1;
  end loop;

  insert into public.hr_activity_log (
    club_id, entity_type, entity_id, action,
    payload_after, performed_by_user_id
  ) values (
    v_club_id, 'payroll_batch', gen_random_uuid(), 'SETTLEMENTS_GENERATED',
    json_build_object(
      'period_year', p_year,
      'period_month', p_month,
      'generated_count', v_generated,
      'skipped_count', v_skipped,
      'error_count', v_errors
    )::jsonb,
    v_actor
  );

  if v_generated = 0 and v_skipped = 0 and v_errors = 0 then
    return json_build_object(
      'ok', false,
      'code', 'no_active_contracts',
      'generated_count', 0, 'skipped_count', 0, 'error_count', 0
    );
  end if;

  return json_build_object(
    'ok', true,
    'code', case when v_errors > 0 then 'partial' else 'generated' end,
    'generated_count', v_generated,
    'skipped_count', v_skipped,
    'error_count', v_errors
  );
end;
$$;
