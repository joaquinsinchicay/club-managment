-- Fase 2 · E04 RRHH · US-56 (amend)
-- CUIT/CUIL deja de ser obligatorio al dar de alta un colaborador.
-- Justificacion: algunos colaboradores (ej. prestadores eventuales,
-- colaboradores en proceso de registracion) pueden cargarse sin CUIT
-- definitivo. El indice unique parcial se mantiene: Postgres trata
-- NULL != NULL, por lo que multiples colaboradores sin CUIT coexisten.

alter table public.staff_members
  alter column cuit_cuil drop not null;
