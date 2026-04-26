-- US-41 · Devolver liquidacion aprobada al estado "generada"
--
-- E04 RRHH (Notion). Permite a RRHH o Tesoreria devolver una
-- liquidacion en estado "aprobada_rrhh" al estado "generada" con
-- un motivo obligatorio, para corregir errores detectados despues
-- de la aprobacion sin tener que anularla.
--
-- Cambios:
--   A. Columnas returned_at / returned_by_user_id / returned_reason /
--      returned_by_role en payroll_settlements (indicador visual
--      "Devuelta por [rol]" en el listado).
--   B. Nueva RPC hr_return_settlement_to_generated(settlement_id, reason).
--      Valida estado = 'aprobada_rrhh', motivo obligatorio, registra
--      en hr_activity_log con action SETTLEMENT_RETURNED_TO_GENERATED.
--      Resetea approved_at / approved_by_user_id a null para que la
--      proxima aprobacion (US-40) deje su propio timestamp.

-- =========================================================================
-- A. Columnas para indicador "Devuelta por [rol]"
-- =========================================================================

alter table public.payroll_settlements
  add column if not exists returned_at timestamptz null,
  add column if not exists returned_by_user_id uuid null references public.users(id),
  add column if not exists returned_reason text null,
  add column if not exists returned_by_role text null
    check (returned_by_role is null or returned_by_role in ('rrhh', 'tesoreria'));

-- =========================================================================
-- B. RPC hr_return_settlement_to_generated
-- =========================================================================

create or replace function public.hr_return_settlement_to_generated(
  p_settlement_id uuid,
  p_reason text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_settlement record;
  v_club_id uuid;
  v_current_club uuid;
  v_actor uuid;
  v_actor_roles text[];
  v_actor_role text;
  v_reason text;
begin
  v_actor := auth.uid();

  -- 1. Cargar liquidacion + scope.
  select id, club_id, status
    into v_settlement
    from public.payroll_settlements
   where id = p_settlement_id;

  if v_settlement.id is null then
    return json_build_object('ok', false, 'code', 'settlement_not_found');
  end if;

  v_club_id := v_settlement.club_id;
  begin
    v_current_club := nullif(current_setting('app.current_club_id', true), '')::uuid;
  exception when others then
    v_current_club := null;
  end;
  if v_current_club is not null and v_current_club <> v_club_id then
    return json_build_object('ok', false, 'code', 'forbidden');
  end if;

  -- 2. Validar estado.
  if v_settlement.status <> 'aprobada_rrhh' then
    return json_build_object('ok', false, 'code', 'invalid_status');
  end if;

  -- 3. Validar motivo obligatorio.
  v_reason := nullif(trim(p_reason), '');
  if v_reason is null then
    return json_build_object('ok', false, 'code', 'reason_required');
  end if;

  -- 4. Detectar rol del actor (rrhh / tesoreria) en este club.
  --    Si tiene ambos, prefiere "rrhh" (es el rol natural de aprobacion).
  select array_agg(mr.role::text) into v_actor_roles
    from public.memberships m
    join public.membership_roles mr on mr.membership_id = m.id
   where m.user_id = v_actor
     and m.club_id = v_club_id
     and m.status = 'activo';

  if v_actor_roles is null or array_length(v_actor_roles, 1) is null then
    return json_build_object('ok', false, 'code', 'forbidden');
  end if;

  if 'rrhh' = any(v_actor_roles) then
    v_actor_role := 'rrhh';
  elsif 'tesoreria' = any(v_actor_roles) then
    v_actor_role := 'tesoreria';
  else
    return json_build_object('ok', false, 'code', 'forbidden');
  end if;

  -- 5. Update: status volver a generada + reset de approved_*, set returned_*
  update public.payroll_settlements
     set status = 'generada',
         approved_at = null,
         approved_by_user_id = null,
         returned_at = now(),
         returned_by_user_id = v_actor,
         returned_by_role = v_actor_role,
         returned_reason = v_reason,
         updated_at = now(),
         updated_by_user_id = coalesce(v_actor, updated_by_user_id)
   where id = p_settlement_id;

  -- 6. Audit
  insert into public.hr_activity_log (
    club_id, entity_type, entity_id, action,
    payload_before, payload_after, performed_by_user_id
  ) values (
    v_club_id, 'payroll_settlement', p_settlement_id, 'SETTLEMENT_RETURNED_TO_GENERATED',
    json_build_object('status', 'aprobada_rrhh')::jsonb,
    json_build_object(
      'status', 'generada',
      'returned_by_role', v_actor_role,
      'returned_reason', v_reason
    )::jsonb,
    v_actor
  );

  return json_build_object(
    'ok', true,
    'code', 'returned_to_generated',
    'returned_by_role', v_actor_role
  );
end;
$$;

grant execute on function public.hr_return_settlement_to_generated(uuid, text) to authenticated;
