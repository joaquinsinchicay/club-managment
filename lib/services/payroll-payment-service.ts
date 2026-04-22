/**
 * Service layer for Payroll Payments (US-64 / US-65).
 *
 * Orchestrates authorization, display_id generation (reusing the
 * treasury naming convention `{CLUB}-MOV-{YYYY}-{seq}`) and delegates the
 * atomic writes to the SECURITY DEFINER RPCs `hr_pay_settlement` and
 * `hr_pay_settlements_batch`. Payments create a `treasury_movements` row
 * linked to the settlement via `payroll_settlement_id`.
 */

import { MissingSupabaseAdminConfigError, createRequiredAdminSupabaseClient } from "@/lib/supabase/admin";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import type { Membership } from "@/lib/domain/access";
import { canOperateHrPayments } from "@/lib/domain/authorization";
import { accessRepository } from "@/lib/repositories/access-repository";

// -------------------------------------------------------------------------
// Result codes
// -------------------------------------------------------------------------

export type PayrollPaymentActionCode =
  | "unauthenticated"
  | "no_active_club"
  | "forbidden"
  | "paid"
  | "paid_batch"
  | "settlement_not_found"
  | "account_required"
  | "account_not_available"
  | "currency_mismatch"
  | "payment_date_required"
  | "invalid_payment_date"
  | "invalid_status"
  | "already_paid"
  | "invalid_total_amount"
  | "sueldos_category_not_found"
  | "club_not_found"
  | "display_ids_mismatch"
  | "partial_failure"
  | "rpc_failed"
  | "unknown_error";

export type PayrollPaymentActionResult<T = void> =
  | { ok: true; code: PayrollPaymentActionCode; data?: T }
  | {
      ok: false;
      code: PayrollPaymentActionCode;
      failedSettlementId?: string | null;
    };

function ok<T>(code: PayrollPaymentActionCode, data?: T): PayrollPaymentActionResult<T> {
  return { ok: true, code, data };
}
function err<T = void>(
  code: PayrollPaymentActionCode,
  failedSettlementId?: string | null,
): PayrollPaymentActionResult<T> {
  return { ok: false, code, failedSettlementId };
}

// -------------------------------------------------------------------------
// Auth guard
// -------------------------------------------------------------------------

type GuardedContext = {
  userId: string;
  clubId: string;
  clubName: string;
  membership: Membership;
};

async function guard():
  Promise<{ ok: true; context: GuardedContext } | { ok: false; code: PayrollPaymentActionCode }> {
  const session = await getAuthenticatedSessionContext();
  if (!session) return { ok: false, code: "unauthenticated" };
  if (!session.activeClub || !session.activeMembership) {
    return { ok: false, code: "no_active_club" };
  }
  if (!canOperateHrPayments(session.activeMembership)) {
    return { ok: false, code: "forbidden" };
  }
  return {
    ok: true,
    context: {
      userId: session.user.id,
      clubId: session.activeClub.id,
      clubName: session.activeClub.name,
      membership: session.activeMembership,
    },
  };
}

// -------------------------------------------------------------------------
// Display id generation
// -------------------------------------------------------------------------

function buildClubInitials(clubName: string): string {
  const initials = clubName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
  return initials.slice(0, 3) || "CLB";
}

function yearFromDate(dateIso: string): string {
  return dateIso.slice(0, 4);
}

async function generateDisplayIds(
  clubId: string,
  clubName: string,
  paymentDate: string,
  quantity: number,
): Promise<string[]> {
  const prefix = buildClubInitials(clubName);
  const year = yearFromDate(paymentDate);
  const baseSequence = await accessRepository.countTreasuryMovementsByClubAndYear(clubId, year);
  return Array.from(
    { length: quantity },
    (_, i) => `${prefix}-MOV-${year}-${baseSequence + i + 1}`,
  );
}

// -------------------------------------------------------------------------
// Normalizers
// -------------------------------------------------------------------------

function normalizeIsoDate(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const parsed = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return trimmed;
}
function normalizeText(raw: unknown, maxLength: number): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

// -------------------------------------------------------------------------
// Helpers to call the RPCs
// -------------------------------------------------------------------------

function requireAdmin() {
  try {
    return createRequiredAdminSupabaseClient();
  } catch (error) {
    if (error instanceof MissingSupabaseAdminConfigError) {
      throw error;
    }
    throw error;
  }
}

// -------------------------------------------------------------------------
// Public API — single pay (US-64)
// -------------------------------------------------------------------------

export type PaySettlementRawInput = {
  settlementId?: unknown;
  accountId?: unknown;
  paymentDate?: unknown;
  receiptNumber?: unknown;
  notes?: unknown;
};

export async function payStaffSettlement(
  raw: PaySettlementRawInput,
): Promise<PayrollPaymentActionResult<{ movementId: string; settlementId: string }>> {
  const g = await guard();
  if (!g.ok) return err<{ movementId: string; settlementId: string }>(g.code);
  const ctx = g.context;

  const settlementId = typeof raw.settlementId === "string" ? raw.settlementId.trim() : "";
  const accountId = typeof raw.accountId === "string" ? raw.accountId.trim() : "";
  const paymentDate = normalizeIsoDate(raw.paymentDate);
  const receiptNumber = normalizeText(raw.receiptNumber, 120);
  const notes = normalizeText(raw.notes, 500);

  if (!settlementId) return err<{ movementId: string; settlementId: string }>("settlement_not_found");
  if (!accountId) return err<{ movementId: string; settlementId: string }>("account_required");
  if (!paymentDate) return err<{ movementId: string; settlementId: string }>("payment_date_required");

  try {
    const [displayId] = await generateDisplayIds(ctx.clubId, ctx.clubName, paymentDate, 1);

    const supabase = requireAdmin();
    const { error: setErr } = await supabase.rpc("set_current_club", {
      p_club_id: ctx.clubId,
    });
    if (setErr && setErr.code !== "42883") {
      console.warn("[payroll-payment-service] set_current_club failed", setErr);
    }

    const { data, error } = await supabase.rpc("hr_pay_settlement", {
      p_settlement_id: settlementId,
      p_account_id: accountId,
      p_payment_date: paymentDate,
      p_receipt_number: receiptNumber,
      p_notes: notes,
      p_display_id: displayId,
      p_batch_id: null,
    });

    if (error) {
      console.error("[payroll-payment-service.pay]", error);
      return err<{ movementId: string; settlementId: string }>("rpc_failed");
    }

    const payload = (data ?? {}) as {
      ok?: boolean;
      code?: string;
      movement_id?: string;
      settlement_id?: string;
    };
    if (!payload.ok) {
      return err<{ movementId: string; settlementId: string }>(
        (payload.code ?? "unknown_error") as PayrollPaymentActionCode,
      );
    }

    return ok<{ movementId: string; settlementId: string }>("paid", {
      movementId: String(payload.movement_id ?? ""),
      settlementId: String(payload.settlement_id ?? settlementId),
    });
  } catch (error) {
    console.error("[payroll-payment-service.pay.exception]", error);
    return err<{ movementId: string; settlementId: string }>("unknown_error");
  }
}

// -------------------------------------------------------------------------
// Public API — bulk (US-65)
// -------------------------------------------------------------------------

export type PaySettlementsBatchInput = {
  ids: string[];
  accountId: string;
  paymentDate: string;
  notes: string | null;
};

export async function payStaffSettlementsBatch(
  input: PaySettlementsBatchInput,
): Promise<
  PayrollPaymentActionResult<{
    batchId: string;
    count: number;
    totalAmount: number;
  }>
> {
  const g = await guard();
  if (!g.ok) return err<{ batchId: string; count: number; totalAmount: number }>(g.code);
  const ctx = g.context;

  const accountId = input.accountId?.trim();
  const paymentDate = normalizeIsoDate(input.paymentDate);
  const notes = normalizeText(input.notes, 500);
  const ids = Array.isArray(input.ids) ? input.ids.filter((x) => typeof x === "string" && x) : [];

  if (!accountId) return err<{ batchId: string; count: number; totalAmount: number }>("account_required");
  if (!paymentDate) {
    return err<{ batchId: string; count: number; totalAmount: number }>("payment_date_required");
  }
  if (ids.length === 0) {
    return err<{ batchId: string; count: number; totalAmount: number }>("settlement_not_found");
  }

  try {
    const displayIds = await generateDisplayIds(ctx.clubId, ctx.clubName, paymentDate, ids.length);

    const supabase = requireAdmin();
    const { error: setErr } = await supabase.rpc("set_current_club", {
      p_club_id: ctx.clubId,
    });
    if (setErr && setErr.code !== "42883") {
      console.warn("[payroll-payment-service] set_current_club failed", setErr);
    }

    const { data, error } = await supabase.rpc("hr_pay_settlements_batch", {
      p_ids: ids,
      p_account_id: accountId,
      p_payment_date: paymentDate,
      p_notes: notes,
      p_display_ids: displayIds,
    });

    if (error) {
      console.error("[payroll-payment-service.pay-batch]", error);
      return err<{ batchId: string; count: number; totalAmount: number }>("rpc_failed");
    }

    const payload = (data ?? {}) as {
      ok?: boolean;
      code?: string;
      batch_id?: string;
      count?: number;
      total_amount?: number;
      failed_settlement_id?: string;
    };

    if (!payload.ok) {
      return err<{ batchId: string; count: number; totalAmount: number }>(
        (payload.code ?? "unknown_error") as PayrollPaymentActionCode,
        payload.failed_settlement_id ?? null,
      );
    }

    return ok<{ batchId: string; count: number; totalAmount: number }>("paid_batch", {
      batchId: String(payload.batch_id ?? ""),
      count: Number(payload.count ?? ids.length),
      totalAmount: Number(payload.total_amount ?? 0),
    });
  } catch (error) {
    console.error("[payroll-payment-service.pay-batch.exception]", error);
    return err<{ batchId: string; count: number; totalAmount: number }>("unknown_error");
  }
}
