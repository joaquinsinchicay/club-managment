-- Fix: settlement RPCs devolvían `forbidden` porque dependían de
-- app.current_club_id y la función `set_current_club` nunca fue
-- creada en el schema. Los repositories la llamaban antes de cada
-- RPC pero como no existe, la llamada fallaba silenciosamente con
-- código 42883 (function does not exist) y el RPC leía
-- `app.current_club_id` = NULL → forbidden.
--
-- Fix: crear la función. Es un setter simple que marca la
-- variable de sesión. No toca RLS; las policies existentes siguen
-- usando `app.current_club_id` directamente.
--
-- Relacionado: migración 20260424010000_hr_fix_rpc_forbidden.sql
-- ya parchó los RPCs de creación de contrato y revisión masiva
-- para derivar club_id sin depender de la variable. Este patch
-- resuelve el issue para el resto de los RPCs (liquidaciones).

create or replace function public.set_current_club(p_club_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_club_id is null then
    perform set_config('app.current_club_id', '', true);
  else
    perform set_config('app.current_club_id', p_club_id::text, true);
  end if;
end;
$$;

grant execute on function public.set_current_club(uuid) to authenticated;
