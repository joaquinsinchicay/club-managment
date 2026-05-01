create or replace function public.hr_create_salary_revisions_bulk(
  p_contract_ids uuid[],
  p_adjustment_type public.salary_revision_adjustment_type,
  p_value numeric,
  p_effective_date date,
  p_reason text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club_id uuid;
  v_current_club uuid;
  v_actor uuid;
  v_contract_id uuid;
  v_contract record;
  v_current_revision record;
  v_new_amount numeric(18,2);
  v_new_revision_id uuid;
  v_created int := 0;
  v_created_ids jsonb := '[]'::jsonb;
begin
  v_actor := auth.uid();

  if p_contract_ids is null or array_length(p_contract_ids, 1) is null then
    return json_build_object('ok', false, 'code', 'no_contracts_selected');
  end if;

  if p_value is null then
    return json_build_object('ok', false, 'code', 'value_required');
  end if;
  if p_adjustment_type = 'set' and p_value <= 0 then
    return json_build_object('ok', false, 'code', 'value_must_be_positive');
  end if;
  if p_effective_date is null then
    return json_build_object('ok', false, 'code', 'effective_date_required');
  end if;
  if nullif(trim(p_reason), '') is null then
    return json_build_object('ok', false, 'code', 'reason_required');
  end if;

  begin
    v_current_club := nullif(current_setting('app.current_club_id', true), '')::uuid;
  exception when others then
    v_current_club := null;
  end;

  -- Derivar el club desde el primer contrato y validar consistencia.
  select club_id into v_club_id from public.staff_contracts where id = p_contract_ids[1];
  if v_club_id is null then
    return json_build_object('ok', false, 'code', 'contract_not_found');
  end if;
  if v_current_club is not null and v_current_club <> v_club_id then
    return json_build_object('ok', false, 'code', 'forbidden');
  end if;

  foreach v_contract_id in array p_contract_ids loop
    select id, club_id, status, start_date, end_date
      into v_contract
    from public.staff_contracts
    where id = v_contract_id;

    if v_contract.id is null or v_contract.club_id <> v_club_id then
      raise exception using message = 'contract_not_found:' || v_contract_id;
    end if;
    if v_contract.status <> 'vigente' then
      raise exception using message = 'contract_not_active:' || v_contract_id;
    end if;
    if p_effective_date < v_contract.start_date then
      raise exception using message = 'invalid_effective_date:' || v_contract_id;
    end if;
    if v_contract.end_date is not null and p_effective_date > v_contract.end_date then
      raise exception using message = 'invalid_effective_date:' || v_contract_id;
    end if;

    select id, amount, effective_date
      into v_current_revision
    from public.staff_contract_revisions
    where contract_id = v_contract_id and end_date is null
    limit 1;

    if v_current_revision.id is null then
      raise exception using message = 'current_revision_not_found:' || v_contract_id;
    end if;
    if p_effective_date <= v_current_revision.effective_date then
      raise exception using message = 'invalid_effective_date:' || v_contract_id;
    end if;

    v_new_amount := case p_adjustment_type
      when 'percent' then round(v_current_revision.amount * (1 + p_value / 100.0), 2)
      when 'fixed'   then v_current_revision.amount + p_value
      when 'set'     then p_value
    end;

    if v_new_amount is null or v_new_amount <= 0 then
      raise exception using message = 'amount_must_be_positive:' || v_contract_id;
    end if;

    update public.staff_contract_revisions
       set end_date = p_effective_date - interval '1 day'
     where id = v_current_revision.id;

    insert into public.staff_contract_revisions (
      club_id, contract_id, amount, effective_date, end_date,
      reason, created_by_user_id
    ) values (
      v_club_id, v_contract_id, v_new_amount, p_effective_date, null,
      p_reason, v_actor
    ) returning id into v_new_revision_id;

    update public.staff_contracts
       set updated_at = now(),
           updated_by_user_id = coalesce(v_actor, updated_by_user_id)
     where id = v_contract_id;

    v_created := v_created + 1;
    v_created_ids := v_created_ids || jsonb_build_object(
      'contract_id', v_contract_id,
      'revision_id', v_new_revision_id,
      'previous_amount', v_current_revision.amount,
      'new_amount', v_new_amount
    );
  end loop;

  insert into public.hr_activity_log (
    club_id, entity_type, entity_id, action,
    payload_after, performed_by_user_id
  ) values (
    v_club_id, 'payroll_batch', gen_random_uuid(), 'SALARY_REVISION_BULK',
    json_build_object(
      'adjustment_type', p_adjustment_type::text,
      'value', p_value,
      'effective_date', p_effective_date,
      'reason', p_reason,
      'created_count', v_created,
      'created', v_created_ids
    )::jsonb,
    v_actor
  );

  return json_build_object('ok', true, 'code', 'bulk_created', 'created_count', v_created, 'created', v_created_ids);
end;
$$;
