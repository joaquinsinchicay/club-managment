import type {
  PayrollSettlement,
  PayrollSettlementStatus,
} from "@/lib/domain/payroll-settlement";
import { texts } from "@/lib/texts";

export type StatusFilter = "all" | PayrollSettlementStatus;

export type PeriodValue = { year: number; month: number };

export type SelectionMode = "none" | "approve" | "pay" | "mixed";

const sTexts = texts.rrhh.settlements;

export const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: sTexts.filter_all },
  { value: "generada", label: sTexts.filter_generada },
  { value: "aprobada_rrhh", label: sTexts.filter_aprobada_rrhh },
  { value: "pagada", label: sTexts.filter_pagada },
  { value: "anulada", label: sTexts.filter_anulada },
];

export const MONTH_LABELS_LONG = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export function formatPeriodLong(year: number, month: number): string {
  return `${MONTH_LABELS_LONG[month - 1]} ${year}`;
}

export function shiftPeriod(p: PeriodValue, delta: number): PeriodValue {
  const totalMonths = p.year * 12 + (p.month - 1) + delta;
  return {
    year: Math.floor(totalMonths / 12),
    month: (((totalMonths % 12) + 12) % 12) + 1,
  };
}

export function findLatestPeriod(settlements: PayrollSettlement[]): PeriodValue | null {
  let latest: PeriodValue | null = null;
  for (const s of settlements) {
    if (
      !latest ||
      s.periodYear > latest.year ||
      (s.periodYear === latest.year && s.periodMonth > latest.month)
    ) {
      latest = { year: s.periodYear, month: s.periodMonth };
    }
  }
  return latest;
}

export function formatAmount(
  amount: number | null | undefined,
  currencyCode: string,
): string {
  if (amount === null || amount === undefined) return "—";
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

export function computeSelectionMode(
  selectedSettlements: PayrollSettlement[],
): SelectionMode {
  if (selectedSettlements.length === 0) return "none";
  const allGenerada = selectedSettlements.every((s) => s.status === "generada");
  const allAprobadaRrhh = selectedSettlements.every((s) => s.status === "aprobada_rrhh");
  if (allGenerada) return "approve";
  if (allAprobadaRrhh) return "pay";
  return "mixed";
}
