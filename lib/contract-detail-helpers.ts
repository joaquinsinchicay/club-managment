import type { PayrollSettlement } from "@/lib/domain/payroll-settlement";
import { texts } from "@/lib/texts";

const cdTexts = texts.rrhh.contract_detail;
const ssTexts = texts.rrhh.salary_structures;

export const SPANISH_MONTHS = [
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

export const SPANISH_MONTHS_SHORT = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

export type SettlementChipTone = "income" | "warning" | "info" | "neutral";

export const SETTLEMENT_TONES: Record<
  PayrollSettlement["status"],
  { tone: SettlementChipTone; labelKey: keyof typeof cdTexts }
> = {
  generada: { tone: "warning", labelKey: "settlements_status_generada" },
  aprobada_rrhh: { tone: "info", labelKey: "settlements_status_aprobada_rrhh" },
  pagada: { tone: "income", labelKey: "settlements_status_pagada" },
  anulada: { tone: "neutral", labelKey: "settlements_status_anulada" },
};

export function resolvePaymentTypeLabel(raw: string | null): string | null {
  if (!raw) return null;
  const opts = ssTexts.payment_type_options as Record<string, string>;
  return opts[raw] ?? raw;
}

export function resolveRemunerationTypeLabel(raw: string | null): string | null {
  if (!raw) return null;
  const opts = ssTexts.remuneration_type_options as Record<string, string>;
  return opts[raw] ?? raw;
}

export function formatMonthYear(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m] = iso.slice(0, 10).split("-");
  const monthIdx = Number(m) - 1;
  if (!y || Number.isNaN(monthIdx) || monthIdx < 0 || monthIdx > 11) return iso;
  return `${SPANISH_MONTHS_SHORT[monthIdx]} ${y}`;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
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

export function formatIsoDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
