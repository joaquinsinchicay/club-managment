-- US-31 (ex US-56) · Colaborador SIN estado activo/inactivo
--
-- Las US Notion (E04 RRHH) reescribieron el modelo: el colaborador no
-- tiene estado, solo conserva su histórico (contratos, liquidaciones,
-- pagos). Ya no se "da de baja" — si no tiene contratos vigentes,
-- aparece marcado en el listado vía toggle "con contrato vigente / todos"
-- (US-31 Scenario 4) y la alerta US-37.
--
-- Drop destructivo (base de desarrollo): RPC + columnas de soft-delete.

drop function if exists public.hr_deactivate_staff_member(uuid, text);

alter table public.staff_members
  drop column if exists deactivated_at,
  drop column if exists deactivated_by_user_id,
  drop column if exists deactivation_reason;
