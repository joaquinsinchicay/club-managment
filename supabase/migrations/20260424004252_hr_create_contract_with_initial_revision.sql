create or replace function public.hr_create_contract_with_initial_revision(
  p_staff_member_id uuid,
  p_salary_structure_id uuid,
  p_start_date date,
  p_end_date date,
  p_initial_amount numeric,
  p_initial_revision_reason text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club_id uuid;
  v_current_club uuid;
  v_member_club uuid;
  v_structure_club uuid;
  v_structure_status text;
  v_existing_contract uuid;
  v_contract_id uuid;
  v_revision_id uuid;
  v_actor uuid;
  v_reason text;
begin
  v_actor := auth.uid();

  begin
    v_current_club := nullif(current_setting('app.current_club_id', true), '')::uuid;
  exception when others then
    v_current_club := null;
  end;

  if v_current_club is null then
    return json_build_object('ok', false, 'code', 'forbidden');
  end if;

  select club_id into v_member_club from public.staff_members where id = p_staff_member_id;
  if v_member_club is null or v_member_club <> v_current_club then
    return json_build_object('ok', false, 'code', 'staff_member_required');
  end if;

  select club_id, status into v_structure_club, v_structure_status
  from public.salary_structures where id = p_salary_structure_id;
  if v_structure_club is null or v_structure_club <> v_current_club then
    return json_build_object('ok', false, 'code', 'structure_required');
  end if;
  if v_structure_status <> 'activa' then
    return json_build_object('ok', false, 'code', 'salary_structure_not_active');
  end if;

  v_club_id := v_current_club;

  if p_start_date is null then
    return json_build_object('ok', false, 'code', 'invalid_start_date');
  end if;
  if p_end_date is not null and p_end_date < p_start_date then
    return json_build_object('ok', false, 'code', 'invalid_end_date');
  end if;
  if p_initial_amount is null or p_initial_amount <= 0 then
    return json_build_object('ok', false, 'code', 'initial_amount_invalid');
  end if;

  select id into v_existing_contract
  from public.staff_contracts
  where salary_structure_id = p_salary_structure_id and status = 'vigente'
  limit 1;
  if v_existing_contract is not null then
    return json_build_object('ok', false, 'code', 'structure_already_taken');
  end if;

  insert into public.staff_contracts (
    club_id, staff_member_id, salary_structure_id,
    start_date, end_date, status,
    created_by_user_id, updated_by_user_id
  ) values (
    v_club_id, p_staff_member_id, p_salary_structure_id,
    p_start_date, p_end_date, 'vigente',
    v_actor, v_actor
  ) returning id into v_contract_id;

  v_reason := coalesce(nullif(trim(p_initial_revision_reason), ''), 'Monto inicial del contrato');
  insert into public.staff_contract_revisions (
    club_id, contract_id, amount, effective_date, end_date,
    reason, created_by_user_id
  ) values (
    v_club_id, v_contract_id, p_initial_amount, p_start_date, null,
    v_reason, v_actor
  ) returning id into v_revision_id;

  insert into public.hr_activity_log (
    club_id, entity_type, entity_id, action,
    payload_after, performed_by_user_id
  ) values (
    v_club_id, 'staff_contract', v_contract_id, 'CONTRACT_CREATED',
    json_build_object(
      'staff_member_id', p_staff_member_id,
      'salary_structure_id', p_salary_structure_id,
      'start_date', p_start_date,
      'end_date', p_end_date,
      'initial_amount', p_initial_amount,
      'initial_revision_id', v_revision_id
    )::jsonb,
    v_actor
  );

  return json_build_object(
    'ok', true,
    'code', 'created',
    'contract_id', v_contract_id,
    'revision_id', v_revision_id
  );
end;
$$;
