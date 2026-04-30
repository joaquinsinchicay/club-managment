/**
 * lib/labels.ts — Mappings de enums del dominio a labels (es-AR) y a tones
 * semánticos del Design System.
 *
 * Centraliza las traducciones que vivían inline como `const TYPE_LABEL` /
 * `const STATUS_LABEL` / `function settlementStatusTone()` repartidas en
 * cost-centers-tab.tsx, settlements-list.tsx, etc. Al pasarlas acá:
 *  - Los componentes solo importan; no redeclaran.
 *  - Cualquier ajuste a un label es 1 lugar.
 *  - Soporta i18n futuro vía un solo módulo.
 */

import type { CostCenterBadge, CostCenterPeriodicity, CostCenterStatus, CostCenterType } from "@/lib/domain/cost-center";
import type { PayrollSettlementStatus } from "@/lib/domain/payroll-settlement";
import type { BadgeTone } from "@/components/ui/badge";
import type { DataTableChipTone } from "@/components/ui/data-table";
import { texts } from "@/lib/texts";

const tCC = texts.dashboard.treasury_role.cost_centers;

// ───────────────────────────────────────────────────────────────────────────
// Cost Centers
// ───────────────────────────────────────────────────────────────────────────

export const COST_CENTER_TYPE_LABELS: Record<CostCenterType, string> = {
  deuda: tCC.type_debt,
  evento: tCC.type_event,
  jornada: tCC.type_workday,
  presupuesto: tCC.type_budget,
  publicidad: tCC.type_advertising,
  sponsor: tCC.type_sponsor,
};

export const COST_CENTER_STATUS_LABELS: Record<CostCenterStatus, string> = {
  activo: tCC.status_active,
  inactivo: tCC.status_inactive,
};

export const COST_CENTER_PERIODICITY_LABELS: Record<CostCenterPeriodicity, string> = {
  unico: tCC.periodicity_unique,
  mensual: tCC.periodicity_monthly,
  trimestral: tCC.periodicity_quarterly,
  semestral: tCC.periodicity_biannual,
  anual: tCC.periodicity_annual,
};

export const COST_CENTER_BADGE_LABELS: Record<CostCenterBadge["kind"], string> = {
  debt_settled: tCC.badge_debt_settled,
  budget_near_limit: tCC.badge_budget_near_limit,
  budget_exceeded: tCC.badge_budget_exceeded,
  goal_met: tCC.badge_goal_met,
  overdue: tCC.badge_overdue,
};

/**
 * Tones del Design System para los badges de cost center.
 * Mapea a `DataTableChipTone` (usado en `<DataTableChip>` y `<Chip>`).
 */
export const COST_CENTER_BADGE_TONES: Record<CostCenterBadge["kind"], DataTableChipTone> = {
  debt_settled: "income",
  budget_near_limit: "warning",
  budget_exceeded: "expense",
  goal_met: "income",
  overdue: "expense",
};

// ───────────────────────────────────────────────────────────────────────────
// Payroll Settlements
// ───────────────────────────────────────────────────────────────────────────

/**
 * Tone semántico para el `<Badge>` de una liquidación según su status.
 *  generada       → warning  (amarillo: pendiente)
 *  aprobada_rrhh  → accent   (énfasis: fuera de pipeline normal)
 *  pagada         → success  (verde: cerrada)
 *  cualquier otra → neutral
 */
export function getSettlementStatusTone(status: PayrollSettlementStatus): BadgeTone {
  if (status === "generada") return "warning";
  if (status === "aprobada_rrhh") return "accent";
  if (status === "pagada") return "success";
  return "neutral";
}
