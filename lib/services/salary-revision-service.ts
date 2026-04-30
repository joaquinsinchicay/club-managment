/**
 * Service layer para Revisiones Salariales (US-34 / US-35).
 *
 * Orquesta:
 *  - Autorización (canMutateHrMasters → solo rrhh).
 *  - Validación de inputs (monto > 0, fecha válida, motivo para masiva).
 *  - Delegación a las RPCs SECURITY DEFINER del repositorio.
 *  - Mapeo de códigos RPC → action codes del dominio.
 */

import { parseLocalizedAmount } from "@/lib/amounts";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canMutateHrMasters } from "@/lib/domain/authorization";
import {
  isSalaryRevisionAdjustmentType,
  type SalaryRevisionAdjustmentType,
  type StaffContractRevision,
} from "@/lib/domain/staff-contract-revision";
import {
  isStaffContractRevisionRepositoryInfraError,
  staffContractRevisionRepository,
} from "@/lib/repositories/staff-contract-revision-repository";
import { logger } from "@/lib/logger";

// -------------------------------------------------------------------------
// Result codes
// -------------------------------------------------------------------------

export type SalaryRevisionActionCode =
  | "unauthenticated"
  | "no_active_club"
  | "forbidden"
  | "revision_created"
  | "bulk_created"
  | "contract_not_found"
  | "contract_not_active"
  | "amount_required"
  | "amount_must_be_positive"
  | "effective_date_required"
  | "invalid_effective_date"
  | "no_contracts_selected"
  | "reason_required"
  | "value_required"
  | "value_must_be_positive"
  | "invalid_adjustment_type"
  | "current_revision_not_found"
  | "unknown_error";

export type SalaryRevisionActionResult<T = void> =
  | { ok: true; code: SalaryRevisionActionCode; data?: T }
  | { ok: false; code: SalaryRevisionActionCode };

function ok<T>(code: SalaryRevisionActionCode, data?: T): SalaryRevisionActionResult<T> {
  return { ok: true, code, data };
}
function err<T = void>(code: SalaryRevisionActionCode): SalaryRevisionActionResult<T> {
  return { ok: false, code };
}

// -------------------------------------------------------------------------
// Auth + context
// -------------------------------------------------------------------------

type GuardedContext = { userId: string; clubId: string };
async function guardMutate():
  Promise<{ ok: true; context: GuardedContext } | { ok: false; code: SalaryRevisionActionCode }> {
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
    context: { userId: session.user.id, clubId: session.activeClub.id },
  };
}

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function normalizeAmount(raw: unknown): number | null {
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw === "number") return Number.isFinite(raw) ? raw : null;
  if (typeof raw === "string") return parseLocalizedAmount(raw);
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

function normalizeText(raw: unknown, maxLength: number): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function mapRpcCode(code: string): SalaryRevisionActionCode {
  switch (code) {
    case "revision_created":
      return "revision_created";
    case "bulk_created":
      return "bulk_created";
    case "contract_not_found":
      return "contract_not_found";
    case "contract_not_active":
      return "contract_not_active";
    case "amount_must_be_positive":
      return "amount_must_be_positive";
    case "effective_date_required":
      return "effective_date_required";
    case "invalid_effective_date":
      return "invalid_effective_date";
    case "no_contracts_selected":
      return "no_contracts_selected";
    case "reason_required":
      return "reason_required";
    case "value_required":
      return "value_required";
    case "value_must_be_positive":
      return "value_must_be_positive";
    case "current_revision_not_found":
      return "current_revision_not_found";
    case "forbidden":
      return "forbidden";
    default:
      return "unknown_error";
  }
}

// -------------------------------------------------------------------------
// Queries
// -------------------------------------------------------------------------

export async function listRevisionsForContract(
  contractId: string,
): Promise<SalaryRevisionActionResult<{ revisions: StaffContractRevision[] }>> {
  const guard = await guardMutate();
  if (!guard.ok) return err<{ revisions: StaffContractRevision[] }>(guard.code);
  const ctx = guard.context;
  try {
    const revisions = await staffContractRevisionRepository.listForContract(
      ctx.clubId,
      contractId,
    );
    return ok<{ revisions: StaffContractRevision[] }>("revision_created", { revisions });
  } catch (error) {
    if (isStaffContractRevisionRepositoryInfraError(error)) {
      logger.error("[salary-revision-service.list]", error);
    }
    return err<{ revisions: StaffContractRevision[] }>("unknown_error");
  }
}

// -------------------------------------------------------------------------
// Mutations
// -------------------------------------------------------------------------

export type CreateSalaryRevisionRawInput = {
  amount?: unknown;
  effectiveDate?: unknown;
  reason?: unknown;
};

export async function createSalaryRevision(
  contractId: string,
  raw: CreateSalaryRevisionRawInput,
): Promise<SalaryRevisionActionResult<{ revisionId: string | null }>> {
  const guard = await guardMutate();
  if (!guard.ok) return err<{ revisionId: string | null }>(guard.code);
  const ctx = guard.context;

  const amount = normalizeAmount(raw.amount);
  const effectiveDate = normalizeIsoDate(raw.effectiveDate);
  const reason = normalizeText(raw.reason, 500);

  if (amount === null) return err<{ revisionId: string | null }>("amount_required");
  if (amount <= 0) return err<{ revisionId: string | null }>("amount_must_be_positive");
  if (!effectiveDate) return err<{ revisionId: string | null }>("effective_date_required");

  try {
    const result = await staffContractRevisionRepository.createRevision({
      clubId: ctx.clubId,
      contractId,
      amount,
      effectiveDate,
      reason,
    });

    if (!result.ok) {
      return err<{ revisionId: string | null }>(mapRpcCode(result.code));
    }
    return ok<{ revisionId: string | null }>("revision_created", {
      revisionId: result.revisionId,
    });
  } catch (error) {
    if (isStaffContractRevisionRepositoryInfraError(error)) {
      logger.error("[salary-revision-service.create]", error);
    }
    return err<{ revisionId: string | null }>("unknown_error");
  }
}

export type CreateBulkSalaryRevisionRawInput = {
  contractIds?: unknown;
  adjustmentType?: unknown;
  value?: unknown;
  effectiveDate?: unknown;
  reason?: unknown;
};

export async function createBulkSalaryRevision(
  raw: CreateBulkSalaryRevisionRawInput,
): Promise<
  SalaryRevisionActionResult<{
    createdCount: number;
    created: Array<{
      contractId: string;
      revisionId: string;
      previousAmount: number;
      newAmount: number;
    }>;
  }>
> {
  const guard = await guardMutate();
  if (!guard.ok) {
    return err<{
      createdCount: number;
      created: Array<{
        contractId: string;
        revisionId: string;
        previousAmount: number;
        newAmount: number;
      }>;
    }>(guard.code);
  }
  const ctx = guard.context;

  const contractIdsRaw = Array.isArray(raw.contractIds) ? raw.contractIds : [];
  const contractIds = contractIdsRaw.filter(
    (id): id is string => typeof id === "string" && id.length > 0,
  );
  const adjustmentTypeRaw =
    typeof raw.adjustmentType === "string" ? raw.adjustmentType.trim() : "";
  const value = normalizeAmount(raw.value);
  const effectiveDate = normalizeIsoDate(raw.effectiveDate);
  const reason = normalizeText(raw.reason, 500);

  if (contractIds.length === 0) {
    return err("no_contracts_selected");
  }
  if (!isSalaryRevisionAdjustmentType(adjustmentTypeRaw)) {
    return err("invalid_adjustment_type");
  }
  if (value === null) return err("value_required");
  if (adjustmentTypeRaw === "set" && value <= 0) {
    return err("value_must_be_positive");
  }
  if (!effectiveDate) return err("effective_date_required");
  if (!reason) return err("reason_required");

  try {
    const result = await staffContractRevisionRepository.bulkRevision({
      clubId: ctx.clubId,
      contractIds,
      adjustmentType: adjustmentTypeRaw as SalaryRevisionAdjustmentType,
      value,
      effectiveDate,
      reason,
    });

    if (!result.ok) {
      return err(mapRpcCode(result.code));
    }
    return ok("bulk_created", {
      createdCount: result.createdCount,
      created: result.created,
    });
  } catch (error) {
    if (isStaffContractRevisionRepositoryInfraError(error)) {
      logger.error("[salary-revision-service.bulk]", error);
    }
    return err("unknown_error");
  }
}
