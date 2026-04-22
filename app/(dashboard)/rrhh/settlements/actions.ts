"use server";

import { revalidatePath } from "next/cache";

import {
  addAdjustment,
  annulSettlement,
  confirmSettlement,
  confirmSettlementsBulk,
  deleteAdjustment,
  generateMonthlySettlements,
  updateHoursOrNotes,
  type PayrollSettlementActionCode,
} from "@/lib/services/payroll-settlement-service";

export type SettlementActionResult = { ok: boolean; code: string; data?: unknown };

function toFeedbackCode(code: PayrollSettlementActionCode): string {
  switch (code) {
    case "generated":
      return "settlement_generated";
    case "confirmed":
      return "settlement_confirmed";
    case "confirmed_bulk":
      return "settlement_confirmed_bulk";
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
    case "edit_blocked_confirmed":
      return "settlement_edit_blocked_confirmed";
    case "edit_blocked_paid":
      return "settlement_edit_blocked_paid";
    case "edit_blocked_annulled":
      return "settlement_edit_blocked_annulled";
    case "total_negative":
      return "settlement_total_negative";
    case "zero_amount_requires_confirm":
      return "settlement_zero_amount_requires_confirm";
    case "invalid_status":
      return "settlement_invalid_status";
    case "already_confirmed":
      return "settlement_already_confirmed";
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

export async function confirmSettlementAction(
  formData: FormData,
): Promise<SettlementActionResult> {
  const result = await confirmSettlement({
    settlementId: formData.get("settlement_id"),
    confirmZero: formData.get("confirm_zero"),
  });
  revalidatePath("/rrhh/settlements");
  return { ok: result.ok, code: toFeedbackCode(result.code) };
}

export async function confirmSettlementsBulkAction(
  formData: FormData,
): Promise<SettlementActionResult> {
  const ids = formData.getAll("settlement_ids").map(String).filter(Boolean);
  const confirmZero = formData.get("confirm_zero") === "on";
  const result = await confirmSettlementsBulk({ ids, confirmZero });
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
