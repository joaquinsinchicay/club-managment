/**
 * CSV export helper for the Treasury · Payroll Pending tray (US-71).
 *
 * Cliente puro: no toca DB ni auth. Recibe la lista filtrada que ya muestra
 * la UI y devuelve un string CSV listo para descargar (UTF-8 con BOM para
 * abrir bien en Excel).
 */

import {
  formatPeriodLabel,
  type PayrollSettlement,
} from "@/lib/domain/payroll-settlement";
import { formatContractCode } from "@/lib/domain/staff-contract";

const CSV_BOM = "﻿";
const SEPARATOR = ",";

function escape(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.includes(",") || str.includes("\"") || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function formatAmountForCsv(amount: number, currencyCode: string): string {
  return `${currencyCode} ${amount.toFixed(2)}`;
}

export function formatPayrollPendingCsv(
  settlements: PayrollSettlement[],
  clubCurrencyCode: string,
  approverNamesByUserId: Record<string, string>,
): string {
  const headers = [
    "Período",
    "Colaborador",
    "Contrato",
    "Rol",
    "Actividad",
    "Estructura",
    "Monto",
    "Aprobada el",
    "Aprobada por",
    "Notas",
  ];

  const rows = settlements.map((s) => [
    formatPeriodLabel(s.periodYear, s.periodMonth),
    s.staffMemberName ?? "",
    formatContractCode(s.contractId),
    s.salaryStructureRole ?? "",
    s.salaryStructureActivityName ?? "",
    s.salaryStructureName ?? "",
    formatAmountForCsv(s.totalAmount, clubCurrencyCode),
    s.approvedAt ? s.approvedAt.slice(0, 10) : "",
    s.approvedByUserId ? approverNamesByUserId[s.approvedByUserId] ?? "" : "",
    s.notes ?? "",
  ]);

  const lines = [headers, ...rows].map((cells) => cells.map(escape).join(SEPARATOR));
  return CSV_BOM + lines.join("\n");
}

export function buildPayrollCsvFileName(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `pagos-pendientes-${yyyy}-${mm}-${dd}.csv`;
}
