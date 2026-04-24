-- Fase 2 · E04 RRHH · US-56 (amend 3)
-- Elimina la funcionalidad de activo/inactivo en Colaboradores.
-- El concepto de soft-delete no se usa más — los colaboradores se crean
-- y se editan, pero no se "dan de baja". Si en el futuro se vuelve a
-- necesitar, habrá que recrear status + deactivated_at + UI de toggle.

-- 1. Drop partial unique indexes que filtran por status='activo'.
drop index if exists public.staff_members_unique_active_dni;
drop index if exists public.staff_members_unique_active_cuit;

-- 2. Drop columnas.
alter table public.staff_members
  drop column if exists status,
  drop column if exists deactivated_at;

-- 3. Recrear unique indexes sin filtro parcial.
--    DNI obligatorio → unique sobre (club_id, dni).
--    CUIT opcional → unique parcial sobre (club_id, cuit_cuil) where cuit_cuil is not null.
--    (NULL != NULL en Postgres, por lo que multiples colaboradores sin cuit
--     conviven en el índice aunque no usemos el predicate.)
create unique index staff_members_unique_dni
  on public.staff_members (club_id, dni);

create unique index staff_members_unique_cuit
  on public.staff_members (club_id, cuit_cuil)
  where cuit_cuil is not null;

-- 4. Drop enum si no tiene otros consumidores.
drop type if exists public.staff_member_status;
