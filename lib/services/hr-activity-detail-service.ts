/**
 * Service layer for the Activity Detail page (US-55).
 *
 * Aggregates in a single call all the data the activity detail view needs:
 *   - activity (id + name from club_activities)
 *   - salary_structures attached to the activity
 *   - active contracts grouped by structure → primary division
 *   - monthly cost (sum of current revisions) + previous month delta
 *   - club RRHH share %
 *   - cost evolution last 6 months (from paid payroll_settlements)
 *
 * All reads are scoped by club_id. Returns NULL-equivalent (zeros) when
 * there is no contract data so the UI can render empty states gracefully.
 */

import {
  MissingSupabaseAdminConfigError,
  createRequiredAdminSupabaseClient,
} from "@/lib/supabase/admin";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canAccessHrMasters } from "@/lib/domain/authorization";
import type { SalaryRemunerationType } from "@/lib/domain/salary-structure";
import type { SalaryStructure } from "@/lib/domain/salary-structure";
import { salaryStructureRepository } from "@/lib/repositories/salary-structure-repository";
import { logger } from "@/lib/logger";

export type ActivityCollaborator = {
  contractId: string;
  staffMemberId: string;
  staffMemberName: string;
  structureId: string;
  functionalRole: string;
  divisions: string[];
  primaryDivision: string | null;
  monthlyAmount: number;
  remunerationType: SalaryRemunerationType;
};

export type ActivityCostPoint = {
  year: number;
  month: number;
  total: number;
};

export type ActivityDetail = {
  activity: { id: string; name: string };
  structures: SalaryStructure[];
  divisions: string[];
  collaborators: ActivityCollaborator[];
  totals: {
    monthlyCost: number;
    monthlyCostPrevious: number;
    collaboratorCount: number;
    countByRemuneration: {
      mensual_fijo: number;
      por_hora: number;
      por_clase: number;
    };
    rrhhSharePercentage: number;
  };
  costEvolution: ActivityCostPoint[];
};

export type ActivityDetailResult =
  | { ok: true; detail: ActivityDetail }
  | {
      ok: false;
      code:
        | "unauthenticated"
        | "no_active_club"
        | "forbidden"
        | "activity_not_found"
        | "unknown_error";
    };

const SALARY_DIVISIONS_ORDER = [
  "1ra",
  "3ra",
  "4ta",
  "5ta",
  "6ta",
  "7ma",
  "8va",
  "2012",
  "2013",
  "2014",
  "2015",
  "2016",
  "2017",
  "2018",
  "2019",
  "Senior",
];

function sortDivisions(divisions: string[]): string[] {
  const indexOf = (d: string) => {
    const i = SALARY_DIVISIONS_ORDER.indexOf(d);
    return i === -1 ? Number.MAX_SAFE_INTEGER : i;
  };
  return [...divisions].sort((a, b) => indexOf(a) - indexOf(b));
}

export async function getActivityDetail(activityId: string): Promise<ActivityDetailResult> {
  const session = await getAuthenticatedSessionContext();
  if (!session) return { ok: false, code: "unauthenticated" };
  if (!session.activeClub || !session.activeMembership) {
    return { ok: false, code: "no_active_club" };
  }
  if (!canAccessHrMasters(session.activeMembership)) {
    return { ok: false, code: "forbidden" };
  }

  const clubId = session.activeClub.id;

  try {
    const admin = createRequiredAdminSupabaseClient();

    // 1. Fetch activity
    const { data: activityRow, error: activityErr } = await admin
      .from("club_activities")
      .select("id,name,club_id")
      .eq("id", activityId)
      .eq("club_id", clubId)
      .maybeSingle();
    if (activityErr) {
      logger.error("[hr-activity-detail-service.activity]", activityErr);
      return { ok: false, code: "unknown_error" };
    }
    if (!activityRow) return { ok: false, code: "activity_not_found" };

    // 2. Fetch structures of this activity
    const allStructures = await salaryStructureRepository.listForClub(clubId, {});
    const structures = allStructures.filter((s) => s.activityId === activityId);
    const structureIds = structures.map((s) => s.id);

    // Union of divisions across structures
    const divSet = new Set<string>();
    for (const s of structures) {
      for (const d of s.divisions) divSet.add(d);
    }
    const divisions = sortDivisions([...divSet]);

    // 3. Fetch active contracts for these structures
    let contractRows: Array<{
      id: string;
      staff_member_id: string;
      salary_structure_id: string;
      staff_member: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
    }> = [];
    if (structureIds.length > 0) {
      const { data, error } = await admin
        .from("staff_contracts")
        .select(
          "id,staff_member_id,salary_structure_id,staff_member:staff_members(first_name,last_name)",
        )
        .eq("club_id", clubId)
        .eq("status", "vigente")
        .in("salary_structure_id", structureIds);
      if (error) {
        logger.error("[hr-activity-detail-service.contracts]", error);
        return { ok: false, code: "unknown_error" };
      }
      contractRows = data ?? [];
    }
    const contractIds = contractRows.map((c) => c.id);

    // 4. Fetch current revisions for these contracts
    const amountByContract = new Map<string, number>();
    if (contractIds.length > 0) {
      const { data, error } = await admin
        .from("staff_contract_revisions")
        .select("contract_id,amount,end_date")
        .eq("club_id", clubId)
        .is("end_date", null)
        .in("contract_id", contractIds);
      if (error) {
        logger.error("[hr-activity-detail-service.revisions]", error);
        return { ok: false, code: "unknown_error" };
      }
      for (const r of (data ?? []) as Array<{ contract_id: string; amount: number | string }>) {
        amountByContract.set(r.contract_id, Number(r.amount));
      }
    }

    // 5. Build collaborators list
    const structureById = new Map(structures.map((s) => [s.id, s] as const));
    const collaborators: ActivityCollaborator[] = contractRows.map((c) => {
      const staffMember = Array.isArray(c.staff_member) ? c.staff_member[0] ?? null : c.staff_member;
      const structure = structureById.get(c.salary_structure_id);
      const fullName = staffMember
        ? `${staffMember.first_name} ${staffMember.last_name}`.trim()
        : "—";
      const sortedDivisions = structure ? sortDivisions(structure.divisions) : [];
      return {
        contractId: c.id,
        staffMemberId: c.staff_member_id,
        staffMemberName: fullName,
        structureId: c.salary_structure_id,
        functionalRole: structure?.functionalRole ?? "—",
        divisions: sortedDivisions,
        primaryDivision: sortedDivisions[0] ?? null,
        monthlyAmount: amountByContract.get(c.id) ?? 0,
        remunerationType: structure?.remunerationType ?? "mensual_fijo",
      };
    });

    // 6. Totals — monthly cost (current month, sum of current revisions)
    const monthlyCost = collaborators.reduce((acc, c) => acc + c.monthlyAmount, 0);

    // Collaborator counts by remuneration_type
    const countByRemuneration = {
      mensual_fijo: 0,
      por_hora: 0,
      por_clase: 0,
    };
    for (const c of collaborators) {
      countByRemuneration[c.remunerationType] += 1;
    }

    // 7. Club RRHH share — sum of all current revisions for the club (all activities + transversales)
    let clubMonthlyCost = 0;
    {
      const { data: allActiveContracts, error: clubErr } = await admin
        .from("staff_contracts")
        .select("id")
        .eq("club_id", clubId)
        .eq("status", "vigente");
      if (clubErr) {
        logger.error("[hr-activity-detail-service.club_contracts]", clubErr);
      } else if ((allActiveContracts ?? []).length > 0) {
        const allIds = (allActiveContracts ?? []).map((r: { id: string }) => r.id);
        const { data: allRevisions, error: revErr } = await admin
          .from("staff_contract_revisions")
          .select("amount")
          .eq("club_id", clubId)
          .is("end_date", null)
          .in("contract_id", allIds);
        if (revErr) {
          logger.error("[hr-activity-detail-service.club_revisions]", revErr);
        } else {
          for (const r of (allRevisions ?? []) as Array<{ amount: number | string }>) {
            clubMonthlyCost += Number(r.amount);
          }
        }
      }
    }
    const rrhhSharePercentage =
      clubMonthlyCost > 0 ? (monthlyCost / clubMonthlyCost) * 100 : 0;

    // 8. Cost evolution — last 6 months from paid payroll_settlements
    const now = new Date();
    const months: { year: number; month: number }[] = [];
    for (let i = 5; i >= 0; i -= 1) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      months.push({ year: d.getUTCFullYear(), month: d.getUTCMonth() + 1 });
    }
    const costEvolution: ActivityCostPoint[] = months.map((m) => ({
      ...m,
      total: 0,
    }));
    if (contractIds.length > 0 && months[0] && months[months.length - 1]) {
      const earliest = months[0];
      const latest = months[months.length - 1]!;
      const { data: settlements, error: settlementsErr } = await admin
        .from("payroll_settlements")
        .select("period_year,period_month,total_amount,status")
        .eq("club_id", clubId)
        .eq("status", "pagada")
        .in("contract_id", contractIds)
        .gte("period_year", earliest.year)
        .lte("period_year", latest.year);
      if (settlementsErr) {
        logger.error("[hr-activity-detail-service.settlements]", settlementsErr);
      } else {
        for (const s of (settlements ?? []) as Array<{
          period_year: number;
          period_month: number;
          total_amount: number | string;
        }>) {
          const point = costEvolution.find(
            (p) => p.year === s.period_year && p.month === s.period_month,
          );
          if (point) point.total += Number(s.total_amount);
        }
      }
    }

    // Previous month cost
    const prevMonthIdx = costEvolution.length - 2;
    const monthlyCostPrevious =
      prevMonthIdx >= 0 ? costEvolution[prevMonthIdx]?.total ?? 0 : 0;

    return {
      ok: true,
      detail: {
        activity: { id: activityRow.id, name: activityRow.name },
        structures,
        divisions,
        collaborators,
        totals: {
          monthlyCost,
          monthlyCostPrevious,
          collaboratorCount: collaborators.length,
          countByRemuneration,
          rrhhSharePercentage,
        },
        costEvolution,
      },
    };
  } catch (error) {
    if (error instanceof MissingSupabaseAdminConfigError) {
      logger.error("[hr-activity-detail-service.config]", error);
    } else {
      logger.error("[hr-activity-detail-service]", error);
    }
    return { ok: false, code: "unknown_error" };
  }
}
