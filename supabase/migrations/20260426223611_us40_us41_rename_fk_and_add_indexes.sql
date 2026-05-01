-- Cleanup post US-40 / US-41:
-- 1. Renombrar FK constraint legacy. Postgres `alter table rename column`
--    no renombra el constraint asociado, asi que el FK sobre la columna
--    nueva approved_by_user_id sigue llamandose
--    payroll_settlements_confirmed_by_user_id_fkey hasta que lo
--    renombramos manualmente. Es solo cosmetico (el FK funciona) pero
--    confunde al leer el schema.
-- 2. Indices covering para los FKs nuevos / renombrados (perf advisor).
--    Sin estos indices, queries que filtran por approved_by_user_id o
--    returned_by_user_id (ej. "ver liquidaciones aprobadas por el
--    usuario X") hacen seq scan.

alter table public.payroll_settlements
  rename constraint payroll_settlements_confirmed_by_user_id_fkey
  to payroll_settlements_approved_by_user_id_fkey;

create index if not exists payroll_settlements_approved_by_user_id_idx
  on public.payroll_settlements (approved_by_user_id);

create index if not exists payroll_settlements_returned_by_user_id_idx
  on public.payroll_settlements (returned_by_user_id);
