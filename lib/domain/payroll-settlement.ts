/**
 * Domain entity and pure helpers for Payroll Settlements (US-61 / US-62 /
 * US-63 / US-66).
 *
 * A settlement represents the payable amount of a single contract for a
 * single month. It has a lifecycle:
 *
 *    generada → confirmada → pagada
 *       ↘        ↘           ↘
 *        ────── anulada ──────
 *
 * Ajustes (adicionales, descuentos, reintegros) se aplican sobre una
 * liquidación `generada` y recalculan `adjustments_total` + `total_amount`
 * vía trigger en DB.
 *
 * Effect-free module.
 */

export const PAYROLL_SETTLEMENT_STATUSES = [
  "generada",
  "confirmada",
  "pagada",
  "anulada",
] as const;
export type PayrollSettlementStatus = (typeof PAYROLL_SETTLEMENT_STATUSES)[number];

export const PAYROLL_ADJUSTMENT_TYPES = ["adicional", "descuento", "reintegro"] as const;
export type PayrollAdjustmentType = (typeof PAYROLL_ADJUSTMENT_TYPES)[number];

export type PayrollSettlementAdjustment = {
  id: string;
  settlementId: string;
  type: PayrollAdjustmentType;
  concept: string;
  amount: number;
  createdAt: string;
  createdByUserId: string | null;
};

export type PayrollSettlement = {
  id: string;
  clubId: string;
  contractId: string;
  staffMemberId: string | null;
  staffMemberName: string | null;
  salaryStructureId: string | null;
  salaryStructureName: string | null;
  salaryStructureRole: string | null;
  salaryStructureActivityId: string | null;
  salaryStructureActivityName: string | null;
  remunerationType: string | null;
  periodYear: number;
  periodMonth: number;
  baseAmount: number;
  adjustmentsTotal: number;
  totalAmount: number;
  hoursWorked: number;
  classesWorked: number;
  requiresHoursInput: boolean;
  notes: string | null;
  status: PayrollSettlementStatus;
  confirmedAt: string | null;
  confirmedByUserId: string | null;
  paidAt: string | null;
  paidMovementId: string | null;
  annulledAt: string | null;
  annulledReason: string | null;
  annulledByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string | null;
  updatedByUserId: string | null;
};

export function isPayrollSettlementStatus(value: unknown): value is PayrollSettlementStatus {
  return (
    typeof value === "string" &&
    (PAYROLL_SETTLEMENT_STATUSES as readonly string[]).includes(value)
  );
}

export function isPayrollAdjustmentType(value: unknown): value is PayrollAdjustmentType {
  return (
    typeof value === "string" &&
    (PAYROLL_ADJUSTMENT_TYPES as readonly string[]).includes(value)
  );
}

/** Signed amount applied at the service-level totals calculation. */
export function signedAdjustmentAmount(
  type: PayrollAdjustmentType,
  amount: number,
): number {
  return type === "descuento" ? -amount : amount;
}

/** `YYYY-MM` label for a period. */
export function formatPeriodLabel(periodYear: number, periodMonth: number): string {
  return `${String(periodYear).padStart(4, "0")}-${String(periodMonth).padStart(2, "0")}`;
}

export function currentPeriodYearMonth(date = new Date()): {
  year: number;
  month: number;
} {
  return { year: date.getFullYear(), month: date.getMonth() + 1 };
}
