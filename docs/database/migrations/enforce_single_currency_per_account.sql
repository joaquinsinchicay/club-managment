-- Enforce single-currency-per-account invariant.
--
-- Contexto: US-28 se simplifica para que cada `treasury_account` opere en una
-- unica moneda. Para operar en dos monedas sobre la misma entidad se deben
-- crear dos cuentas independientes.
--
-- Este script:
--   1. Archiva en `treasury_account_currencies_archive` las filas que se van a
--      eliminar para permitir revertir manualmente si algun registro resulta
--      relevante.
--   2. Para cada cuenta con mas de una moneda, conserva la fila con mayor
--      `initial_balance` absoluto; si empate, prefiere `ARS`.
--   3. Agrega un unique index sobre `account_id` en
--      `treasury_account_currencies` para evitar regresiones.
--
-- IMPORTANTE: revisar manualmente antes de ejecutar en produccion si hay
-- movimientos consolidados que referencien una moneda que se vaya a descartar.
-- En ese caso, resolver con el admin antes de correr esta migracion.

begin;

create table if not exists treasury_account_currencies_archive (
  id uuid primary key,
  account_id uuid not null,
  currency_code text not null,
  initial_balance numeric(18, 2) not null,
  archived_at timestamptz not null default now(),
  archive_reason text not null
);

with ranked as (
  select
    id,
    account_id,
    currency_code,
    initial_balance,
    row_number() over (
      partition by account_id
      order by abs(initial_balance) desc, case currency_code when 'ARS' then 0 else 1 end
    ) as rn
  from treasury_account_currencies
),
to_drop as (
  select id, account_id, currency_code, initial_balance
  from ranked
  where rn > 1
)
insert into treasury_account_currencies_archive (id, account_id, currency_code, initial_balance, archive_reason)
select id, account_id, currency_code, initial_balance, 'enforce_single_currency_per_account_2026_04'
from to_drop
on conflict (id) do nothing;

delete from treasury_account_currencies
where id in (
  select id from treasury_account_currencies_archive
  where archive_reason = 'enforce_single_currency_per_account_2026_04'
);

create unique index if not exists treasury_account_currencies_account_id_unique
  on treasury_account_currencies (account_id);

commit;
