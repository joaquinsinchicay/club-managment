-- Soft-delete (baja) de colaboradores
-- ================================================================
-- Agrega columnas de deactivation a staff_members + RPC
-- hr_deactivate_staff_member con guard "no se puede dar de baja si
-- hay contratos vigentes" (regla PDD US-56).
--
-- El club_id se deriva desde staff_members cuando
-- app.current_club_id no está seteado — mismo pattern que la
-- migración 20260424010000_hr_fix_rpc_forbidden.

alter table public.staff_members
  add column if not exists deactivated_at timestamptz,
  add column if not exists deactivated_by_user_id uuid references auth.users(id) on delete set null,
  add column if not exists deactivation_reason text;

create or replace function public.hr_deactivate_staff_member(
  p_staff_member_id uuid,
  p_reason text
)
returns json
language plpgsql
security definer
set search_path = public
as $$
declare
  v_member_club uuid;
  v_current_club uuid;
  v_existing_deactivated_at timestamptz;
  v_active_count integer;
  v_actor uuid;
  v_reason text;
begin
  v_actor := auth.uid();

  begin
    v_current_club := nullif(current_setting('app.current_club_id', true), '')::uuid;
  exception when others then
    v_current_club := null;
  end;

  select club_id, deactivated_at
    into v_member_club, v_existing_deactivated_at
    from public.staff_members
   where id = p_staff_member_id;

  if v_member_club is null then
    return json_build_object('ok', false, 'code', 'member_not_found');
  end if;

  if v_current_club is not null and v_current_club <> v_member_club then
    return json_build_object('ok', false, 'code', 'forbidden');
  end if;

  if v_existing_deactivated_at is not null then
    return json_build_object('ok', false, 'code', 'already_deactivated');
  end if;

  select count(*) into v_active_count
    from public.staff_contracts
   where staff_member_id = p_staff_member_id
     and status = 'vigente';

  if v_active_count > 0 then
    return json_build_object('ok', false, 'code', 'has_active_contracts');
  end if;

  v_reason := nullif(trim(p_reason), '');

  update public.staff_members
     set deactivated_at = now(),
         deactivated_by_user_id = v_actor,
         deactivation_reason = v_reason,
         updated_at = now(),
         updated_by_user_id = v_actor
   where id = p_staff_member_id;

  insert into public.hr_activity_log (
    club_id, entity_type, entity_id, action,
    actor_user_id, payload_after
  ) values (
    v_member_club, 'staff_member', p_staff_member_id, 'STAFF_MEMBER_DEACTIVATED',
    v_actor, json_build_object('reason', v_reason)
  );

  return json_build_object('ok', true, 'code', 'deactivated');
end;
$$;

grant execute on function public.hr_deactivate_staff_member(uuid, text) to authenticated;
