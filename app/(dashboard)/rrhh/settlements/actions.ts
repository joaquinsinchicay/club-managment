"use server";

import { revalidatePath } from "next/cache";

import {
  addAdjustment,
  annulSettlement,
  approveSettlement,
  approveSettlementsBulk,
  deleteAdjustment,
  generateMonthlySettlements,
  returnSettlementToGenerated,
  updateHoursOrNotes,
  type PayrollSettlementActionCode,
} from "@/lib/services/payroll-settlement-service";
import {
  payStaffSettlement,
  payStaffSettlementsBatch,
  type PayrollPaymentActionCode,
} from "@/lib/services/payroll-payment-service";

export type SettlementActionResult = { ok: boolean; code: string; data?: unknown };

function toFeedbackCode(code: PayrollSettlementActionCode): string {
  switch (code) {
    case "generated":
      return "settlement_generated";
    case "approved":
      return "settlement_approved";
    case "approved_bulk":
      return "settlement_approved_bulk";
    case "returned_to_generated":
      return "settlement_returned_to_generated";
    case "annulled":
      return "settlement_annulled";
    case "adjustment_added":
      return "settlement_adjustment_added";
    case "adjustment_updated":
      return "settlement_adjustment_updated";
    case "adjustment_removed":
      return "settlement_adjustment_removed";
    case "hours_loaded":
      return "settlement_hours_loaded";
    case "base_amount_updated":
      return "settlement_base_amount_updated";
    case "notes_updated":
      return "settlement_notes_updated";
    case "partial":
      return "settlement_partial";
    case "settlement_not_found":
      return "settlement_not_found";
    case "adjustment_not_found":
      return "settlement_adjustment_not_found";
    case "invalid_period":
      return "settlement_invalid_period";
    case "no_active_contracts":
      return "settlement_no_active_contracts";
    case "invalid_type":
      return "settlement_invalid_type";
    case "concept_required":
      return "settlement_concept_required";
    case "amount_required":
      return "settlement_amount_required";
    case "amount_must_be_positive":
      return "settlement_amount_must_be_positive";
    case "hours_required":
      return "settlement_hours_required";
    case "classes_required":
      return "settlement_classes_required";
    case "edit_blocked_approved":
      return "settlement_edit_blocked_approved";
    case "edit_blocked_paid":
      return "settlement_edit_blocked_paid";
    case "edit_blocked_annulled":
      return "settlement_edit_blocked_annulled";
    case "total_negative":
      return "settlement_total_negative";
    case "zero_amount_requires_approval":
      return "settlement_zero_amount_requires_approval";
    case "invalid_status":
      return "settlement_invalid_status";
    case "already_approved":
      return "settlement_already_approved";
    case "reason_required":
      return "settlement_reason_required";
    case "already_annulled":
      return "settlement_already_annulled";
    case "movement_still_active":
      return "settlement_movement_still_active";
    case "forbidden":
    case "no_active_club":
    case "unauthenticated":
      return "settlement_forbidden";
    default:
      return "settlement_unknown_error";
  }
}

export async function generateMonthlySettlementsAction(
  formData: FormData,
): Promise<SettlementActionResult> {
  const year = formData.get("year");
  const month = formData.get("month");
  const result = await generateMonthlySettlements({
    year: typeof year === "string" ? year : undefined,
    month: typeof month === "string" ? month : undefined,
  });
  revalidatePath("/rrhh/settlements");
  return {
    ok: result.ok,
    code: toFeedbackCode(result.code),
    data: result.ok ? result.data : undefined,
  };
}

export async function addAdjustmentAction(
  formData: FormData,
): Promise<SettlementActionResult> {
  const result = await addAdjustment({
    settlementId: formData.get("settlement_id"),
    type: formData.get("type"),
    concept: formData.get("concept"),
    amount: formData.get("amount"),
  });
  revalidatePath("/rrhh/settlements");
  return { ok: result.ok, code: toFeedbackCode(result.code) };
}

export async function deleteAdjustmentAction(
  formData: FormData,
): Promise<SettlementActionResult> {
  const settlementId = String(formData.get("settlement_id") ?? "");
  const adjustmentId = String(formData.get("adjustment_id") ?? "");
  const result = await deleteAdjustment({ settlementId, adjustmentId });
  revalidatePath("/rrhh/settlements");
  return { ok: result.ok, code: toFeedbackCode(result.code) };
}

export async function updateHoursOrNotesAction(
  formData: FormData,
): Promise<SettlementActionResult> {
  const settlementId = String(formData.get("settlement_id") ?? "");
  const hours = formData.get("hours_worked");
  const classes = formData.get("classes_worked");
  const notes = formData.get("notes");
  const result = await updateHoursOrNotes({
    settlementId,
    hoursWorked: hours === null ? undefined : typeof hours === "string" ? hours : undefined,
    classesWorked:
      classes === null ? undefined : typeof classes === "string" ? classes : undefined,
    notes: notes === null ? undefined : typeof notes === "string" ? notes : undefined,
  });
  revalidatePath("/rrhh/settlements");
  return { ok: result.ok, code: toFeedbackCode(result.code) };
}

export async function approveSettlementAction(
  formData: FormData,
): Promise<SettlementActionResult> {
  const result = await approveSettlement({
    settlementId: formData.get("settlement_id"),
    approveZero: formData.get("approve_zero"),
  });
  revalidatePath("/rrhh/settlements");
  return { ok: result.ok, code: toFeedbackCode(result.code) };
}

export async function approveSettlementsBulkAction(
  formData: FormData,
): Promise<SettlementActionResult> {
  const ids = formData.getAll("settlement_ids").map(String).filter(Boolean);
  const approveZero = formData.get("approve_zero") === "on";
  const result = await approveSettlementsBulk({ ids, approveZero });
  revalidatePath("/rrhh/settlements");
  return {
    ok: result.ok,
    code: toFeedbackCode(result.code),
    data: result.ok ? result.data : undefined,
  };
}

export async function annulSettlementAction(
  formData: FormData,
): Promise<SettlementActionResult> {
  const result = await annulSettlement({
    settlementId: formData.get("settlement_id"),
    reason: formData.get("reason"),
  });
  revalidatePath("/rrhh/settlements");
  return { ok: result.ok, code: toFeedbackCode(result.code) };
}

export async function returnSettlementToGeneratedAction(
  formData: FormData,
): Promise<SettlementActionResult> {
  const result = await returnSettlementToGenerated({
    settlementId: formData.get("settlement_id"),
    reason: formData.get("reason"),
  });
  revalidatePath("/rrhh/settlements");
  revalidatePath("/treasury/payroll");
  return { ok: result.ok, code: toFeedbackCode(result.code) };
}

// -------------------------------------------------------------------------
// Payments (US-64 / US-65)
// -------------------------------------------------------------------------

function toPaymentFeedbackCode(code: PayrollPaymentActionCode): string {
  switch (code) {
    case "paid":
      return "settlement_paid";
    case "paid_batch":
      return "settlement_paid_batch";
    case "settlement_not_found":
      return "settlement_not_found";
    case "account_required":
      return "settlement_payment_account_required";
    case "account_not_available":
      return "settlement_payment_account_not_available";
    case "currency_mismatch":
      return "settlement_payment_currency_mismatch";
    case "payment_date_required":
      return "settlement_payment_date_required";
    case "invalid_payment_date":
      return "settlement_payment_invalid_date";
    case "invalid_status":
      return "settlement_invalid_status";
    case "already_paid":
      return "settlement_payment_already_paid";
    case "invalid_total_amount":
      return "settlement_payment_invalid_total";
    case "sueldos_category_not_found":
      return "settlement_payment_sueldos_category_missing";
    case "club_not_found":
      return "settlement_payment_club_not_found";
    case "display_ids_mismatch":
      return "settlement_payment_display_ids_mismatch";
    case "partial_failure":
      return "settlement_payment_partial_failure";
    case "rpc_failed":
      return "settlement_unknown_error";
    case "forbidden":
    case "no_active_club":
    case "unauthenticated":
      return "settlement_forbidden";
    default:
      return "settlement_unknown_error";
  }
}

export async function payStaffSettlementAction(
  formData: FormData,
): Promise<SettlementActionResult> {
  const result = await payStaffSettlement({
    settlementId: formData.get("settlement_id"),
    accountId: formData.get("account_id"),
    paymentDate: formData.get("payment_date"),
    receiptNumber: formData.get("receipt_number"),
    notes: formData.get("notes"),
  });
  revalidatePath("/rrhh/settlements");
  revalidatePath("/treasury");
  revalidatePath("/dashboard");
  return {
    ok: result.ok,
    code: toPaymentFeedbackCode(result.code),
    data: result.ok ? result.data : undefined,
  };
}

export async function payStaffSettlementsBatchAction(
  formData: FormData,
): Promise<SettlementActionResult> {
  const ids = formData.getAll("settlement_ids").map(String).filter(Boolean);
  const accountId = String(formData.get("account_id") ?? "");
  const paymentDate = String(formData.get("payment_date") ?? "");
  const notesRaw = formData.get("notes");
  const result = await payStaffSettlementsBatch({
    ids,
    accountId,
    paymentDate,
    notes: typeof notesRaw === "string" ? notesRaw : null,
  });
  revalidatePath("/rrhh/settlements");
  revalidatePath("/treasury");
  revalidatePath("/dashboard");
  return {
    ok: result.ok,
    code: toPaymentFeedbackCode(result.code),
    data: result.ok ? result.data : undefined,
  };
}
