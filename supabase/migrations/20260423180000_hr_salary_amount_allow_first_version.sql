-- Fase 2 · E04 RRHH · US-55 (amend)
-- Las Estructuras Salariales se crean sin versión de sueldo: el Coordinador
-- define el sueldo despues via "Actualizar monto". La RPC debe crear la
-- primera version cuando no existe ninguna vigente, saltando el check de
-- retroactividad (no hay versión previa a comparar).

create or replace function public.hr_update_salary_structure_amount(
  p_structure_id uuid,
  p_new_amount numeric,
  p_effective_date date
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_club_id uuid;
  v_current_club uuid;
  v_current_version record;
  v_new_version_id uuid;
  v_actor uuid;
begin
  -- 1. Actor (nullable para llamadas de sistema).
  v_actor := auth.uid();

  -- 2. Cargar estructura + validar club scope.
  select club_id into v_club_id
  from public.salary_structures
  where id = p_structure_id;

  if v_club_id is null then
    return json_build_object('ok', false, 'code', 'structure_not_found');
  end if;

  begin
    v_current_club := nullif(current_setting('app.current_club_id', true), '')::uuid;
  exception when others then
    v_current_club := null;
  end;

  if v_current_club is not null and v_current_club <> v_club_id then
    return json_build_object('ok', false, 'code', 'forbidden');
  end if;

  -- 3. Validar amount.
  if p_new_amount is null or p_new_amount <= 0 then
    return json_build_object('ok', false, 'code', 'amount_must_be_positive');
  end if;

  -- 4. Validar effective_date.
  if p_effective_date is null then
    return json_build_object('ok', false, 'code', 'effective_date_required');
  end if;

  -- 5. Cargar la versión vigente (si existe).
  select id, amount, start_date
    into v_current_version
    from public.salary_structure_versions
    where salary_structure_id = p_structure_id
      and end_date is null
    limit 1;

  if v_current_version.id is not null then
    -- 5a. Hay versión vigente: validar retroactividad y cerrarla.
    if p_effective_date <= v_current_version.start_date then
      return json_build_object('ok', false, 'code', 'invalid_effective_date');
    end if;

    update public.salary_structure_versions
       set end_date = p_effective_date - interval '1 day'
     where id = v_current_version.id;
  end if;

  -- 6. Abrir la nueva versión (o la primera).
  insert into public.salary_structure_versions (
    salary_structure_id, amount, start_date, end_date, created_by_user_id
  ) values (
    p_structure_id, p_new_amount, p_effective_date, null, v_actor
  ) returning id into v_new_version_id;

  -- 7. Actualizar updated_at de la estructura.
  update public.salary_structures
     set updated_at = now(),
         updated_by_user_id = coalesce(v_actor, updated_by_user_id)
   where id = p_structure_id;

  -- 8. Audit log.
  insert into public.hr_activity_log (
    club_id, entity_type, entity_id, action,
    payload_before, payload_after, performed_by_user_id
  ) values (
    v_club_id,
    'salary_structure',
    p_structure_id,
    'AMOUNT_UPDATED',
    case
      when v_current_version.id is null then null
      else json_build_object(
        'previous_version_id', v_current_version.id,
        'previous_amount', v_current_version.amount
      )::jsonb
    end,
    json_build_object(
      'new_version_id', v_new_version_id,
      'new_amount', p_new_amount,
      'effective_date', p_effective_date
    )::jsonb,
    v_actor
  );

  return json_build_object(
    'ok', true,
    'code', 'updated',
    'version_id', v_new_version_id
  );
end;
$$;
