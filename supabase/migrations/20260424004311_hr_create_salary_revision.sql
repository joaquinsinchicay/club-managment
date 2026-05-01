create or replace function public.hr_create_salary_revision(
  p_contract_id uuid,
  p_amount numeric,
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
  v_contract record;
  v_current_revision record;
  v_new_revision_id uuid;
  v_actor uuid;
begin
  v_actor := auth.uid();

  select id, club_id, status, start_date, end_date
    into v_contract
  from public.staff_contracts
  where id = p_contract_id;

  if v_contract.id is null then
    return json_build_object('ok', false, 'code', 'contract_not_found');
  end if;

  v_club_id := v_contract.club_id;

  begin
    v_current_club := nullif(current_setting('app.current_club_id', true), '')::uuid;
  exception when others then
    v_current_club := null;
  end;
  if v_current_club is not null and v_current_club <> v_club_id then
    return json_build_object('ok', false, 'code', 'forbidden');
  end if;

  if v_contract.status <> 'vigente' then
    return json_build_object('ok', false, 'code', 'contract_not_active');
  end if;

  if p_amount is null or p_amount <= 0 then
    return json_build_object('ok', false, 'code', 'amount_must_be_positive');
  end if;

  if p_effective_date is null then
    return json_build_object('ok', false, 'code', 'effective_date_required');
  end if;

  if p_effective_date < v_contract.start_date then
    return json_build_object('ok', false, 'code', 'invalid_effective_date');
  end if;

  if v_contract.end_date is not null and p_effective_date > v_contract.end_date then
    return json_build_object('ok', false, 'code', 'invalid_effective_date');
  end if;

  select id, amount, effective_date
    into v_current_revision
  from public.staff_contract_revisions
  where contract_id = p_contract_id and end_date is null
  limit 1;

  if v_current_revision.id is not null then
    if p_effective_date <= v_current_revision.effective_date then
      return json_build_object('ok', false, 'code', 'invalid_effective_date');
    end if;

    update public.staff_contract_revisions
       set end_date = p_effective_date - interval '1 day'
     where id = v_current_revision.id;
  end if;

  insert into public.staff_contract_revisions (
    club_id, contract_id, amount, effective_date, end_date,
    reason, created_by_user_id
  ) values (
    v_club_id, p_contract_id, p_amount, p_effective_date, null,
    nullif(trim(p_reason), ''), v_actor
  ) returning id into v_new_revision_id;

  update public.staff_contracts
     set updated_at = now(),
         updated_by_user_id = coalesce(v_actor, updated_by_user_id)
   where id = p_contract_id;

  insert into public.hr_activity_log (
    club_id, entity_type, entity_id, action,
    payload_before, payload_after, performed_by_user_id
  ) values (
    v_club_id, 'staff_contract', p_contract_id, 'SALARY_REVISION_CREATED',
    case
      when v_current_revision.id is null then null
      else json_build_object(
        'previous_revision_id', v_current_revision.id,
        'previous_amount', v_current_revision.amount
      )::jsonb
    end,
    json_build_object(
      'new_revision_id', v_new_revision_id,
      'new_amount', p_amount,
      'effective_date', p_effective_date,
      'reason', nullif(trim(p_reason), '')
    )::jsonb,
    v_actor
  );

  return json_build_object('ok', true, 'code', 'revision_created', 'revision_id', v_new_revision_id);
end;
$$;
