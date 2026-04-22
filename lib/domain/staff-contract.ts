/**
 * Domain entity and pure helpers for Staff Contracts (US-57 / US-58).
 *
 * A staff contract links a `staff_member` to a `salary_structure` with a
 * start date, optional end date, and a flag `uses_structure_amount` that
 * decides whether liquidaciones read the structure's current amount or the
 * frozen amount stored on the contract.
 *
 * Business invariants enforced DB-side:
 *  - Partial unique index `(salary_structure_id) where status = 'vigente'`
 *    guarantees one active contract per structure.
 *  - Check `uses_structure_amount = true OR frozen_amount is not null`
 *    guarantees the amount source is always resolvable.
 *  - Check `end_date is null OR end_date >= start_date` guarantees a
 *    coherent date range.
 *
 * Effect-free module.
 */

export const STAFF_CONTRACT_STATUSES = ["vigente", "finalizado"] as const;
export type StaffContractStatus = (typeof STAFF_CONTRACT_STATUSES)[number];

export type StaffContract = {
  id: string;
  clubId: string;
  staffMemberId: string;
  staffMemberName: string | null;
  salaryStructureId: string;
  salaryStructureName: string | null;
  salaryStructureRole: string | null;
  salaryStructureActivityId: string | null;
  salaryStructureActivityName: string | null;
  salaryStructureRemunerationType: string | null;
  startDate: string;
  endDate: string | null;
  usesStructureAmount: boolean;
  frozenAmount: number | null;
  /**
   * Convenience: the amount currently applied to this contract.
   * - If `usesStructureAmount = true` → the structure's current version amount.
   * - If `usesStructureAmount = false` → `frozenAmount`.
   * Resolved by the repository join.
   */
  effectiveAmount: number | null;
  status: StaffContractStatus;
  finalizedAt: string | null;
  finalizedReason: string | null;
  finalizedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string | null;
  updatedByUserId: string | null;
};

export function isStaffContractStatus(value: unknown): value is StaffContractStatus {
  return (
    typeof value === "string" &&
    (STAFF_CONTRACT_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Maximum backdated start_date allowed when creating a contract.
 * Prevents fat-finger errors without blocking legitimate formalization of
 * recently-started contracts.
 */
export const CONTRACT_MAX_BACKDATE_DAYS = 30;

export function isStartDateTooOld(
  startDate: string,
  today: string = new Date().toISOString().slice(0, 10),
): boolean {
  const start = new Date(`${startDate}T00:00:00Z`).getTime();
  const now = new Date(`${today}T00:00:00Z`).getTime();
  if (Number.isNaN(start) || Number.isNaN(now)) return false;
  const msPerDay = 24 * 60 * 60 * 1000;
  const diffDays = (now - start) / msPerDay;
  return diffDays > CONTRACT_MAX_BACKDATE_DAYS;
}
