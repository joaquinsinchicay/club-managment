-- US-67 / RRHH · Agrega 'contrato_locacion' al enum staff_vinculo_type.
--
-- Razón: el club Primera Junta usa "Contrato de locación" como vínculo
-- predominante para los colaboradores rentados. El enum original
-- (relacion_dependencia, monotributista, honorarios) no lo cubría.
-- La migración fue aplicada manualmente en producción el 2026-04-27
-- via mcp__supabase__apply_migration; este archivo la deja en el repo
-- para que el historial local quede alineado con remoto.
--
-- Idempotente vía IF NOT EXISTS — ALTER TYPE ADD VALUE no puede correr
-- dentro de una transacción cuando ya existe, así que el guard nos
-- protege contra re-runs.

alter type staff_vinculo_type add value if not exists 'contrato_locacion';
