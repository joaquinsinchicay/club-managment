-- Agrega la moneda del club como atributo de identidad institucional.
-- Es la moneda por defecto para módulos que necesitan una unidad monetaria
-- canónica del club (ej. Estructuras Salariales de RRHH). Backfill en ARS
-- para clubes existentes y constraint contra los códigos habilitados en
-- `lib/domain/access.ts::TreasuryCurrencyCode`.

alter table public.clubs
  add column if not exists currency_code text not null default 'ARS';

update public.clubs
  set currency_code = 'ARS'
  where currency_code is null;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'clubs_currency_code_check'
  ) then
    alter table public.clubs
      add constraint clubs_currency_code_check
        check (currency_code in ('ARS', 'USD'));
  end if;
end $$;
