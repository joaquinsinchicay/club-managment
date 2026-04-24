/**
 * Service layer for Staff Contracts (US-57 / US-58).
 *
 * Orchestrates:
 *  - Authorization (`admin` or `rrhh`).
 *  - Business-rule validation: campos obligatorios, backdate max 30 días,
 *    coherencia end_date >= start_date, amount > 0 si flag off, unicidad
 *    de estructura vigente, colaborador/estructura activos.
 *  - Freeze/unfreeze del monto al alternar `uses_structure_amount`.
 *  - Delegación de `finalize` al RPC `hr_finalize_contract` SECURITY DEFINER.
 *  - Audit log append-only.
 */

import { parseLocalizedAmount } from "@/lib/amounts";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import type { Membership } from "@/lib/domain/access";
import { canAccessHrMasters, canMutateHrMasters } from "@/lib/domain/authorization";
import {
  CONTRACT_MAX_BACKDATE_DAYS,
  isStartDateTooOld,
  type StaffContract,
} from "@/lib/domain/staff-contract";
import {
  isStaffContractRepositoryInfraError,
  staffContractRepository,
  type ListStaffContractsFilters,
} from "@/lib/repositories/staff-contract-repository";
import { staffMemberRepository } from "@/lib/repositories/staff-member-repository";
import { salaryStructureRepository } from "@/lib/repositories/salary-structure-repository";

// -------------------------------------------------------------------------
// Result codes
// -------------------------------------------------------------------------

export type StaffContractActionCode =
  | "unauthenticated"
  | "no_active_club"
  | "forbidden"
  | "created"
  | "updated"
  | "finalized"
  | "contract_not_found"
  | "staff_member_required"
  | "structure_required"
  | "start_date_required"
  | "end_date_before_start"
  | "start_date_too_old"
  | "initial_amount_required"
  | "initial_amount_invalid"
  | "structure_already_taken"
  | "salary_structure_not_active"
  | "invalid_end_date"
  | "invalid_start_date"
  | "end_date_too_far"
  | "already_finalized"
  | "invalid_status"
  | "unknown_error";

export type StaffContractActionResult<T = void> =
  | { ok: true; code: StaffContractActionCode; data?: T }
  | { ok: false; code: StaffContractActionCode };

function ok<T>(code: StaffContractActionCode, data?: T): StaffContractActionResult<T> {
  return { ok: true, code, data };
}
function err<T = void>(code: StaffContractActionCode): StaffContractActionResult<T> {
  return { ok: false, code };
}

// -------------------------------------------------------------------------
// Auth guards
// -------------------------------------------------------------------------

type GuardedContext = { userId: string; clubId: string; membership: Membership };
async function guardRead():
  Promise<{ ok: true; context: GuardedContext } | { ok: false; code: StaffContractActionCode }> {
  const session = await getAuthenticatedSessionContext();
  if (!session) return { ok: false, code: "unauthenticated" };
  if (!session.activeClub || !session.activeMembership) {
    return { ok: false, code: "no_active_club" };
  }
  if (!canAccessHrMasters(session.activeMembership)) return { ok: false, code: "forbidden" };
  return {
    ok: true,
    context: {
      userId: session.user.id,
      clubId: session.activeClub.id,
      membership: session.activeMembership,
    },
  };
}

async function guardMutate():
  Promise<{ ok: true; context: GuardedContext } | { ok: false; code: StaffContractActionCode }> {
  const session = await getAuthenticatedSessionContext();
  if (!session) return { ok: false, code: "unauthenticated" };
  if (!session.activeClub || !session.activeMembership) {
    return { ok: false, code: "no_active_club" };
  }
  if (!canMutateHrMasters(session.activeMembership)) return { ok: false, code: "forbidden" };
  return {
    ok: true,
    context: {
      userId: session.user.id,
      clubId: session.activeClub.id,
      membership: session.activeMembership,
    },
  };
}

// -------------------------------------------------------------------------
// Normalizers
// -------------------------------------------------------------------------

function normalizeId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed || null;
}
function normalizeIsoDate(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const parsed = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return trimmed;
}
function normalizeAmount(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string") return parseLocalizedAmount(raw);
  return null;
}
function normalizeBool(raw: unknown, fallback: boolean): boolean {
  if (typeof raw === "boolean") return raw;
  if (typeof raw === "string") {
    const v = raw.trim().toLowerCase();
    if (["true", "1", "on", "yes", "si"].includes(v)) return true;
    if (["false", "0", "off", "no"].includes(v)) return false;
  }
  return fallback;
}
function normalizeText(raw: unknown, maxLength: number): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

// -------------------------------------------------------------------------
// Public queries
// -------------------------------------------------------------------------

export type ListStaffContractsResult =
  | { ok: true; contracts: StaffContract[] }
  | { ok: false; code: StaffContractActionCode };

export async function listStaffContractsForActiveClub(
  filters: ListStaffContractsFilters = {},
): Promise<ListStaffContractsResult> {
  const guard = await guardRead();
  if (!guard.ok) return { ok: false, code: guard.code };
  try {
    const contracts = await staffContractRepository.listForClub(guard.context.clubId, filters);
    return { ok: true, contracts };
  } catch (error) {
    if (isStaffContractRepositoryInfraError(error)) {
      console.error("[staff-contract-service.list]", error);
    }
    return { ok: false, code: "unknown_error" };
  }
}

// -------------------------------------------------------------------------
// Create (US-57)
// -------------------------------------------------------------------------

export type CreateStaffContractRawInput = {
  staffMemberId?: unknown;
  salaryStructureId?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  initialAmount?: unknown;
  initialRevisionReason?: unknown;
};

export async function createStaffContract(
  raw: CreateStaffContractRawInput,
): Promise<StaffContractActionResult<{ contract: StaffContract }>> {
  const guard = await guardMutate();
  if (!guard.ok) return err<{ contract: StaffContract }>(guard.code);
  const ctx = guard.context;

  const staffMemberId = normalizeId(raw.staffMemberId);
  const salaryStructureId = normalizeId(raw.salaryStructureId);
  const startDate = normalizeIsoDate(raw.startDate);
  const endDate =
    raw.endDate === null || raw.endDate === undefined || raw.endDate === ""
      ? null
      : normalizeIsoDate(raw.endDate);
  const initialAmount = normalizeAmount(raw.initialAmount);
  const initialReasonRaw =
    typeof raw.initialRevisionReason === "string" ? raw.initialRevisionReason : null;
  const initialRevisionReason = initialReasonRaw ? normalizeText(initialReasonRaw, 500) : null;

  if (!staffMemberId) return err<{ contract: StaffContract }>("staff_member_required");
  if (!salaryStructureId) return err<{ contract: StaffContract }>("structure_required");
  if (!startDate) return err<{ contract: StaffContract }>("start_date_required");
  if (raw.endDate && !endDate) return err<{ contract: StaffContract }>("invalid_end_date");
  if (endDate && endDate < startDate) {
    return err<{ contract: StaffContract }>("end_date_before_start");
  }
  if (isStartDateTooOld(startDate)) {
    return err<{ contract: StaffContract }>("start_date_too_old");
  }
  if (initialAmount === null) return err<{ contract: StaffContract }>("initial_amount_required");
  if (initialAmount <= 0) return err<{ contract: StaffContract }>("initial_amount_invalid");

  try {
    const result = await staffContractRepository.create({
      clubId: ctx.clubId,
      staffMemberId,
      salaryStructureId,
      startDate,
      endDate,
      initialAmount,
      initialRevisionReason,
      createdByUserId: ctx.userId,
    });

    if (!result.ok || !result.contract) {
      // Map códigos de la RPC a los del service.
      switch (result.code) {
        case "staff_member_required":
          return err<{ contract: StaffContract }>("staff_member_required");
        case "structure_required":
          return err<{ contract: StaffContract }>("structure_required");
        case "salary_structure_not_active":
          return err<{ contract: StaffContract }>("salary_structure_not_active");
        case "structure_already_taken":
          return err<{ contract: StaffContract }>("structure_already_taken");
        case "invalid_start_date":
          return err<{ contract: StaffContract }>("invalid_start_date");
        case "invalid_end_date":
          return err<{ contract: StaffContract }>("invalid_end_date");
        case "initial_amount_invalid":
          return err<{ contract: StaffContract }>("initial_amount_invalid");
        case "forbidden":
          return err<{ contract: StaffContract }>("forbidden");
        default:
          return err<{ contract: StaffContract }>("unknown_error");
      }
    }

    return ok<{ contract: StaffContract }>("created", { contract: result.contract });
  } catch (error) {
    if (isStaffContractRepositoryInfraError(error)) {
      console.error("[staff-contract-service.create]", error);
    }
    return err<{ contract: StaffContract }>("unknown_error");
  }
}

// -------------------------------------------------------------------------
// Update (US-58)
// -------------------------------------------------------------------------

export type UpdateStaffContractRawInput = {
  endDate?: unknown;
};

export async function updateStaffContract(
  contractId: string,
  raw: UpdateStaffContractRawInput,
): Promise<StaffContractActionResult<{ contract: StaffContract }>> {
  const guard = await guardMutate();
  if (!guard.ok) return err<{ contract: StaffContract }>(guard.code);
  const ctx = guard.context;

  try {
    const existing = await staffContractRepository.getById(ctx.clubId, contractId);
    if (!existing) return err<{ contract: StaffContract }>("contract_not_found");
    if (existing.status !== "vigente") {
      return err<{ contract: StaffContract }>("already_finalized");
    }

    const endDateRaw = raw.endDate;
    const endDate =
      endDateRaw === null || endDateRaw === undefined || endDateRaw === ""
        ? null
        : normalizeIsoDate(endDateRaw);
    if (endDateRaw && !endDate) return err<{ contract: StaffContract }>("invalid_end_date");
    if (endDate && endDate < existing.startDate) {
      return err<{ contract: StaffContract }>("end_date_before_start");
    }

    const updated = await staffContractRepository.update({
      contractId,
      clubId: ctx.clubId,
      updatedByUserId: ctx.userId,
      patch: {
        endDate: endDateRaw === undefined ? undefined : endDate,
      },
    });
    if (!updated) return err<{ contract: StaffContract }>("contract_not_found");

    await staffContractRepository.recordActivity({
      clubId: ctx.clubId,
      entityId: updated.id,
      action: "CONTRACT_UPDATED",
      actorUserId: ctx.userId,
      payloadBefore: { end_date: existing.endDate },
      payloadAfter: { end_date: updated.endDate },
    });

    return ok<{ contract: StaffContract }>("updated", { contract: updated });
  } catch (error) {
    if (isStaffContractRepositoryInfraError(error)) {
      console.error("[staff-contract-service.update]", error);
    }
    return err<{ contract: StaffContract }>("unknown_error");
  }
}

// -------------------------------------------------------------------------
// Finalize (US-58)
// -------------------------------------------------------------------------

export type FinalizeStaffContractRawInput = {
  endDate?: unknown;
  reason?: unknown;
};

export async function finalizeStaffContract(
  contractId: string,
  raw: FinalizeStaffContractRawInput,
): Promise<StaffContractActionResult> {
  const guard = await guardMutate();
  if (!guard.ok) return err(guard.code);
  const ctx = guard.context;

  const endDate =
    normalizeIsoDate(raw.endDate) ?? new Date().toISOString().slice(0, 10);
  const reason = normalizeText(raw.reason, 500);

  try {
    const existing = await staffContractRepository.getById(ctx.clubId, contractId);
    if (!existing) return err("contract_not_found");
    if (existing.status !== "vigente") return err("already_finalized");
    if (endDate < existing.startDate) return err("invalid_end_date");

    const result = await staffContractRepository.finalize({
      clubId: ctx.clubId,
      contractId,
      endDate,
      reason,
      actorUserId: ctx.userId,
    });

    if (!result.ok) {
      switch (result.code) {
        case "contract_not_found":
          return err("contract_not_found");
        case "already_finalized":
          return err("already_finalized");
        case "invalid_end_date":
          return err("invalid_end_date");
        case "end_date_too_far":
          return err("end_date_too_far");
        case "forbidden":
          return err("forbidden");
        default:
          return err("unknown_error");
      }
    }

    return ok("finalized");
  } catch (error) {
    if (isStaffContractRepositoryInfraError(error)) {
      console.error("[staff-contract-service.finalize]", error);
    }
    return err("unknown_error");
  }
}

// Re-export for action consumers
export { CONTRACT_MAX_BACKDATE_DAYS };
