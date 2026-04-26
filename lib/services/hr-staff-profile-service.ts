/**
 * Service layer for the Staff Member Profile page (US-67).
 *
 * Aggregates in a single call all the data the profile view needs:
 *   - staff member personal data
 *   - contracts (vigente + finalizado) enriched with structure info
 *   - settlements filtered by the staff member's contracts
 *   - payments (movements with a link back to the settlement)
 *   - consolidated totals (year-to-date + current month)
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

export type StaffProfile = {
  member: StaffMember;
  contracts: StaffContract[];
  settlements: PayrollSettlement[];
  payments: StaffProfilePayment[];
  totals: {
    yearToDate: number;
    currentMonth: number;
  };
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

    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;

    let yearToDate = 0;
    let currentMonth = 0;
    for (const s of settlements) {
      if (s.status !== "pagada" || !s.paidAt) continue;
      const paid = new Date(s.paidAt);
      if (paid.getFullYear() !== year) continue;
      yearToDate += s.totalAmount;
      if (paid.getMonth() + 1 === month) currentMonth += s.totalAmount;
    }

    return {
      ok: true,
      profile: {
        member,
        contracts,
        settlements,
        payments,
        totals: { yearToDate, currentMonth },
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
