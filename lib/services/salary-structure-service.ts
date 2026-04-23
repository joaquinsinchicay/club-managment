/**
 * Service layer for Salary Structures (US-54 / US-55).
 *
 * Orchestrates:
 *  - Authorization (`admin` o `rrhh` en el club activo).
 *  - Business-rule validation (campos obligatorios, duplicados por
 *    rol+actividad, inmutabilidad de rol/actividad/monto en edición,
 *    estado default).
 *  - Creación de la primera versión de monto al alta.
 *  - Delegación de la actualización de monto al RPC transaccional
 *    `hr_update_salary_structure_amount` (US-55).
 *  - Audit log append-only via repository.recordActivity.
 *
 * Devuelve resultados discriminados `{ ok, code }` para que las server
 * actions traduzcan a toast/flash feedback sin filtrar detalles de DB.
 */

import { parseLocalizedAmount } from "@/lib/amounts";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import type { Membership } from "@/lib/domain/access";
import {
  canAccessHrMasters,
  canMutateHrMasters,
} from "@/lib/domain/authorization";
import {
  isFunctionalRole,
  isSalaryRemunerationType,
  isSalaryStructureStatus,
  normalizeFunctionalRole,
  type SalaryRemunerationType,
  type SalaryStructure,
  type SalaryStructureStatus,
  type SalaryStructureVersion,
} from "@/lib/domain/salary-structure";
import {
  isSalaryStructureRepositoryInfraError,
  salaryStructureRepository,
  type ListSalaryStructuresFilters,
} from "@/lib/repositories/salary-structure-repository";

// -------------------------------------------------------------------------
// Result codes
// -------------------------------------------------------------------------

export type SalaryStructureActionCode =
  | "unauthenticated"
  | "no_active_club"
  | "forbidden"
  // create / update
  | "created"
  | "updated"
  | "status_changed"
  | "structure_not_found"
  // validation
  | "name_required"
  | "role_required"
  | "invalid_functional_role"
  | "activity_required"
  | "remuneration_type_required"
  | "invalid_remuneration_type"
  | "invalid_status"
  | "amount_required"
  | "amount_must_be_positive"
  | "invalid_workload_hours"
  | "duplicate_role_activity"
  // amount update
  | "effective_date_required"
  | "invalid_effective_date"
  | "current_version_not_found"
  | "same_day_update"
  | "amount_updated"
  // infra
  | "unknown_error";

export type SalaryStructureActionResult<T = void> =
  | { ok: true; code: SalaryStructureActionCode; data?: T }
  | { ok: false; code: SalaryStructureActionCode };

function ok<T>(code: SalaryStructureActionCode, data?: T): SalaryStructureActionResult<T> {
  return { ok: true, code, data };
}
function err<T = void>(code: SalaryStructureActionCode): SalaryStructureActionResult<T> {
  return { ok: false, code };
}

// -------------------------------------------------------------------------
// Auth guards
// -------------------------------------------------------------------------

type GuardedContext = {
  userId: string;
  clubId: string;
  membership: Membership;
};

type GuardResult =
  | { ok: true; context: GuardedContext }
  | { ok: false; code: SalaryStructureActionCode };

async function guardRead(): Promise<GuardResult> {
  const session = await getAuthenticatedSessionContext();
  if (!session) return { ok: false, code: "unauthenticated" };
  if (!session.activeClub || !session.activeMembership) {
    return { ok: false, code: "no_active_club" };
  }
  if (!canAccessHrMasters(session.activeMembership)) {
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

async function guardMutate(): Promise<GuardResult> {
  const session = await getAuthenticatedSessionContext();
  if (!session) return { ok: false, code: "unauthenticated" };
  if (!session.activeClub || !session.activeMembership) {
    return { ok: false, code: "no_active_club" };
  }
  if (!canMutateHrMasters(session.activeMembership)) {
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
// Normalizers + validators
// -------------------------------------------------------------------------

function normalizeText(raw: unknown, maxLength: number): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function normalizeId(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  return trimmed || null;
}

function normalizeAmount(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") {
    return Number.isFinite(raw) ? raw : null;
  }
  if (typeof raw === "string") {
    return parseLocalizedAmount(raw);
  }
  return null;
}

function normalizeIsoDate(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const parsed = new Date(`${trimmed}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return trimmed;
}

// -------------------------------------------------------------------------
// Inputs
// -------------------------------------------------------------------------

export type CreateSalaryStructureRawInput = {
  name?: unknown;
  functionalRole?: unknown;
  activityId?: unknown;
  remunerationType?: unknown;
  workloadHours?: unknown;
  status?: unknown;
};

export type UpdateSalaryStructureRawInput = {
  name?: unknown;
  remunerationType?: unknown;
  workloadHours?: unknown;
  status?: unknown;
};

type ValidatedCreateInput = {
  name: string;
  functionalRole: string;
  activityId: string;
  remunerationType: SalaryRemunerationType;
  workloadHours: number | null;
  status: SalaryStructureStatus;
};

type ValidatedUpdateInput = {
  name: string;
  remunerationType: SalaryRemunerationType;
  workloadHours: number | null;
  status: SalaryStructureStatus;
};

function validateCreateInput(raw: CreateSalaryStructureRawInput):
  | { ok: true; input: ValidatedCreateInput }
  | { ok: false; code: SalaryStructureActionCode } {
  const name = normalizeText(raw.name, 120);
  const functionalRole = normalizeText(raw.functionalRole, 120);
  const activityId = normalizeId(raw.activityId);
  const remunerationTypeRaw =
    typeof raw.remunerationType === "string" ? raw.remunerationType.trim() : "";
  const statusRaw = typeof raw.status === "string" ? raw.status.trim() : "activa";
  const workloadHours = normalizeAmount(raw.workloadHours);

  if (!name) return { ok: false, code: "name_required" };
  if (!functionalRole) return { ok: false, code: "role_required" };
  if (!isFunctionalRole(functionalRole)) {
    return { ok: false, code: "invalid_functional_role" };
  }
  if (!activityId) return { ok: false, code: "activity_required" };
  if (!remunerationTypeRaw) return { ok: false, code: "remuneration_type_required" };
  if (!isSalaryRemunerationType(remunerationTypeRaw)) {
    return { ok: false, code: "invalid_remuneration_type" };
  }
  if (workloadHours !== null && workloadHours < 0) {
    return { ok: false, code: "invalid_workload_hours" };
  }
  const status: SalaryStructureStatus = isSalaryStructureStatus(statusRaw) ? statusRaw : "activa";

  return {
    ok: true,
    input: {
      name,
      functionalRole,
      activityId,
      remunerationType: remunerationTypeRaw,
      workloadHours,
      status,
    },
  };
}

function validateUpdateInput(raw: UpdateSalaryStructureRawInput):
  | { ok: true; input: ValidatedUpdateInput }
  | { ok: false; code: SalaryStructureActionCode } {
  const name = normalizeText(raw.name, 120);
  const remunerationTypeRaw =
    typeof raw.remunerationType === "string" ? raw.remunerationType.trim() : "";
  const statusRaw = typeof raw.status === "string" ? raw.status.trim() : "";
  const workloadHours = normalizeAmount(raw.workloadHours);

  if (!name) return { ok: false, code: "name_required" };
  if (!remunerationTypeRaw) return { ok: false, code: "remuneration_type_required" };
  if (!isSalaryRemunerationType(remunerationTypeRaw)) {
    return { ok: false, code: "invalid_remuneration_type" };
  }
  if (workloadHours !== null && workloadHours < 0) {
    return { ok: false, code: "invalid_workload_hours" };
  }
  if (!isSalaryStructureStatus(statusRaw)) {
    return { ok: false, code: "invalid_status" };
  }

  return {
    ok: true,
    input: {
      name,
      remunerationType: remunerationTypeRaw,
      workloadHours,
      status: statusRaw,
    },
  };
}

// -------------------------------------------------------------------------
// Public queries
// -------------------------------------------------------------------------

export type ListSalaryStructuresResult =
  | { ok: true; structures: SalaryStructure[] }
  | { ok: false; code: SalaryStructureActionCode };

export async function listSalaryStructuresForActiveClub(
  filters: ListSalaryStructuresFilters = {},
): Promise<ListSalaryStructuresResult> {
  const guard = await guardRead();
  if (!guard.ok) return { ok: false, code: guard.code };
  try {
    const structures = await salaryStructureRepository.listForClub(guard.context.clubId, filters);
    return { ok: true, structures };
  } catch (error) {
    if (isSalaryStructureRepositoryInfraError(error)) {
      console.error("[salary-structure-service.list]", error);
    }
    return { ok: false, code: "unknown_error" };
  }
}

export type ListSalaryStructuresWithVersionsResult =
  | {
      ok: true;
      structures: SalaryStructure[];
      versionsByStructureId: Record<string, SalaryStructureVersion[]>;
    }
  | { ok: false; code: SalaryStructureActionCode };

export async function listSalaryStructuresWithVersionsForActiveClub(
  filters: ListSalaryStructuresFilters = {},
): Promise<ListSalaryStructuresWithVersionsResult> {
  const guard = await guardRead();
  if (!guard.ok) return { ok: false, code: guard.code };
  const ctx = guard.context;
  try {
    const [structures, versions] = await Promise.all([
      salaryStructureRepository.listForClub(ctx.clubId, filters),
      salaryStructureRepository.listAllVersionsForClub(ctx.clubId),
    ]);
    const versionsByStructureId: Record<string, SalaryStructureVersion[]> = {};
    for (const v of versions) {
      if (!versionsByStructureId[v.salaryStructureId]) {
        versionsByStructureId[v.salaryStructureId] = [];
      }
      versionsByStructureId[v.salaryStructureId].push(v);
    }
    return { ok: true, structures, versionsByStructureId };
  } catch (error) {
    if (isSalaryStructureRepositoryInfraError(error)) {
      console.error("[salary-structure-service.list-with-versions]", error);
    }
    return { ok: false, code: "unknown_error" };
  }
}

export type SalaryStructureDetail = {
  structure: SalaryStructure;
  versions: SalaryStructureVersion[];
};

export async function getSalaryStructureDetail(
  structureId: string,
): Promise<SalaryStructureActionResult<SalaryStructureDetail>> {
  const guard = await guardRead();
  if (!guard.ok) return err<SalaryStructureDetail>(guard.code);
  const ctx = guard.context;

  try {
    const structure = await salaryStructureRepository.getById(ctx.clubId, structureId);
    if (!structure) return err<SalaryStructureDetail>("structure_not_found");
    const versions = await salaryStructureRepository.listVersions(ctx.clubId, structureId);
    return ok<SalaryStructureDetail>("updated", { structure, versions });
  } catch (error) {
    if (isSalaryStructureRepositoryInfraError(error)) {
      console.error("[salary-structure-service.detail]", error);
    }
    return err<SalaryStructureDetail>("unknown_error");
  }
}

// -------------------------------------------------------------------------
// Mutations
// -------------------------------------------------------------------------

export async function createSalaryStructure(
  raw: CreateSalaryStructureRawInput,
): Promise<SalaryStructureActionResult<{ structure: SalaryStructure }>> {
  const guard = await guardMutate();
  if (!guard.ok) return err<{ structure: SalaryStructure }>(guard.code);
  const ctx = guard.context;

  const validation = validateCreateInput(raw);
  if (!validation.ok) return err<{ structure: SalaryStructure }>(validation.code);
  const input = validation.input;

  try {
    // Check uniqueness by normalized functional_role + activity_id.
    const duplicate = await salaryStructureRepository.existsByRoleActivity({
      clubId: ctx.clubId,
      functionalRole: input.functionalRole,
      activityId: input.activityId,
    });
    if (duplicate) return err<{ structure: SalaryStructure }>("duplicate_role_activity");

    const created = await salaryStructureRepository.create({
      clubId: ctx.clubId,
      name: input.name,
      functionalRole: input.functionalRole,
      activityId: input.activityId,
      remunerationType: input.remunerationType,
      workloadHours: input.workloadHours,
      status: input.status,
      createdByUserId: ctx.userId,
    });

    await salaryStructureRepository.recordActivity({
      clubId: ctx.clubId,
      entityType: "salary_structure",
      entityId: created.id,
      action: "CREATED",
      actorUserId: ctx.userId,
      payloadAfter: {
        name: created.name,
        functional_role: created.functionalRole,
        activity_id: created.activityId,
        remuneration_type: created.remunerationType,
        workload_hours: created.workloadHours,
        status: created.status,
      },
    });

    return ok<{ structure: SalaryStructure }>("created", { structure: created });
  } catch (error) {
    if (isSalaryStructureRepositoryInfraError(error)) {
      console.error("[salary-structure-service.create]", error);
    }
    return err<{ structure: SalaryStructure }>("unknown_error");
  }
}

export async function updateSalaryStructure(
  structureId: string,
  raw: UpdateSalaryStructureRawInput,
): Promise<SalaryStructureActionResult<{ structure: SalaryStructure }>> {
  const guard = await guardMutate();
  if (!guard.ok) return err<{ structure: SalaryStructure }>(guard.code);
  const ctx = guard.context;

  const validation = validateUpdateInput(raw);
  if (!validation.ok) return err<{ structure: SalaryStructure }>(validation.code);
  const input = validation.input;

  try {
    const existing = await salaryStructureRepository.getById(ctx.clubId, structureId);
    if (!existing) return err<{ structure: SalaryStructure }>("structure_not_found");

    const isStatusChange = existing.status !== input.status;

    const updated = await salaryStructureRepository.update({
      structureId,
      clubId: ctx.clubId,
      updatedByUserId: ctx.userId,
      patch: {
        name: input.name,
        remunerationType: input.remunerationType,
        workloadHours: input.workloadHours,
        status: input.status,
      },
    });
    if (!updated) return err<{ structure: SalaryStructure }>("structure_not_found");

    // Audit: one entry for the UPDATE + another for STATUS_CHANGED if applicable.
    await salaryStructureRepository.recordActivity({
      clubId: ctx.clubId,
      entityType: "salary_structure",
      entityId: updated.id,
      action: isStatusChange ? "STATUS_CHANGED" : "UPDATED",
      actorUserId: ctx.userId,
      payloadBefore: {
        name: existing.name,
        remuneration_type: existing.remunerationType,
        workload_hours: existing.workloadHours,
        status: existing.status,
      },
      payloadAfter: {
        name: updated.name,
        remuneration_type: updated.remunerationType,
        workload_hours: updated.workloadHours,
        status: updated.status,
      },
    });

    return ok<{ structure: SalaryStructure }>(
      isStatusChange ? "status_changed" : "updated",
      { structure: updated },
    );
  } catch (error) {
    if (isSalaryStructureRepositoryInfraError(error)) {
      console.error("[salary-structure-service.update]", error);
    }
    return err<{ structure: SalaryStructure }>("unknown_error");
  }
}

// -------------------------------------------------------------------------
// Amount update (US-55)
// -------------------------------------------------------------------------

export type UpdateAmountRawInput = {
  amount?: unknown;
  effectiveDate?: unknown;
};

export async function updateSalaryStructureAmount(
  structureId: string,
  raw: UpdateAmountRawInput,
): Promise<SalaryStructureActionResult<{ versionId: string | null }>> {
  const guard = await guardMutate();
  if (!guard.ok) return err<{ versionId: string | null }>(guard.code);
  const ctx = guard.context;

  const amount = normalizeAmount(raw.amount);
  const effectiveDate = normalizeIsoDate(raw.effectiveDate);

  if (amount === null) return err<{ versionId: string | null }>("amount_required");
  if (amount <= 0) return err<{ versionId: string | null }>("amount_must_be_positive");
  if (!effectiveDate) return err<{ versionId: string | null }>("effective_date_required");

  try {
    const existing = await salaryStructureRepository.getById(ctx.clubId, structureId);
    if (!existing) return err<{ versionId: string | null }>("structure_not_found");

    const result = await salaryStructureRepository.updateCurrentAmount({
      clubId: ctx.clubId,
      structureId,
      newAmount: amount,
      effectiveDate,
      actorUserId: ctx.userId,
    });

    if (!result.ok) {
      // Map RPC error codes to our domain codes.
      switch (result.code) {
        case "structure_not_found":
          return err<{ versionId: string | null }>("structure_not_found");
        case "forbidden":
          return err<{ versionId: string | null }>("forbidden");
        case "amount_must_be_positive":
          return err<{ versionId: string | null }>("amount_must_be_positive");
        case "effective_date_required":
          return err<{ versionId: string | null }>("effective_date_required");
        case "current_version_not_found":
          return err<{ versionId: string | null }>("current_version_not_found");
        case "invalid_effective_date":
          return err<{ versionId: string | null }>("invalid_effective_date");
        default:
          return err<{ versionId: string | null }>("unknown_error");
      }
    }

    return ok<{ versionId: string | null }>("amount_updated", { versionId: result.versionId ?? null });
  } catch (error) {
    if (isSalaryStructureRepositoryInfraError(error)) {
      console.error("[salary-structure-service.update-amount]", error);
    }
    return err<{ versionId: string | null }>("unknown_error");
  }
}

// -------------------------------------------------------------------------
// Re-exports (normalizeFunctionalRole kept as thin passthrough to keep the
// service as the single import surface for the actions layer).
// -------------------------------------------------------------------------

export { normalizeFunctionalRole };
