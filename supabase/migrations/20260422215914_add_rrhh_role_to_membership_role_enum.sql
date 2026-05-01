-- Fase 1 · E04 RRHH
-- Agrega el valor 'rrhh' al enum public.membership_role para habilitar
-- un rol dedicado que administra el módulo RRHH (Estructuras Salariales,
-- Colaboradores, Contratos, Liquidaciones, Pagos, Dashboard, Reportes).
--
-- El rol `rrhh` coexiste con otros roles en un mismo usuario (patrón
-- multi-rol ya soportado por la tabla `membership_roles`). Acceso:
--   - admin  → acceso total RRHH + maestros.
--   - rrhh   → acceso total RRHH + maestros.
--   - tesoreria → opera liquidaciones y pagos; read-only en maestros.
--
-- NOTA: `alter type ... add value` no puede ejecutarse dentro de una
-- transacción que ya contiene otras operaciones, por lo que esta migration
-- vive aislada antes de la migration que crea el schema de RRHH.

alter type public.membership_role add value if not exists 'rrhh';
