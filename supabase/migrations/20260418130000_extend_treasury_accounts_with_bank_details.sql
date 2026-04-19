-- Extiende treasury_accounts con datos bancarios y agrega saldo inicial por moneda
-- a treasury_account_currencies. Ningún campo es obligatorio a nivel DB: la app
-- decide cuáles aplicar según el tipo de cuenta.

alter table public.treasury_accounts
  add column if not exists bank_entity text,
  add column if not exists bank_account_subtype text,
  add column if not exists account_number text,
  add column if not exists cbu_cvu text;

alter table public.treasury_account_currencies
  add column if not exists initial_balance numeric(18, 2) not null default 0;

-- La RPC cambia de shape (agrega columnas + currencies pasa de text[] a jsonb),
-- por eso hay que DROP antes del CREATE. CREATE OR REPLACE no permite cambiar
-- el return type de una función existente.
drop function if exists public.get_treasury_accounts_for_current_club(uuid);

create function public.get_treasury_accounts_for_current_club(p_club_id uuid)
returns table (
  id uuid,
  club_id uuid,
  name text,
  account_type public.account_type,
  account_scope public.account_scope,
  status text,
  visible_for_secretaria boolean,
  visible_for_tesoreria boolean,
  emoji text,
  bank_entity text,
  bank_account_subtype text,
  account_number text,
  cbu_cvu text,
  currencies jsonb
)
language plpgsql
security invoker
set search_path = public
as $$
begin
  perform set_config('app.current_club_id', p_club_id::text, true);

  return query
  select
    ta.id,
    ta.club_id,
    ta.name,
    ta.account_type,
    ta.account_scope,
    ta.status,
    ta.visible_for_secretaria,
    ta.visible_for_tesoreria,
    ta.emoji,
    ta.bank_entity,
    ta.bank_account_subtype,
    ta.account_number,
    ta.cbu_cvu,
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'currency_code', tac.currency_code,
          'initial_balance', tac.initial_balance
        )
        order by tac.currency_code
      ) filter (where tac.currency_code is not null),
      '[]'::jsonb
    ) as currencies
  from public.treasury_accounts ta
  left join public.treasury_account_currencies tac on tac.account_id = ta.id
  where ta.club_id = p_club_id
  group by
    ta.id,
    ta.club_id,
    ta.name,
    ta.account_type,
    ta.account_scope,
    ta.status,
    ta.visible_for_secretaria,
    ta.visible_for_tesoreria,
    ta.emoji,
    ta.bank_entity,
    ta.bank_account_subtype,
    ta.account_number,
    ta.cbu_cvu
  order by ta.name;
end;
$$;
