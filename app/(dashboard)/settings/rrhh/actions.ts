"use server";

import { revalidatePath } from "next/cache";

import {
  createSalaryStructure,
  updateSalaryStructure,
  type SalaryStructureActionCode,
} from "@/lib/services/salary-structure-service";
import {
  createStaffMember,
  updateStaffMember,
  type StaffMemberActionCode,
} from "@/lib/services/staff-member-service";
import {
  createStaffContract,
  finalizeStaffContract,
  updateStaffContract,
  type StaffContractActionCode,
} from "@/lib/services/staff-contract-service";

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
    case "structure_not_found":
      return "salary_structure_not_found";
    case "name_required":
      return "salary_structure_name_required";
    case "role_required":
      return "salary_structure_role_required";
    case "invalid_functional_role":
      return "salary_structure_invalid_functional_role";
    case "activity_required":
      return "salary_structure_activity_required";
    case "invalid_divisions":
      return "salary_structure_invalid_divisions";
    case "payment_type_required":
      return "salary_structure_payment_type_required";
    case "invalid_payment_type":
      return "salary_structure_invalid_payment_type";
    case "remuneration_type_required":
      return "salary_structure_remuneration_type_required";
    case "invalid_remuneration_type":
      return "salary_structure_invalid_remuneration_type";
    case "invalid_status":
      return "salary_structure_invalid_status";
    case "amount_required":
      return "salary_structure_amount_required";
    case "amount_must_be_positive":
      return "salary_structure_amount_must_be_positive";
    case "invalid_workload_hours":
      return "salary_structure_invalid_workload_hours";
    case "duplicate_role_activity":
      return "salary_structure_duplicate_role_activity";
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

  // Soporta ambas formas de envío: getAll (checkboxes) o un JSON stringified.
  const divisionsMulti = formData
    .getAll("divisions")
    .filter((v): v is string => typeof v === "string" && v !== "");

  return {
    functionalRole: read("functional_role"),
    activityId: read("activity_id"),
    divisions: divisionsMulti.length > 0 ? divisionsMulti : read("divisions"),
    paymentType: read("payment_type"),
    remunerationType: read("remuneration_type"),
    workloadHours: read("workload_hours"),
    status: read("status"),
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

// -------------------------------------------------------------------------
// Staff Members (US-56)
// -------------------------------------------------------------------------

function staffMemberFeedbackCode(code: StaffMemberActionCode): string {
  switch (code) {
    case "created":
      return "staff_member_created";
    case "updated":
      return "staff_member_updated";
    case "member_not_found":
      return "staff_member_not_found";
    case "first_name_required":
      return "staff_member_first_name_required";
    case "last_name_required":
      return "staff_member_last_name_required";
    case "dni_required":
      return "staff_member_dni_required";
    case "invalid_dni":
      return "staff_member_invalid_dni";
    case "invalid_cuit_cuil":
      return "staff_member_invalid_cuit_cuil";
    case "invalid_cuit_dv":
      return "staff_member_invalid_cuit_dv";
    case "vinculo_required":
      return "staff_member_vinculo_required";
    case "invalid_vinculo":
      return "staff_member_invalid_vinculo";
    case "email_invalid":
      return "staff_member_email_invalid";
    case "phone_invalid":
      return "staff_member_phone_invalid";
    case "invalid_hire_date":
      return "staff_member_invalid_hire_date";
    case "duplicate_dni":
      return "staff_member_duplicate_dni";
    case "duplicate_cuit_cuil":
      return "staff_member_duplicate_cuit_cuil";
    case "forbidden":
    case "no_active_club":
    case "unauthenticated":
      return "staff_member_forbidden";
    default:
      return "staff_member_unknown_error";
  }
}

function rawStaffMemberFromFormData(formData: FormData) {
  function read(key: string): string | undefined {
    const raw = formData.get(key);
    if (typeof raw !== "string") return undefined;
    const trimmed = raw.trim();
    return trimmed === "" ? undefined : trimmed;
  }

  return {
    firstName: read("first_name"),
    lastName: read("last_name"),
    dni: read("dni"),
    cuitCuil: read("cuit_cuil"),
    email: read("email"),
    phone: read("phone"),
    vinculoType: read("vinculo_type"),
    cbuAlias: read("cbu_alias"),
    hireDate: read("hire_date"),
  };
}

export async function createStaffMemberAction(formData: FormData): Promise<RrhhActionResult> {
  const result = await createStaffMember(rawStaffMemberFromFormData(formData));
  revalidatePath("/settings");
  return { ok: result.ok, code: staffMemberFeedbackCode(result.code) };
}

export async function updateStaffMemberAction(formData: FormData): Promise<RrhhActionResult> {
  const memberId = String(formData.get("staff_member_id") ?? "");
  if (!memberId) return { ok: false, code: staffMemberFeedbackCode("member_not_found") };
  const result = await updateStaffMember(memberId, rawStaffMemberFromFormData(formData));
  revalidatePath("/settings");
  return { ok: result.ok, code: staffMemberFeedbackCode(result.code) };
}

// -------------------------------------------------------------------------
// Staff Contracts (US-57 / US-58)
// -------------------------------------------------------------------------

function staffContractFeedbackCode(code: StaffContractActionCode): string {
  switch (code) {
    case "created":
      return "staff_contract_created";
    case "updated":
      return "staff_contract_updated";
    case "finalized":
      return "staff_contract_finalized";
    case "contract_not_found":
      return "staff_contract_not_found";
    case "staff_member_required":
      return "staff_contract_member_required";
    case "structure_required":
      return "staff_contract_structure_required";
    case "start_date_required":
      return "staff_contract_start_date_required";
    case "end_date_before_start":
      return "staff_contract_end_date_before_start";
    case "start_date_too_old":
      return "staff_contract_start_date_too_old";
    case "initial_amount_required":
      return "staff_contract_initial_amount_required";
    case "initial_amount_invalid":
      return "staff_contract_initial_amount_invalid";
    case "structure_already_taken":
      return "staff_contract_structure_already_taken";
    case "salary_structure_not_active":
      return "staff_contract_structure_not_active";
    case "invalid_start_date":
      return "staff_contract_invalid_start_date";
    case "invalid_end_date":
      return "staff_contract_invalid_end_date";
    case "end_date_too_far":
      return "staff_contract_end_date_too_far";
    case "already_finalized":
      return "staff_contract_already_finalized";
    case "invalid_status":
      return "staff_contract_invalid_status";
    case "forbidden":
    case "no_active_club":
    case "unauthenticated":
      return "staff_contract_forbidden";
    default:
      return "staff_contract_unknown_error";
  }
}

function rawCreateContractFromFormData(formData: FormData) {
  function read(key: string): string | undefined {
    const raw = formData.get(key);
    if (typeof raw !== "string") return undefined;
    const trimmed = raw.trim();
    return trimmed === "" ? undefined : trimmed;
  }

  return {
    staffMemberId: read("staff_member_id"),
    salaryStructureId: read("salary_structure_id"),
    startDate: read("start_date"),
    endDate: read("end_date"),
    usesStructureAmount: read("uses_structure_amount") ?? "true",
    agreedAmount: read("agreed_amount"),
  };
}

function rawUpdateContractFromFormData(formData: FormData) {
  function read(key: string): string | undefined {
    const raw = formData.get(key);
    if (typeof raw !== "string") return undefined;
    const trimmed = raw.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  return {
    endDate: read("end_date"),
    usesStructureAmount: read("uses_structure_amount"),
    frozenAmount: read("frozen_amount"),
  };
}

export async function createStaffContractAction(formData: FormData): Promise<RrhhActionResult> {
  const result = await createStaffContract(rawCreateContractFromFormData(formData));
  revalidatePath("/settings");
  return { ok: result.ok, code: staffContractFeedbackCode(result.code) };
}

export async function updateStaffContractAction(formData: FormData): Promise<RrhhActionResult> {
  const contractId = String(formData.get("staff_contract_id") ?? "");
  if (!contractId) return { ok: false, code: staffContractFeedbackCode("contract_not_found") };
  const result = await updateStaffContract(contractId, rawUpdateContractFromFormData(formData));
  revalidatePath("/settings");
  return { ok: result.ok, code: staffContractFeedbackCode(result.code) };
}

export async function finalizeStaffContractAction(formData: FormData): Promise<RrhhActionResult> {
  const contractId = String(formData.get("staff_contract_id") ?? "");
  if (!contractId) return { ok: false, code: staffContractFeedbackCode("contract_not_found") };
  const endDate = formData.get("end_date");
  const reason = formData.get("reason");
  const result = await finalizeStaffContract(contractId, {
    endDate: typeof endDate === "string" ? endDate : undefined,
    reason: typeof reason === "string" ? reason : undefined,
  });
  revalidatePath("/settings");
  return { ok: result.ok, code: staffContractFeedbackCode(result.code) };
}
