-- Fase 2 · E04 RRHH · US-54 (amend 3)
-- Extiende el índice unique de Estructuras Salariales para incluir
-- remuneration_type. Permite tener una misma combinación rol + actividad +
-- divisiones con tipos de remuneración distintos (p.ej. "Personal de Limpieza"
-- en "General" tanto Mensual fijo como Por hora).

drop index if exists public.salary_structures_unique_active_role_div_activity;

create unique index salary_structures_unique_active_role_div_activity_remun
  on public.salary_structures (
    club_id,
    lower(trim(functional_role)),
    divisions,
    coalesce(activity_id::text, ''),
    remuneration_type
  )
  where status = 'activa';
