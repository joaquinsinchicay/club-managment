/**
 * Service layer for RRHH Reports (US-69).
 *
 * Computes tabular aggregates over paid settlements grouped by period,
 * staff member or activity, plus a projected-vs-executed breakdown per
 * month. Only settlements in `status = 'pagada'` are counted (anuladas
 * and pending are excluded as per PDD).
 *
 * Export to CSV is a pure transform of the aggregate data.
 */

import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canViewHrReports } from "@/lib/domain/authorization";
import type { PayrollSettlement } from "@/lib/domain/payroll-settlement";
import type { StaffContract } from "@/lib/domain/staff-contract";
import { payrollSettlementRepository } from "@/lib/repositories/payroll-settlement-repository";
import { staffContractRepository } from "@/lib/repositories/staff-contract-repository";
import { staffMemberRepository } from "@/lib/repositories/staff-member-repository";

export type HrReportGrouping = "period" | "staff" | "activity" | "projected_vs_executed";

export type HrReportFilters = {
  from?: string | null;
  to?: string | null;
  staffMemberId?: string | null;
  salaryStructureId?: string | null;
  activityId?: string | null;
};

export type HrReportRow = {
  key: string;
  label: string;
  total: number;
  secondary?: number | null;
  diff?: number | null;
  diffPct?: number | null;
};

export type HrReportResult =
  | { ok: true; rows: HrReportRow[]; grouping: HrReportGrouping; totalSum: number }
  | {
      ok: false;
      code:
        | "forbidden"
        | "unauthenticated"
        | "no_active_club"
        | "range_too_large"
        | "unknown_error";
    };

const MAX_RANGE_MONTHS = 24;

function normalizeIsoDate(raw: string | null | undefined): string | null {
  if (!raw) return null;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw)) return null;
  const parsed = new Date(`${raw}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? null : raw;
}

function monthsBetween(from: string, to: string): number {
  const a = new Date(`${from}T00:00:00Z`);
  const b = new Date(`${to}T00:00:00Z`);
  return (
    (b.getUTCFullYear() - a.getUTCFullYear()) * 12 +
    (b.getUTCMonth() - a.getUTCMonth()) +
    1
  );
}

function settlementMatchesFilters(
  s: PayrollSettlement,
  filters: HrReportFilters,
  from: string | null,
  to: string | null,
): boolean {
  if (s.status !== "pagada" || !s.paidAt) return false;
  const paidDate = s.paidAt.slice(0, 10);
  if (from && paidDate < from) return false;
  if (to && paidDate > to) return false;
  if (filters.staffMemberId && s.staffMemberId !== filters.staffMemberId) return false;
  if (filters.salaryStructureId && s.salaryStructureId !== filters.salaryStructureId) {
    return false;
  }
  if (filters.activityId && s.salaryStructureActivityId !== filters.activityId) return false;
  return true;
}

function formatPeriodKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function enumeratePeriods(from: string, to: string): string[] {
  const start = new Date(`${from}T00:00:00Z`);
  const end = new Date(`${to}T00:00:00Z`);
  const out: string[] = [];
  const cursor = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1),
  );
  const stop = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth(), 1));
  while (cursor.getTime() <= stop.getTime()) {
    out.push(formatPeriodKey(cursor));
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }
  return out;
}

function computeProjectedForMonth(
  contracts: StaffContract[],
  year: number,
  month: number,
): number {
  const periodStart = Date.UTC(year, month - 1, 1);
  const periodEnd = Date.UTC(year, month, 0);
  return contracts
    .filter((c) => {
      if (c.status === "finalizado" && c.endDate) {
        const endUtc = new Date(`${c.endDate}T00:00:00Z`).getTime();
        if (endUtc < periodStart) return false;
      }
      if (
        c.salaryStructureRemunerationType === "por_hora" ||
        c.salaryStructureRemunerationType === "por_clase"
      ) {
        return false;
      }
      const start = new Date(`${c.startDate}T00:00:00Z`).getTime();
      const end = c.endDate
        ? new Date(`${c.endDate}T00:00:00Z`).getTime()
        : Number.POSITIVE_INFINITY;
      return start <= periodEnd && end >= periodStart;
    })
    .reduce((acc, c) => acc + (c.currentAmount ?? 0), 0);
}

export async function getHrReport(
  grouping: HrReportGrouping,
  filters: HrReportFilters = {},
): Promise<HrReportResult> {
  const session = await getAuthenticatedSessionContext();
  if (!session) return { ok: false, code: "unauthenticated" };
  if (!session.activeClub || !session.activeMembership) {
    return { ok: false, code: "no_active_club" };
  }
  if (!canViewHrReports(session.activeMembership)) {
    return { ok: false, code: "forbidden" };
  }

  const clubId = session.activeClub.id;
  const from = normalizeIsoDate(filters.from ?? null);
  const to = normalizeIsoDate(filters.to ?? null);

  if (from && to && monthsBetween(from, to) > MAX_RANGE_MONTHS) {
    return { ok: false, code: "range_too_large" };
  }

  try {
    const [settlements, members, contracts] = await Promise.all([
      payrollSettlementRepository.listForClub(clubId),
      staffMemberRepository.listForClub(clubId),
      staffContractRepository.listForClub(clubId),
    ]);

    const filtered = settlements.filter((s) =>
      settlementMatchesFilters(s, filters, from, to),
    );

    if (grouping === "period") {
      const byPeriod = new Map<string, number>();
      for (const s of filtered) {
        const key = `${s.periodYear}-${String(s.periodMonth).padStart(2, "0")}`;
        byPeriod.set(key, (byPeriod.get(key) ?? 0) + s.totalAmount);
      }
      const rows: HrReportRow[] = Array.from(byPeriod.entries())
        .map(([key, total]) => ({ key, label: key, total }))
        .sort((a, b) => (a.key < b.key ? -1 : 1));
      return {
        ok: true,
        grouping,
        rows,
        totalSum: rows.reduce((acc, r) => acc + r.total, 0),
      };
    }

    if (grouping === "staff") {
      const byMember = new Map<string, number>();
      for (const s of filtered) {
        if (!s.staffMemberId) continue;
        byMember.set(s.staffMemberId, (byMember.get(s.staffMemberId) ?? 0) + s.totalAmount);
      }
      const memberNameById = new Map(
        members.map((m) => [m.id, `${m.firstName} ${m.lastName}`.trim()]),
      );
      const rows: HrReportRow[] = Array.from(byMember.entries())
        .map(([key, total]) => ({
          key,
          label: memberNameById.get(key) ?? key,
          total,
        }))
        .sort((a, b) => b.total - a.total);
      return {
        ok: true,
        grouping,
        rows,
        totalSum: rows.reduce((acc, r) => acc + r.total, 0),
      };
    }

    if (grouping === "activity") {
      const byActivity = new Map<string, { label: string; total: number }>();
      for (const s of filtered) {
        const key = s.salaryStructureActivityId ?? "__unassigned__";
        const label =
          s.salaryStructureActivityName ??
          (s.salaryStructureActivityId ? s.salaryStructureActivityId : "Sin actividad");
        const prev = byActivity.get(key) ?? { label, total: 0 };
        prev.total += s.totalAmount;
        byActivity.set(key, prev);
      }
      const rows: HrReportRow[] = Array.from(byActivity.entries())
        .map(([key, val]) => ({ key, label: val.label, total: val.total }))
        .sort((a, b) => b.total - a.total);
      return {
        ok: true,
        grouping,
        rows,
        totalSum: rows.reduce((acc, r) => acc + r.total, 0),
      };
    }

    // projected_vs_executed
    if (!from || !to) {
      const today = new Date();
      const defaultTo = `${today.getUTCFullYear()}-${String(today.getUTCMonth() + 1).padStart(
        2,
        "0",
      )}-01`;
      const defaultFrom = new Date(today.getTime());
      defaultFrom.setUTCMonth(defaultFrom.getUTCMonth() - 5);
      const defaultFromStr = `${defaultFrom.getUTCFullYear()}-${String(
        defaultFrom.getUTCMonth() + 1,
      ).padStart(2, "0")}-01`;
      const periods = enumeratePeriods(defaultFromStr, defaultTo);
      return buildProjectedRows(periods, filtered, contracts);
    }

    const periods = enumeratePeriods(from, to);
    return buildProjectedRows(periods, filtered, contracts);
  } catch (error) {
    console.error("[hr-reports-service.getHrReport]", error);
    return { ok: false, code: "unknown_error" };
  }
}

function buildProjectedRows(
  periods: string[],
  filteredSettlements: PayrollSettlement[],
  contracts: StaffContract[],
): HrReportResult {
  const executedByPeriod = new Map<string, number>();
  for (const s of filteredSettlements) {
    const key = `${s.periodYear}-${String(s.periodMonth).padStart(2, "0")}`;
    executedByPeriod.set(key, (executedByPeriod.get(key) ?? 0) + s.totalAmount);
  }

  const rows: HrReportRow[] = periods.map((key) => {
    const [yearStr, monthStr] = key.split("-");
    const year = Number(yearStr);
    const month = Number(monthStr);
    const projected = computeProjectedForMonth(contracts, year, month);
    const executed = executedByPeriod.get(key) ?? 0;
    const diff = executed - projected;
    const diffPct = projected > 0 ? (diff / projected) * 100 : null;
    return {
      key,
      label: key,
      total: projected,
      secondary: executed,
      diff,
      diffPct,
    };
  });

  const totalSum = rows.reduce((acc, r) => acc + r.total, 0);
  return { ok: true, grouping: "projected_vs_executed", rows, totalSum };
}

// -------------------------------------------------------------------------
// CSV export
// -------------------------------------------------------------------------

function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function formatHrReportCsv(
  grouping: HrReportGrouping,
  rows: HrReportRow[],
): string {
  const header =
    grouping === "projected_vs_executed"
      ? ["Período", "Proyectado", "Ejecutado", "Diferencia", "Desvío %"]
      : ["Clave", "Total"];

  const lines: string[] = [];
  lines.push(header.map(escapeCsvCell).join(","));

  for (const row of rows) {
    if (grouping === "projected_vs_executed") {
      lines.push(
        [
          escapeCsvCell(row.label),
          escapeCsvCell(row.total.toFixed(2)),
          escapeCsvCell((row.secondary ?? 0).toFixed(2)),
          escapeCsvCell((row.diff ?? 0).toFixed(2)),
          escapeCsvCell(row.diffPct === null || row.diffPct === undefined ? "" : row.diffPct.toFixed(2)),
        ].join(","),
      );
    } else {
      lines.push([escapeCsvCell(row.label), escapeCsvCell(row.total.toFixed(2))].join(","));
    }
  }

  // BOM for Excel compatibility on Windows.
  return `\ufeff${lines.join("\r\n")}\r\n`;
}
