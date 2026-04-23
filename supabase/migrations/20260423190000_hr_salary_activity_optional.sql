-- Fase 2 · E04 RRHH · US-54 (amend)
-- La actividad deja de ser obligatoria en las Estructuras Salariales.
-- Justificacion: existen roles del club no atados a una actividad deportiva
-- especifica (abogado, contador, administrativo, prensa, sereno, etc).
--
-- El indice unico activo (club_id, lower(trim(functional_role)), activity_id)
-- se mantiene. Postgres trata NULL != NULL, por lo que multiples estructuras
-- activas del mismo rol sin actividad se aceptan como independientes — es
-- el comportamiento deseado (ej. dos abogados en el club).

alter table public.salary_structures
  alter column activity_id drop not null;
