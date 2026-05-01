/**
 * Service layer for Payroll Settlements (US-61 / US-62 / US-63 / US-66).
 *
 * Orchestrates authorization, validations and delegates to the
 * transactional RPCs for the multi-row workflows (generate, confirm bulk,
 * annul). Adjustments go through the repository directly and the DB
 * trigger keeps totals in sync.
 */

import { parseLocalizedAmount } from "@/lib/amounts";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import type { Membership } from "@/lib/domain/access";
import { canOperateHrSettlements, canReturnPayrollSettlement } from "@/lib/domain/authorization";
import {
  isPayrollAdjustmentType,
  type PayrollAdjustmentType,
  type PayrollSettlement,
  type PayrollSettlementAdjustment,
  type PayrollSettlementStatus,
} from "@/lib/domain/payroll-settlement";
import {
  isPayrollSettlementRepositoryInfraError,
  payrollSettlementRepository,
  type ListSettlementsFilters,
} from "@/lib/repositories/payroll-settlement-repository";
import { logger } from "@/lib/logger";

// -------------------------------------------------------------------------
// Result codes
// -------------------------------------------------------------------------

export type PayrollSettlementActionCode =
  | "unauthenticated"
  | "no_active_club"
  | "forbidden"
  | "generated"
  | "approved"
  | "approved_bulk"
  | "returned_to_generated"
  | "annulled"
  | "adjustment_added"
  | "adjustment_updated"
  | "adjustment_removed"
  | "hours_loaded"
  | "base_amount_updated"
  | "notes_updated"
  | "settlement_not_found"
  | "adjustment_not_found"
  | "invalid_period"
  | "no_active_contracts"
  | "invalid_type"
  | "concept_required"
  | "amount_required"
  | "amount_must_be_positive"
  | "hours_required"
  | "classes_required"
  | "edit_blocked_approved"
  | "edit_blocked_paid"
  | "edit_blocked_annulled"
  | "total_negative"
  | "zero_amount_requires_approval"
  | "invalid_status"
  | "already_approved"
  | "reason_required"
  | "already_annulled"
  | "movement_still_active"
  | "partial"
  | "unknown_error";

export type PayrollSettlementActionResult<T = void> =
  | { ok: true; code: PayrollSettlementActionCode; data?: T }
  | { ok: false; code: PayrollSettlementActionCode };

function ok<T>(code: PayrollSettlementActionCode, data?: T): PayrollSettlementActionResult<T> {
  return { ok: true, code, data };
}
function err<T = void>(code: PayrollSettlementActionCode): PayrollSettlementActionResult<T> {
  return { ok: false, code };
}

// -------------------------------------------------------------------------
// Auth guards
// -------------------------------------------------------------------------

type GuardedContext = { userId: string; clubId: string; membership: Membership };

async function guard():
  Promise<{ ok: true; context: GuardedContext } | { ok: false; code: PayrollSettlementActionCode }> {
  const session = await getAuthenticatedSessionContext();
  if (!session) return { ok: false, code: "unauthenticated" };
  if (!session.activeClub || !session.activeMembership) {
    return { ok: false, code: "no_active_club" };
  }
  if (!canOperateHrSettlements(session.activeMembership)) {
    return { ok: false, code: "forbidden" };
  }
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

function normalizeAmount(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string") return parseLocalizedAmount(raw);
  return null;
}
function normalizeText(raw: unknown, maxLength: number): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}
function normalizeInt(raw: unknown): number | null {
  if (typeof raw === "number" && Number.isInteger(raw)) return raw;
  if (typeof raw === "string") {
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : null;
  }
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

// -------------------------------------------------------------------------
// Public queries
// -------------------------------------------------------------------------

export type ListSettlementsResult =
  | { ok: true; settlements: PayrollSettlement[] }
  | { ok: false; code: PayrollSettlementActionCode };

export async function listSettlementsForActiveClub(
  filters: ListSettlementsFilters = {},
): Promise<ListSettlementsResult> {
  const g = await guard();
  if (!g.ok) return { ok: false, code: g.code };
  try {
    const settlements = await payrollSettlementRepository.listForClub(
      g.context.clubId,
      filters,
    );
    return { ok: true, settlements };
  } catch (error) {
    if (isPayrollSettlementRepositoryInfraError(error)) {
      logger.error("[payroll-settlement-service.list]", error);
    }
    return { ok: false, code: "unknown_error" };
  }
}

export async function listSettlementsForContract(
  contractId: string,
  limit?: number,
): Promise<ListSettlementsResult> {
  const g = await guard();
  if (!g.ok) return { ok: false, code: g.code };
  try {
    const settlements = await payrollSettlementRepository.listForContract(
      g.context.clubId,
      contractId,
      limit,
    );
    return { ok: true, settlements };
  } catch (error) {
    if (isPayrollSettlementRepositoryInfraError(error)) {
      logger.error("[payroll-settlement-service.listForContract]", error);
    }
    return { ok: false, code: "unknown_error" };
  }
}

export type SettlementDetail = {
  settlement: PayrollSettlement;
  adjustments: PayrollSettlementAdjustment[];
};

export async function getSettlementDetail(
  settlementId: string,
): Promise<PayrollSettlementActionResult<SettlementDetail>> {
  const g = await guard();
  if (!g.ok) return err<SettlementDetail>(g.code);
  try {
    const settlement = await payrollSettlementRepository.getById(
      g.context.clubId,
      settlementId,
    );
    if (!settlement) return err<SettlementDetail>("settlement_not_found");
    const adjustments = await payrollSettlementRepository.listAdjustments(
      g.context.clubId,
      settlementId,
    );
    return ok<SettlementDetail>("generated", { settlement, adjustments });
  } catch (error) {
    if (isPayrollSettlementRepositoryInfraError(error)) {
      logger.error("[payroll-settlement-service.detail]", error);
    }
    return err<SettlementDetail>("unknown_error");
  }
}

/**
 * Convenience for the UI: fetches settlements + all adjustments grouped by
 * settlement id so a single RTT feeds the whole list + detail modals.
 */
export async function listSettlementsWithAdjustments(
  filters: ListSettlementsFilters = {},
): Promise<
  | {
      ok: true;
      settlements: PayrollSettlement[];
      adjustmentsBySettlementId: Record<string, PayrollSettlementAdjustment[]>;
    }
  | { ok: false; code: PayrollSettlementActionCode }
> {
  const g = await guard();
  if (!g.ok) return { ok: false, code: g.code };
  try {
    const settlements = await payrollSettlementRepository.listForClub(
      g.context.clubId,
      filters,
    );
    const idsToFetch = settlements
      .filter((s) => s.status !== "anulada")
      .map((s) => s.id);
    const fetchedAdjustments = await payrollSettlementRepository.listAdjustmentsBySettlementIds(
      g.context.clubId,
      idsToFetch,
    );
    const adjustmentsBySettlementId: Record<string, PayrollSettlementAdjustment[]> = {};
    for (const s of settlements) {
      adjustmentsBySettlementId[s.id] = s.status === "anulada"
        ? []
        : fetchedAdjustments.get(s.id) ?? [];
    }
    return { ok: true, settlements, adjustmentsBySettlementId };
  } catch (error) {
    if (isPayrollSettlementRepositoryInfraError(error)) {
      logger.error("[payroll-settlement-service.list-with-adjustments]", error);
    }
    return { ok: false, code: "unknown_error" };
  }
}

// -------------------------------------------------------------------------
// Generation (US-61)
// -------------------------------------------------------------------------

export type GenerateMonthlyRawInput = { year?: unknown; month?: unknown };

export async function generateMonthlySettlements(
  raw: GenerateMonthlyRawInput,
): Promise<
  PayrollSettlementActionResult<{
    generatedCount: number;
    skippedCount: number;
    errorCount: number;
  }>
> {
  const g = await guard();
  if (!g.ok) return err(g.code);
  const ctx = g.context;

  const year = normalizeInt(raw.year);
  const month = normalizeInt(raw.month);
  if (!year || !month || month < 1 || month > 12) {
    return err<{
      generatedCount: number;
      skippedCount: number;
      errorCount: number;
    }>("invalid_period");
  }

  try {
    const res = await payrollSettlementRepository.callGenerateMonthly({
      clubId: ctx.clubId,
      year,
      month,
    });
    if (!res.ok) {
      switch (res.code) {
        case "no_active_contracts":
          return err<{
            generatedCount: number;
            skippedCount: number;
            errorCount: number;
          }>("no_active_contracts");
        case "forbidden":
          return err<{
            generatedCount: number;
            skippedCount: number;
            errorCount: number;
          }>("forbidden");
        default:
          return err<{
            generatedCount: number;
            skippedCount: number;
            errorCount: number;
          }>("unknown_error");
      }
    }
    return ok<{
      generatedCount: number;
      skippedCount: number;
      errorCount: number;
    }>("generated", {
      generatedCount: res.generatedCount,
      skippedCount: res.skippedCount,
      errorCount: res.errorCount,
    });
  } catch (error) {
    if (isPayrollSettlementRepositoryInfraError(error)) {
      logger.error("[payroll-settlement-service.generate]", error);
    }
    return err("unknown_error");
  }
}

// -------------------------------------------------------------------------
// Adjustments (US-62)
// -------------------------------------------------------------------------

export type AddAdjustmentRawInput = {
  settlementId?: unknown;
  type?: unknown;
  concept?: unknown;
  amount?: unknown;
};

async function requireEditableSettlement(
  clubId: string,
  settlementId: string,
): Promise<PayrollSettlement | PayrollSettlementActionCode> {
  const settlement = await payrollSettlementRepository.getById(clubId, settlementId);
  if (!settlement) return "settlement_not_found";
  if (settlement.status === "aprobada_rrhh") return "edit_blocked_approved";
  if (settlement.status === "pagada") return "edit_blocked_paid";
  if (settlement.status === "anulada") return "edit_blocked_annulled";
  return settlement;
}

export async function addAdjustment(
  raw: AddAdjustmentRawInput,
): Promise<PayrollSettlementActionResult<{ adjustment: PayrollSettlementAdjustment }>> {
  const g = await guard();
  if (!g.ok) return err<{ adjustment: PayrollSettlementAdjustment }>(g.code);
  const ctx = g.context;

  const settlementId = typeof raw.settlementId === "string" ? raw.settlementId.trim() : "";
  const typeRaw = typeof raw.type === "string" ? raw.type.trim() : "";
  const concept = normalizeText(raw.concept, 200);
  const amount = normalizeAmount(raw.amount);

  if (!settlementId) {
    return err<{ adjustment: PayrollSettlementAdjustment }>("settlement_not_found");
  }
  if (!isPayrollAdjustmentType(typeRaw)) {
    return err<{ adjustment: PayrollSettlementAdjustment }>("invalid_type");
  }
  if (!concept) return err<{ adjustment: PayrollSettlementAdjustment }>("concept_required");
  if (amount === null) return err<{ adjustment: PayrollSettlementAdjustment }>("amount_required");
  if (amount <= 0) {
    return err<{ adjustment: PayrollSettlementAdjustment }>("amount_must_be_positive");
  }
  const type: PayrollAdjustmentType = typeRaw;

  try {
    const settlementOrCode = await requireEditableSettlement(ctx.clubId, settlementId);
    if (typeof settlementOrCode === "string") {
      return err<{ adjustment: PayrollSettlementAdjustment }>(settlementOrCode);
    }

    const adjustment = await payrollSettlementRepository.addAdjustment({
      clubId: ctx.clubId,
      settlementId,
      type,
      concept,
      amount,
      createdByUserId: ctx.userId,
    });

    await payrollSettlementRepository.recordActivity({
      clubId: ctx.clubId,
      entityId: settlementId,
      action: "SETTLEMENT_ADJUSTMENT_ADDED",
      actorUserId: ctx.userId,
      payloadAfter: { adjustment_id: adjustment.id, type, concept, amount },
    });

    return ok<{ adjustment: PayrollSettlementAdjustment }>("adjustment_added", { adjustment });
  } catch (error) {
    if (isPayrollSettlementRepositoryInfraError(error)) {
      logger.error("[payroll-settlement-service.add-adjustment]", error);
    }
    return err<{ adjustment: PayrollSettlementAdjustment }>("unknown_error");
  }
}

export async function deleteAdjustment(params: {
  settlementId: string;
  adjustmentId: string;
}): Promise<PayrollSettlementActionResult> {
  const g = await guard();
  if (!g.ok) return err(g.code);
  const ctx = g.context;

  try {
    const settlementOrCode = await requireEditableSettlement(ctx.clubId, params.settlementId);
    if (typeof settlementOrCode === "string") return err(settlementOrCode);

    await payrollSettlementRepository.deleteAdjustment({
      clubId: ctx.clubId,
      settlementId: params.settlementId,
      adjustmentId: params.adjustmentId,
    });
    await payrollSettlementRepository.recordActivity({
      clubId: ctx.clubId,
      entityId: params.settlementId,
      action: "SETTLEMENT_ADJUSTMENT_REMOVED",
      actorUserId: ctx.userId,
      payloadBefore: { adjustment_id: params.adjustmentId },
    });
    return ok("adjustment_removed");
  } catch (error) {
    if (isPayrollSettlementRepositoryInfraError(error)) {
      logger.error("[payroll-settlement-service.delete-adjustment]", error);
    }
    return err("unknown_error");
  }
}

export async function updateHoursOrNotes(params: {
  settlementId: string;
  hoursWorked?: unknown;
  classesWorked?: unknown;
  notes?: unknown;
}): Promise<PayrollSettlementActionResult<{ settlement: PayrollSettlement }>> {
  const g = await guard();
  if (!g.ok) return err<{ settlement: PayrollSettlement }>(g.code);
  const ctx = g.context;

  try {
    const settlementOrCode = await requireEditableSettlement(ctx.clubId, params.settlementId);
    if (typeof settlementOrCode === "string") {
      return err<{ settlement: PayrollSettlement }>(settlementOrCode);
    }

    const patch: {
      hoursWorked?: number;
      classesWorked?: number;
      notes?: string | null;
      baseAmount?: number;
      requiresHoursInput?: boolean;
    } = {};

    let nextHours = settlementOrCode.hoursWorked;
    let nextClasses = settlementOrCode.classesWorked;

    if (params.hoursWorked !== undefined) {
      const hours = normalizeAmount(params.hoursWorked);
      if (hours === null || hours < 0) {
        return err<{ settlement: PayrollSettlement }>("hours_required");
      }
      patch.hoursWorked = hours;
      nextHours = hours;
    }
    if (params.classesWorked !== undefined) {
      const classes = normalizeInt(params.classesWorked);
      if (classes === null || classes < 0) {
        return err<{ settlement: PayrollSettlement }>("classes_required");
      }
      patch.classesWorked = classes;
      nextClasses = classes;
    }

    if (params.notes !== undefined) {
      const normalized = normalizeText(params.notes, 500);
      patch.notes = normalized;
    }

    // Auto-recompute base_amount for per-hour / per-class contracts when
    // hours or classes change. We read the structure's current amount via
    // the repo helper to avoid duplicating the resolution logic.
    if (patch.hoursWorked !== undefined || patch.classesWorked !== undefined) {
      if (
        settlementOrCode.remunerationType === "por_hora" ||
        settlementOrCode.remunerationType === "por_clase"
      ) {
        // Read rate from the underlying contract.
        const { staffContractRepository } = await import(
          "@/lib/repositories/staff-contract-repository"
        );
        const contract = await staffContractRepository.getById(
          ctx.clubId,
          settlementOrCode.contractId,
        );
        const rate = contract?.currentAmount ?? 0;
        const multiplier =
          settlementOrCode.remunerationType === "por_hora" ? nextHours : nextClasses;
        patch.baseAmount = Number(multiplier) * Number(rate);
        patch.requiresHoursInput = Number(multiplier) <= 0;
      }
    }

    const updated = await payrollSettlementRepository.updateFields({
      clubId: ctx.clubId,
      settlementId: params.settlementId,
      updatedByUserId: ctx.userId,
      patch,
    });
    if (!updated) return err<{ settlement: PayrollSettlement }>("settlement_not_found");

    if (updated.totalAmount < 0) {
      return err<{ settlement: PayrollSettlement }>("total_negative");
    }

    await payrollSettlementRepository.recordActivity({
      clubId: ctx.clubId,
      entityId: params.settlementId,
      action:
        patch.hoursWorked !== undefined || patch.classesWorked !== undefined
          ? "SETTLEMENT_HOURS_LOADED"
          : "SETTLEMENT_NOTES_UPDATED",
      actorUserId: ctx.userId,
      payloadBefore: {
        hours_worked: settlementOrCode.hoursWorked,
        classes_worked: settlementOrCode.classesWorked,
        base_amount: settlementOrCode.baseAmount,
        notes: settlementOrCode.notes,
      },
      payloadAfter: {
        hours_worked: updated.hoursWorked,
        classes_worked: updated.classesWorked,
        base_amount: updated.baseAmount,
        notes: updated.notes,
      },
    });

    return ok<{ settlement: PayrollSettlement }>(
      patch.hoursWorked !== undefined || patch.classesWorked !== undefined
        ? "hours_loaded"
        : "notes_updated",
      { settlement: updated },
    );
  } catch (error) {
    if (isPayrollSettlementRepositoryInfraError(error)) {
      logger.error("[payroll-settlement-service.update-hours-or-notes]", error);
    }
    return err<{ settlement: PayrollSettlement }>("unknown_error");
  }
}

// -------------------------------------------------------------------------
// Approval (US-40, ex US-63)
// -------------------------------------------------------------------------

export type ApproveRawInput = { settlementId?: unknown; approveZero?: unknown };

export async function approveSettlement(
  raw: ApproveRawInput,
): Promise<PayrollSettlementActionResult> {
  const g = await guard();
  if (!g.ok) return err(g.code);
  const ctx = g.context;

  const settlementId = typeof raw.settlementId === "string" ? raw.settlementId.trim() : "";
  if (!settlementId) return err("settlement_not_found");
  const approveZero = normalizeBool(raw.approveZero, false);

  try {
    const res = await payrollSettlementRepository.callApprove({
      clubId: ctx.clubId,
      settlementId,
      approveZero,
    });
    if (!res.ok) {
      switch (res.code) {
        case "settlement_not_found":
          return err("settlement_not_found");
        case "invalid_status":
          return err("invalid_status");
        case "already_approved":
          return err("already_approved");
        case "hours_required":
          return err("hours_required");
        case "zero_amount_requires_approval":
          return err("zero_amount_requires_approval");
        case "total_negative":
          return err("total_negative");
        case "forbidden":
          return err("forbidden");
        default:
          return err("unknown_error");
      }
    }
    return ok("approved");
  } catch (error) {
    if (isPayrollSettlementRepositoryInfraError(error)) {
      logger.error("[payroll-settlement-service.approve]", error);
    }
    return err("unknown_error");
  }
}

export async function approveSettlementsBulk(params: {
  ids: string[];
  approveZero?: boolean;
}): Promise<
  PayrollSettlementActionResult<{
    approvedCount: number;
    skippedCount: number;
    errors: Array<{ id: string; code: string }>;
  }>
> {
  const g = await guard();
  if (!g.ok) return err(g.code);
  const ctx = g.context;

  if (!Array.isArray(params.ids) || params.ids.length === 0) {
    return err("settlement_not_found");
  }

  try {
    const res = await payrollSettlementRepository.callApproveBulk({
      clubId: ctx.clubId,
      ids: params.ids,
      approveZero: Boolean(params.approveZero),
    });
    if (!res.ok) {
      if (res.code === "forbidden") return err("forbidden");
      return err("unknown_error");
    }
    const data = {
      approvedCount: res.approvedCount,
      skippedCount: res.skippedCount,
      errors: res.errors,
    };
    return ok(res.errors.length > 0 ? "partial" : "approved_bulk", data);
  } catch (error) {
    if (isPayrollSettlementRepositoryInfraError(error)) {
      logger.error("[payroll-settlement-service.approve-bulk]", error);
    }
    return err("unknown_error");
  }
}

// -------------------------------------------------------------------------
// Return to "generada" (US-70, Notion alias US-41) — RRHH o Tesoreria
// -------------------------------------------------------------------------

export type ReturnToGeneratedRawInput = { settlementId?: unknown; reason?: unknown };

export async function returnSettlementToGenerated(
  raw: ReturnToGeneratedRawInput,
): Promise<PayrollSettlementActionResult> {
  const session = await getAuthenticatedSessionContext();
  if (!session) return err("unauthenticated");
  if (!session.activeClub || !session.activeMembership) return err("no_active_club");
  if (!canReturnPayrollSettlement(session.activeMembership)) return err("forbidden");
  const clubId = session.activeClub.id;

  const settlementId = typeof raw.settlementId === "string" ? raw.settlementId.trim() : "";
  if (!settlementId) return err("settlement_not_found");
  const reason = typeof raw.reason === "string" ? raw.reason.trim() : "";
  if (!reason) return err("reason_required");

  try {
    const res = await payrollSettlementRepository.callReturnToGenerated({
      clubId,
      settlementId,
      reason,
    });
    if (!res.ok) {
      switch (res.code) {
        case "settlement_not_found":
          return err("settlement_not_found");
        case "invalid_status":
          return err("invalid_status");
        case "reason_required":
          return err("reason_required");
        case "forbidden":
          return err("forbidden");
        default:
          return err("unknown_error");
      }
    }
    return ok("returned_to_generated");
  } catch (error) {
    if (isPayrollSettlementRepositoryInfraError(error)) {
      logger.error("[payroll-settlement-service.return-to-generated]", error);
    }
    return err("unknown_error");
  }
}

// -------------------------------------------------------------------------
// Annulment (US-66)
// -------------------------------------------------------------------------

export type AnnulRawInput = { settlementId?: unknown; reason?: unknown };

export async function annulSettlement(
  raw: AnnulRawInput,
): Promise<PayrollSettlementActionResult> {
  const g = await guard();
  if (!g.ok) return err(g.code);
  const ctx = g.context;

  const settlementId = typeof raw.settlementId === "string" ? raw.settlementId.trim() : "";
  if (!settlementId) return err("settlement_not_found");
  const reason = normalizeText(raw.reason, 500);

  try {
    const res = await payrollSettlementRepository.callAnnul({
      clubId: ctx.clubId,
      settlementId,
      reason,
    });
    if (!res.ok) {
      switch (res.code) {
        case "settlement_not_found":
          return err("settlement_not_found");
        case "invalid_status":
          return err("invalid_status");
        case "already_annulled":
          return err("already_annulled");
        case "movement_still_active":
          return err("movement_still_active");
        case "forbidden":
          return err("forbidden");
        default:
          return err("unknown_error");
      }
    }
    return ok("annulled");
  } catch (error) {
    if (isPayrollSettlementRepositoryInfraError(error)) {
      logger.error("[payroll-settlement-service.annul]", error);
    }
    return err("unknown_error");
  }
}

// Re-exports used by the actions layer.
export type { PayrollSettlement, PayrollSettlementStatus };
