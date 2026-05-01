-- Fase 2 · E04 RRHH · US-54 (amend 2)
-- Agrega campos División (multi) y Tipo de pago a Estructuras Salariales.
-- Reemplaza el índice unique para que la combinación rol + división + actividad
-- sea null-safe (actividad opcional, divisiones siempre array — vacío cuenta).

-- 1. Enum para tipo de pago (Sueldo / Viático / Honorarios).
create type salary_payment_type as enum ('sueldo', 'viatico', 'honorarios');

-- 2. Nuevas columnas.
alter table public.salary_structures
  add column divisions text[] not null default '{}',
  add column payment_type salary_payment_type not null default 'sueldo';

-- 3. Drop del índice unique anterior (solo rol + actividad).
drop index if exists public.salary_structures_unique_active_role_activity;

-- 4. Nuevo índice unique null-safe: rol + divisiones + actividad.
--    Postgres compara arrays por igualdad estricta, por lo que divisions={4ta,5ta}
--    y divisions={5ta,6ta} son estructuras independientes.
--    Para activity_id null, usamos coalesce a '' (cualquier UUID siempre será
--    distinto de '', por lo que los roles sin actividad agrupan correctamente).
create unique index salary_structures_unique_active_role_div_activity
  on public.salary_structures (
    club_id,
    lower(trim(functional_role)),
    divisions,
    coalesce(activity_id::text, '')
  )
  where status = 'activa';
