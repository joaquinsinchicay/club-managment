/**
 * Service layer for the Staff Member Profile page (US-67).
 *
 * Aggregates in a single call all the data the profile view needs:
 *   - staff member personal data
 *   - contracts (vigente + finalizado) enriched with structure info
 *   - settlements filtered by the staff member's contracts
 *   - payments (movements with a link back to the settlement)
 *   - recent activity feed (hr_activity_log for the member + child entities)
 *
 * All reads are scoped by the repository layer to the active club.
 */

import {
  MissingSupabaseAdminConfigError,
  createRequiredAdminSupabaseClient,
} from "@/lib/supabase/admin";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canViewStaffProfile } from "@/lib/domain/authorization";
import type { PayrollSettlement } from "@/lib/domain/payroll-settlement";
import type { StaffContract } from "@/lib/domain/staff-contract";
import type { StaffMember } from "@/lib/domain/staff-member";
import { payrollSettlementRepository } from "@/lib/repositories/payroll-settlement-repository";
import { staffContractRepository } from "@/lib/repositories/staff-contract-repository";
import { staffMemberRepository } from "@/lib/repositories/staff-member-repository";

export type StaffProfilePayment = {
  movementId: string;
  movementDate: string;
  movementDisplayId: string;
  accountId: string;
  accountName: string | null;
  amount: number;
  currencyCode: string;
  settlementId: string | null;
};

export type StaffActivityEntry = {
  id: string;
  entityType: "staff_member" | "staff_contract" | "payroll_settlement" | string;
  action: string;
  performedAt: string;
  payloadBefore: Record<string, unknown> | null;
  payloadAfter: Record<string, unknown> | null;
};

export type StaffProfile = {
  member: StaffMember;
  contracts: StaffContract[];
  settlements: PayrollSettlement[];
  payments: StaffProfilePayment[];
  recentActivity: StaffActivityEntry[];
  hasActiveContract: boolean;
};

export type StaffProfileResult =
  | { ok: true; profile: StaffProfile }
  | {
      ok: false;
      code:
        | "unauthenticated"
        | "no_active_club"
        | "forbidden"
        | "member_not_found"
        | "unknown_error";
    };

async function fetchPaymentsForContracts(
  clubId: string,
  contractIds: string[],
): Promise<StaffProfilePayment[]> {
  if (contractIds.length === 0) return [];
  const admin = createRequiredAdminSupabaseClient();

  // Fetch settlements belonging to the contracts, so we can read the linked
  // movement ids.
  const { data: settlementRows, error: settlementErr } = await admin
    .from("payroll_settlements")
    .select("id,contract_id,status,paid_movement_id")
    .in("contract_id", contractIds)
    .eq("club_id", clubId)
    .not("paid_movement_id", "is", null);
  if (settlementErr) {
    console.error("[hr-staff-profile-service.payments.settlements]", settlementErr);
    return [];
  }
  const movementIds = (settlementRows ?? [])
    .map((r: { paid_movement_id: string | null }) => r.paid_movement_id)
    .filter((x): x is string => Boolean(x));
  const settlementByMovement = new Map<string, string>();
  for (const r of (settlementRows ?? []) as Array<{
    id: string;
    paid_movement_id: string | null;
  }>) {
    if (r.paid_movement_id) settlementByMovement.set(r.paid_movement_id, r.id);
  }
  if (movementIds.length === 0) return [];

  const { data: movementRows, error: movementErr } = await admin
    .from("treasury_movements")
    .select(
      "id,display_id,movement_date,account_id,amount,currency_code,status,account:treasury_accounts(name)",
    )
    .in("id", movementIds)
    .eq("club_id", clubId);
  if (movementErr) {
    console.error("[hr-staff-profile-service.payments.movements]", movementErr);
    return [];
  }

  type MovementRow = {
    id: string;
    display_id: string;
    movement_date: string;
    account_id: string;
    amount: number | string;
    currency_code: string;
    status: string;
    account: { name: string } | { name: string }[] | null;
  };
  const rows = (movementRows ?? []) as unknown as MovementRow[];

  return rows
    .map((row) => {
      const accountValue = Array.isArray(row.account) ? row.account[0] ?? null : row.account;
      return {
        movementId: row.id,
        movementDisplayId: row.display_id,
        movementDate: row.movement_date,
        accountId: row.account_id,
        accountName: accountValue?.name ?? null,
        amount: Number(row.amount),
        currencyCode: row.currency_code,
        settlementId: settlementByMovement.get(row.id) ?? null,
      };
    })
    .sort((a, b) => (a.movementDate < b.movementDate ? 1 : -1));
}

async function fetchRecentActivity(
  clubId: string,
  memberId: string,
  contractIds: string[],
  settlementIds: string[],
): Promise<StaffActivityEntry[]> {
  const admin = createRequiredAdminSupabaseClient();
  const ors: string[] = [`and(entity_type.eq.staff_member,entity_id.eq.${memberId})`];
  if (contractIds.length > 0) {
    ors.push(`and(entity_type.eq.staff_contract,entity_id.in.(${contractIds.join(",")}))`);
  }
  if (settlementIds.length > 0) {
    ors.push(
      `and(entity_type.eq.payroll_settlement,entity_id.in.(${settlementIds.join(",")}))`,
    );
  }
  const { data, error } = await admin
    .from("hr_activity_log")
    .select("id,entity_type,action,performed_at,payload_before,payload_after")
    .eq("club_id", clubId)
    .or(ors.join(","))
    .order("performed_at", { ascending: false })
    .limit(8);
  if (error) {
    console.error("[hr-staff-profile-service.recentActivity]", error);
    return [];
  }
  type Row = {
    id: string;
    entity_type: string;
    action: string;
    performed_at: string;
    payload_before: Record<string, unknown> | null;
    payload_after: Record<string, unknown> | null;
  };
  return (data as Row[] | null ?? []).map((row) => ({
    id: row.id,
    entityType: row.entity_type,
    action: row.action,
    performedAt: row.performed_at,
    payloadBefore: row.payload_before,
    payloadAfter: row.payload_after,
  }));
}

export async function getStaffProfile(memberId: string): Promise<StaffProfileResult> {
  const session = await getAuthenticatedSessionContext();
  if (!session) return { ok: false, code: "unauthenticated" };
  if (!session.activeClub || !session.activeMembership) {
    return { ok: false, code: "no_active_club" };
  }
  if (!canViewStaffProfile(session.activeMembership)) {
    return { ok: false, code: "forbidden" };
  }

  const clubId = session.activeClub.id;

  try {
    const member = await staffMemberRepository.getById(clubId, memberId);
    if (!member) return { ok: false, code: "member_not_found" };

    const contracts = await staffContractRepository.listForClub(clubId, {
      staffMemberId: memberId,
    });
    const contractIds = contracts.map((c) => c.id);

    const [settlementsAll, payments] = await Promise.all([
      payrollSettlementRepository.listForClub(clubId, { staffMemberId: memberId }),
      fetchPaymentsForContracts(clubId, contractIds),
    ]);
    const settlements = settlementsAll;
    const settlementIds = settlements.map((s) => s.id);
    const recentActivity = await fetchRecentActivity(
      clubId,
      memberId,
      contractIds,
      settlementIds,
    );

    return {
      ok: true,
      profile: {
        member,
        contracts,
        settlements,
        payments,
        recentActivity,
        hasActiveContract: contracts.some((c) => c.status === "vigente"),
      },
    };
  } catch (error) {
    if (error instanceof MissingSupabaseAdminConfigError) {
      console.error("[hr-staff-profile-service.getStaffProfile.config]", error);
    } else {
      console.error("[hr-staff-profile-service.getStaffProfile]", error);
    }
    return { ok: false, code: "unknown_error" };
  }
}
