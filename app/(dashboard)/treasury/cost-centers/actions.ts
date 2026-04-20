"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { resolveFeedback } from "@/lib/feedback-catalog";
import {
  createCostCenter,
  syncMovementCostCenterLinks,
  unlinkMovementFromCostCenter,
  updateCostCenter,
  type CostCenterActionCode
} from "@/lib/services/cost-center-service";
import { flashToast } from "@/lib/toast-server";

/**
 * Maps the service result code to the feedback-catalog code so `resolveFeedback`
 * can pick up the right text + toast kind. Keeps the service layer agnostic of
 * UI concerns.
 */
function toFeedbackCode(code: CostCenterActionCode): string {
  switch (code) {
    case "created":
      return "cost_center_created";
    case "updated":
      return "cost_center_updated";
    case "closed":
      return "cost_center_closed";
    case "movement_links_synced":
      return "cost_center_movement_links_synced";
    case "movement_unlinked":
      return "cost_center_movement_unlinked";
    case "forbidden":
      return "cost_center_forbidden";
    case "name_required":
      return "cost_center_name_required";
    case "type_required":
      return "cost_center_type_required";
    case "start_date_required":
      return "cost_center_start_date_required";
    case "currency_required":
      return "cost_center_currency_required";
    case "responsible_required":
      return "cost_center_responsible_required";
    case "amount_required":
      return "cost_center_amount_required";
    case "invalid_type":
      return "cost_center_invalid_type";
    case "invalid_status":
      return "cost_center_invalid_status";
    case "invalid_periodicity":
      return "cost_center_invalid_periodicity";
    case "invalid_date_range":
      return "cost_center_invalid_date_range";
    case "invalid_start_date":
      return "cost_center_invalid_start_date";
    case "invalid_end_date":
      return "cost_center_invalid_end_date";
    case "duplicate_name":
      return "cost_center_duplicate_name";
    case "locked_field_modified":
      return "cost_center_locked_field_modified";
    case "cost_center_not_found":
    case "not_found":
      return "cost_center_not_found";
    case "cost_center_inactive":
      return "cost_center_inactive";
    default:
      return "cost_center_unknown_error";
  }
}

function redirectToCostCenters(code: CostCenterActionCode): never {
  const feedbackCode = toFeedbackCode(code);
  const feedback = resolveFeedback("dashboard", feedbackCode);

  flashToast({
    kind: feedback.kind,
    title: feedback.title
  });

  revalidatePath("/treasury");
  redirect("/treasury?tab=cost_centers");
}

/**
 * Extracts the raw input shape expected by the service from a FormData payload.
 * Empty strings are normalized to undefined to let the service's validator
 * apply the proper defaults and enforce required-field rules.
 */
function rawFromFormData(formData: FormData) {
  function read(key: string): string | undefined {
    const raw = formData.get(key);
    if (typeof raw !== "string") return undefined;
    const trimmed = raw.trim();
    return trimmed === "" ? undefined : trimmed;
  }

  return {
    name: read("name"),
    description: read("description"),
    type: read("type"),
    status: read("status"),
    startDate: read("start_date"),
    endDate: read("end_date"),
    currencyCode: read("currency_code"),
    amount: read("amount"),
    periodicity: read("periodicity"),
    responsibleUserId: read("responsible_user_id")
  };
}

export async function createCostCenterAction(formData: FormData) {
  const result = await createCostCenter(rawFromFormData(formData));
  redirectToCostCenters(result.code);
}

export async function updateCostCenterAction(formData: FormData) {
  const costCenterId = String(formData.get("cost_center_id") ?? "");
  if (!costCenterId) {
    redirectToCostCenters("cost_center_not_found");
  }

  const result = await updateCostCenter(costCenterId, rawFromFormData(formData));
  redirectToCostCenters(result.code);
}

export async function syncMovementCostCenterLinksAction(formData: FormData) {
  const movementId = String(formData.get("movement_id") ?? "");
  const costCenterIds = formData.getAll("cost_center_ids").map(String).filter(Boolean);

  const result = await syncMovementCostCenterLinks({
    movementId,
    costCenterIds
  });

  const feedbackCode = toFeedbackCode(result.code);
  const feedback = resolveFeedback("dashboard", feedbackCode);
  flashToast({ kind: feedback.kind, title: feedback.title });

  revalidatePath("/treasury");
  revalidatePath("/dashboard");
}

export async function unlinkMovementFromCostCenterAction(formData: FormData) {
  const movementId = String(formData.get("movement_id") ?? "");
  const costCenterId = String(formData.get("cost_center_id") ?? "");

  const result = await unlinkMovementFromCostCenter({ movementId, costCenterId });

  const feedbackCode = toFeedbackCode(result.code);
  const feedback = resolveFeedback("dashboard", feedbackCode);
  flashToast({ kind: feedback.kind, title: feedback.title });

  revalidatePath("/treasury");
  redirect(`/treasury/cost-centers/${costCenterId}`);
}
