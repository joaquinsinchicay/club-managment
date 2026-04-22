"use server";

import { revalidatePath } from "next/cache";

import {
  createSalaryStructure,
  updateSalaryStructure,
  updateSalaryStructureAmount,
  type SalaryStructureActionCode,
} from "@/lib/services/salary-structure-service";

export type RrhhActionResult = { ok: boolean; code: string };

/**
 * Maps service result codes to feedback-catalog keys consumed by the
 * `resolveFeedback("settings", code)` lookup. Keys are registered under
 * `settings.club.rrhh.feedback.*` in `lib/texts.json`.
 */
function toFeedbackCode(code: SalaryStructureActionCode): string {
  switch (code) {
    case "created":
      return "salary_structure_created";
    case "updated":
      return "salary_structure_updated";
    case "status_changed":
      return "salary_structure_status_changed";
    case "amount_updated":
      return "salary_structure_amount_updated";
    case "structure_not_found":
      return "salary_structure_not_found";
    case "name_required":
      return "salary_structure_name_required";
    case "role_required":
      return "salary_structure_role_required";
    case "activity_required":
      return "salary_structure_activity_required";
    case "remuneration_type_required":
      return "salary_structure_remuneration_type_required";
    case "invalid_remuneration_type":
      return "salary_structure_invalid_remuneration_type";
    case "invalid_status":
      return "salary_structure_invalid_status";
    case "initial_amount_required":
      return "salary_structure_amount_required";
    case "amount_must_be_positive":
      return "salary_structure_amount_must_be_positive";
    case "invalid_workload_hours":
      return "salary_structure_invalid_workload_hours";
    case "duplicate_role_activity":
      return "salary_structure_duplicate_role_activity";
    case "effective_date_required":
      return "salary_structure_effective_date_required";
    case "invalid_effective_date":
      return "salary_structure_invalid_effective_date";
    case "current_version_not_found":
      return "salary_structure_current_version_not_found";
    case "same_day_update":
      return "salary_structure_same_day_update";
    case "forbidden":
      return "salary_structure_forbidden";
    case "no_active_club":
    case "unauthenticated":
      return "salary_structure_forbidden";
    default:
      return "salary_structure_unknown_error";
  }
}

function rawCreateFromFormData(formData: FormData) {
  function read(key: string): string | undefined {
    const raw = formData.get(key);
    if (typeof raw !== "string") return undefined;
    const trimmed = raw.trim();
    return trimmed === "" ? undefined : trimmed;
  }

  return {
    name: read("name"),
    functionalRole: read("functional_role"),
    activityId: read("activity_id"),
    remunerationType: read("remuneration_type"),
    workloadHours: read("workload_hours"),
    status: read("status"),
    initialAmount: read("initial_amount"),
  };
}

function rawUpdateFromFormData(formData: FormData) {
  function read(key: string): string | undefined {
    const raw = formData.get(key);
    if (typeof raw !== "string") return undefined;
    const trimmed = raw.trim();
    return trimmed === "" ? undefined : trimmed;
  }

  return {
    name: read("name"),
    remunerationType: read("remuneration_type"),
    workloadHours: read("workload_hours"),
    status: read("status"),
  };
}

export async function createSalaryStructureAction(
  formData: FormData,
): Promise<RrhhActionResult> {
  const result = await createSalaryStructure(rawCreateFromFormData(formData));
  revalidatePath("/settings");
  return { ok: result.ok, code: toFeedbackCode(result.code) };
}

export async function updateSalaryStructureAction(
  formData: FormData,
): Promise<RrhhActionResult> {
  const structureId = String(formData.get("salary_structure_id") ?? "");
  if (!structureId) {
    return { ok: false, code: toFeedbackCode("structure_not_found") };
  }

  const result = await updateSalaryStructure(structureId, rawUpdateFromFormData(formData));
  revalidatePath("/settings");
  return { ok: result.ok, code: toFeedbackCode(result.code) };
}

export async function updateSalaryStructureAmountAction(
  formData: FormData,
): Promise<RrhhActionResult> {
  const structureId = String(formData.get("salary_structure_id") ?? "");
  if (!structureId) {
    return { ok: false, code: toFeedbackCode("structure_not_found") };
  }

  const amount = formData.get("amount");
  const effectiveDate = formData.get("effective_date");

  const result = await updateSalaryStructureAmount(structureId, {
    amount: typeof amount === "string" ? amount : undefined,
    effectiveDate: typeof effectiveDate === "string" ? effectiveDate : undefined,
  });
  revalidatePath("/settings");
  return { ok: result.ok, code: toFeedbackCode(result.code) };
}
