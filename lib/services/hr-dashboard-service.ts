/**
 * Service layer for the RRHH Dashboard (US-68).
 *
 * Computes the operational cards rendered in `/rrhh`:
 *   - Banner: contratos con revisión salarial atrasada (>12 meses).
 *   - Liquidación del período actual (monto + progreso pagadas/total).
 *   - A pagar (count + monto + fecha estimada de vencimiento).
 *   - Colaboradores activos (= con contrato vigente) + altas últimos 30 días.
 *   - Contratos vigentes (count + revisión atrasada + vencen en 60d).
 *   - Costo mensual (current + previous + 2-months-ago + delta %).
 *   - Estructuras (count activas + lista de nombres).
 *   - Colaboradores sin contrato (alertas).
 *   - Próximos hitos: revisiones atrasadas + fines de contrato próximos 60d.
 */

import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canAccessHrModule } from "@/lib/domain/authorization";
import { formatContractCode } from "@/lib/domain/staff-contract";
import type { PayrollSettlementStatus } from "@/lib/domain/payroll-settlement";
import { payrollSettlementRepository } from "@/lib/repositories/payroll-settlement-repository";
import { salaryStructureRepository } from "@/lib/repositories/salary-structure-repository";
import { staffContractRepository } from "@/lib/repositories/staff-contract-repository";
import { staffMemberRepository } from "@/lib/repositories/staff-member-repository";

const REVISION_STALE_MONTHS = 12;
const ENDING_SOON_DAYS = 60;
const ADDITIONS_WINDOW_DAYS = 30;
const STRUCTURE_NAMES_LIMIT = 6;
const MILESTONES_LIMIT = 8;

export type HrDashboardSummary = {
  pendingApprove: { count: number; totalAmount: number };
  pendingPay: { count: number; totalAmount: number };
  projectedMonth: number;
  executedMonth: number;
  vacantStructures: number;
  alertsCount: number;
  periodYear: number;
  periodMonth: number;

  currentPeriodSettlements: {
    totalAmount: number;
    paidCount: number;
    totalCount: number;
    dominantStatus: PayrollSettlementStatus | null;
  };
  payDueDate: string | null;
  activeStaff: {
    count: number;
    additionsLast30d: number;
  };
  activeContracts: {
    count: number;
    staleRevisionCount: number;
    endingSoonCount: number;
  };
  monthlyCost: {
    current: number;
    previous: number;
    twoMonthsAgo: number;
    previousLabel: string;
    twoMonthsAgoLabel: string;
    deltaPct: number | null;
  };
  structures: {
    activeCount: number;
    vacantCount: number;
    nameList: string[];
  };
  upcomingMilestones: Array<{
    type: "revision_salarial" | "fin_contrato";
    title: string;
    subtitle: string;
    dueDate: string;
    daysUntil: number;
    href: string;
  }>;
  staleRevisionsAlertCount: number;
};

export type HrDashboardResult =
  | { ok: true; summary: HrDashboardSummary }
  | { ok: false; code: "forbidden" | "unauthenticated" | "no_active_club" | "unknown_error" };

const SHORT_MONTH_LABEL = new Intl.DateTimeFormat("es-AR", { month: "short" });

function shortMonthLabel(year: number, monthIndex0: number): string {
  const label = SHORT_MONTH_LABEL.format(new Date(Date.UTC(year, monthIndex0, 1)));
  const trimmed = label.replace(/\.$/, "");
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

function dominantSettlementStatus(
  statuses: PayrollSettlementStatus[],
): PayrollSettlementStatus | null {
  if (statuses.length === 0) return null;
  const counts = new Map<PayrollSettlementStatus, number>();
  for (const s of statuses) counts.set(s, (counts.get(s) ?? 0) + 1);
  // Prioridad para empate: pagada > aprobada_rrhh > generada > anulada.
  const priority: PayrollSettlementStatus[] = [
    "pagada",
    "aprobada_rrhh",
    "generada",
    "anulada",
  ];
  let best: PayrollSettlementStatus | null = null;
  let bestCount = -1;
  for (const status of priority) {
    const count = counts.get(status) ?? 0;
    if (count > bestCount) {
      best = status;
      bestCount = count;
    }
  }
  return best;
}

function lastDayOfMonth(year: number, month1: number): Date {
  return new Date(Date.UTC(year, month1, 0));
}

export async function getHrDashboardSummary(): Promise<HrDashboardResult> {
  const session = await getAuthenticatedSessionContext();
  if (!session) return { ok: false, code: "unauthenticated" };
  if (!session.activeClub || !session.activeMembership) {
    return { ok: false, code: "no_active_club" };
  }
  if (!canAccessHrModule(session.activeMembership)) {
    return { ok: false, code: "forbidden" };
  }

  const clubId = session.activeClub.id;
  const now = new Date();
  const periodYear = now.getFullYear();
  const periodMonth = now.getMonth() + 1;
  const todayMs = now.getTime();
  const additionsCutoffMs = todayMs - ADDITIONS_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const endingSoonCutoffMs = todayMs + ENDING_SOON_DAYS * 24 * 60 * 60 * 1000;
  const staleRevisionCutoffMs = todayMs - REVISION_STALE_MONTHS * 30 * 24 * 60 * 60 * 1000;

  try {
    const [settlements, contracts, structures, staffMembers] = await Promise.all([
      payrollSettlementRepository.listForClub(clubId),
      staffContractRepository.listForClub(clubId),
      salaryStructureRepository.listForClub(clubId),
      staffMemberRepository.listForClub(clubId),
    ]);

    let pendingApproveCount = 0;
    let pendingApproveAmount = 0;
    let pendingPayCount = 0;
    let pendingPayAmount = 0;
    let executedMonth = 0;
    const monthlyExecuted = new Map<string, number>(); // key = "YYYY-MM"

    let currentPeriodTotal = 0;
    let currentPeriodPaid = 0;
    let currentPeriodAmount = 0;
    const currentPeriodStatuses: PayrollSettlementStatus[] = [];

    for (const s of settlements) {
      if (s.status === "generada") {
        pendingApproveCount += 1;
        pendingApproveAmount += s.totalAmount;
      } else if (s.status === "aprobada_rrhh") {
        pendingPayCount += 1;
        pendingPayAmount += s.totalAmount;
      }

      if (s.status === "pagada" && s.paidAt) {
        const paidDate = new Date(s.paidAt);
        const py = paidDate.getFullYear();
        const pm = paidDate.getMonth() + 1;
        const key = `${py}-${String(pm).padStart(2, "0")}`;
        monthlyExecuted.set(key, (monthlyExecuted.get(key) ?? 0) + s.totalAmount);
        if (py === periodYear && pm === periodMonth) {
          executedMonth += s.totalAmount;
        }
      }

      if (s.periodYear === periodYear && s.periodMonth === periodMonth && s.status !== "anulada") {
        currentPeriodTotal += 1;
        currentPeriodAmount += s.totalAmount;
        currentPeriodStatuses.push(s.status);
        if (s.status === "pagada") currentPeriodPaid += 1;
      }
    }

    const periodStart = new Date(Date.UTC(periodYear, periodMonth - 1, 1));
    const periodEnd = lastDayOfMonth(periodYear, periodMonth);
    const projectedMonth = contracts
      .filter((c) => {
        if (c.status !== "vigente") return false;
        if (c.salaryStructureRemunerationType === "por_hora") return false;
        if (c.salaryStructureRemunerationType === "por_clase") return false;
        const start = new Date(`${c.startDate}T00:00:00Z`).getTime();
        const end = c.endDate
          ? new Date(`${c.endDate}T00:00:00Z`).getTime()
          : Number.POSITIVE_INFINITY;
        return start <= periodEnd.getTime() && end >= periodStart.getTime();
      })
      .reduce((acc, c) => acc + (c.currentAmount ?? 0), 0);

    const vacantStructures = structures.filter(
      (s) => s.status === "activa" && !s.hasActiveContract,
    ).length;

    const alertsCount = staffMembers.filter((m) => !m.hasActiveContract).length;

    const activeStaffCount = staffMembers.filter((m) => m.hasActiveContract).length;
    const additionsLast30d = staffMembers.filter((m) => {
      const created = new Date(m.createdAt).getTime();
      return Number.isFinite(created) && created >= additionsCutoffMs;
    }).length;

    const vigentes = contracts.filter((c) => c.status === "vigente");
    const vigentesCount = vigentes.length;
    const staleRevisionContracts = vigentes.filter((c) => {
      if (c.salaryStructureRemunerationType === "por_hora") return false;
      if (c.salaryStructureRemunerationType === "por_clase") return false;
      if (!c.currentRevisionEffectiveDate) return true;
      const effMs = new Date(`${c.currentRevisionEffectiveDate}T00:00:00Z`).getTime();
      return effMs <= staleRevisionCutoffMs;
    });
    const endingSoonContracts = vigentes.filter((c) => {
      if (!c.endDate) return false;
      const endMs = new Date(`${c.endDate}T00:00:00Z`).getTime();
      return endMs >= todayMs && endMs <= endingSoonCutoffMs;
    });

    // Costo mensual: actual + previo + 2 meses atrás
    const prevDate = new Date(Date.UTC(periodYear, periodMonth - 2, 1));
    const twoAgoDate = new Date(Date.UTC(periodYear, periodMonth - 3, 1));
    const prevKey = `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, "0")}`;
    const twoAgoKey = `${twoAgoDate.getUTCFullYear()}-${String(twoAgoDate.getUTCMonth() + 1).padStart(2, "0")}`;
    const previous = monthlyExecuted.get(prevKey) ?? 0;
    const twoMonthsAgo = monthlyExecuted.get(twoAgoKey) ?? 0;
    const deltaPct =
      previous > 0 ? Math.round(((executedMonth - previous) / previous) * 1000) / 10 : null;

    const structuresActive = structures.filter((s) => s.status === "activa");
    const structureNames: string[] = [];
    const seen = new Set<string>();
    for (const s of structuresActive) {
      const name = s.functionalRole?.trim() || s.name?.trim();
      if (name && !seen.has(name)) {
        seen.add(name);
        structureNames.push(name);
        if (structureNames.length >= STRUCTURE_NAMES_LIMIT) break;
      }
    }

    // Próximos hitos
    type Milestone = HrDashboardSummary["upcomingMilestones"][number];
    const milestones: Milestone[] = [];
    for (const c of staleRevisionContracts) {
      const dueDate = c.currentRevisionEffectiveDate ?? c.startDate;
      const dueMs = new Date(`${dueDate}T00:00:00Z`).getTime();
      const days = Math.round((dueMs - todayMs) / (24 * 60 * 60 * 1000));
      milestones.push({
        type: "revision_salarial",
        title: `Revisión salarial · ${c.staffMemberName ?? "—"}`,
        subtitle: `Contrato ${formatContractCode(c.id)} · Última revisión ${dueDate}`,
        dueDate,
        daysUntil: days, // negativo = vencida
        href: `/rrhh/contracts/${c.id}`,
      });
    }
    for (const c of endingSoonContracts) {
      const days = Math.round(
        (new Date(`${c.endDate!}T00:00:00Z`).getTime() - todayMs) / (24 * 60 * 60 * 1000),
      );
      milestones.push({
        type: "fin_contrato",
        title: `Fin de contrato · ${c.staffMemberName ?? "—"}`,
        subtitle: `Contrato ${formatContractCode(c.id)} · Finaliza ${c.endDate}`,
        dueDate: c.endDate!,
        daysUntil: days,
        href: `/rrhh/contracts/${c.id}`,
      });
    }
    milestones.sort((a, b) => a.daysUntil - b.daysUntil);
    const upcomingMilestones = milestones.slice(0, MILESTONES_LIMIT);

    // Pay due date: último día del mes en curso si hay liquidaciones aprobadas pendientes.
    const payDueDate =
      pendingPayCount > 0
        ? `${periodEnd.getUTCFullYear()}-${String(periodEnd.getUTCMonth() + 1).padStart(2, "0")}-${String(periodEnd.getUTCDate()).padStart(2, "0")}`
        : null;

    return {
      ok: true,
      summary: {
        pendingApprove: { count: pendingApproveCount, totalAmount: pendingApproveAmount },
        pendingPay: { count: pendingPayCount, totalAmount: pendingPayAmount },
        projectedMonth,
        executedMonth,
        vacantStructures,
        alertsCount,
        periodYear,
        periodMonth,
        currentPeriodSettlements: {
          totalAmount: currentPeriodAmount,
          paidCount: currentPeriodPaid,
          totalCount: currentPeriodTotal,
          dominantStatus: dominantSettlementStatus(currentPeriodStatuses),
        },
        payDueDate,
        activeStaff: {
          count: activeStaffCount,
          additionsLast30d,
        },
        activeContracts: {
          count: vigentesCount,
          staleRevisionCount: staleRevisionContracts.length,
          endingSoonCount: endingSoonContracts.length,
        },
        monthlyCost: {
          current: executedMonth,
          previous,
          twoMonthsAgo,
          previousLabel: shortMonthLabel(prevDate.getUTCFullYear(), prevDate.getUTCMonth()),
          twoMonthsAgoLabel: shortMonthLabel(twoAgoDate.getUTCFullYear(), twoAgoDate.getUTCMonth()),
          deltaPct,
        },
        structures: {
          activeCount: structuresActive.length,
          vacantCount: vacantStructures,
          nameList: structureNames,
        },
        upcomingMilestones,
        staleRevisionsAlertCount: staleRevisionContracts.length,
      },
    };
  } catch (error) {
    console.error("[hr-dashboard-service.summary]", error);
    return { ok: false, code: "unknown_error" };
  }
}
