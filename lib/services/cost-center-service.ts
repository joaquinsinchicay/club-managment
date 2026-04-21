/**
 * Service layer for Cost Centers (US-52 / US-53).
 *
 * Orchestrates:
 *  - Authorization (rol `tesoreria` del club activo).
 *  - Business-rule validation (required fields per type, unique name,
 *    date coherence, periodicity scoping, edit locks when the CC has
 *    linked movements).
 *  - Auto-close of `end_date` when transitioning to `inactivo`.
 *  - Append-only audit log (created / updated / closed).
 *  - Sync of movement ↔ cost-center links (US-53).
 *
 * The service returns discriminated results `{ ok, code }` so callers
 * (server actions, API routes) can translate to toast/flash feedback
 * without leaking DB details.
 */

import { parseLocalizedAmount } from "@/lib/amounts";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import type { Membership } from "@/lib/domain/access";
import { canMutateCostCenters, canAccessCostCenters } from "@/lib/domain/authorization";
import {
  type CostCenter,
  type CostCenterAggregates,
  type CostCenterAuditEntry,
  type CostCenterBadge,
  type CostCenterPeriodicity,
  type CostCenterStatus,
  type CostCenterType,
  computeBadges,
  isCostCenterPeriodicity,
  isCostCenterStatus,
  isCostCenterType,
  requiresAmount,
  requiresCurrency,
  requiresResponsible,
  resolveEndDateOnClose,
  supportsPeriodicity
} from "@/lib/domain/cost-center";
import {
  costCenterRepository,
  isCostCenterRepositoryInfraError,
  type ListCostCentersFilters
} from "@/lib/repositories/cost-center-repository";

// -------------------------------------------------------------------------
// Result codes
// -------------------------------------------------------------------------

export type CostCenterActionCode =
  | "forbidden"
  | "unauthenticated"
  | "no_active_club"
  | "created"
  | "updated"
  | "closed"
  | "not_found"
  | "movement_links_synced"
  | "movement_unlinked"
  | "name_required"
  | "type_required"
  | "status_required"
  | "start_date_required"
  | "currency_required"
  | "responsible_required"
  | "amount_required"
  | "invalid_type"
  | "invalid_status"
  | "invalid_periodicity"
  | "invalid_date_range"
  | "invalid_start_date"
  | "invalid_end_date"
  | "duplicate_name"
  | "locked_field_modified"
  | "cost_center_inactive"
  | "cost_center_not_found"
  | "movement_not_in_active_club"
  | "unknown_error";

export type CostCenterActionResult<T = void> =
  | { ok: true; code: CostCenterActionCode; data?: T }
  | { ok: false; code: CostCenterActionCode };

function ok<T>(code: CostCenterActionCode, data?: T): CostCenterActionResult<T> {
  return { ok: true, code, data };
}
function err<T = void>(code: CostCenterActionCode): CostCenterActionResult<T> {
  return { ok: false, code };
}

// -------------------------------------------------------------------------
// Auth helpers
// -------------------------------------------------------------------------

type GuardedContext = {
  userId: string;
  clubId: string;
  membership: Membership;
};

type GuardResult =
  | { ok: true; context: GuardedContext }
  | { ok: false; code: CostCenterActionCode };

async function guardMutate(): Promise<GuardResult> {
  const session = await getAuthenticatedSessionContext();
  if (!session) return { ok: false, code: "unauthenticated" };
  if (!session.activeClub || !session.activeMembership) {
    return { ok: false, code: "no_active_club" };
  }
  if (!canMutateCostCenters(session.activeMembership)) {
    return { ok: false, code: "forbidden" };
  }
  return {
    ok: true,
    context: {
      userId: session.user.id,
      clubId: session.activeClub.id,
      membership: session.activeMembership
    }
  };
}

async function guardRead(): Promise<GuardResult> {
  const session = await getAuthenticatedSessionContext();
  if (!session) return { ok: false, code: "unauthenticated" };
  if (!session.activeClub || !session.activeMembership) {
    return { ok: false, code: "no_active_club" };
  }
  if (!canAccessCostCenters(session.activeMembership)) {
    return { ok: false, code: "forbidden" };
  }
  return {
    ok: true,
    context: {
      userId: session.user.id,
      clubId: session.activeClub.id,
      membership: session.activeMembership
    }
  };
}

// -------------------------------------------------------------------------
// Normalizers
// -------------------------------------------------------------------------

function normalizeText(raw: unknown, maxLength: number): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
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
  if (typeof raw === "number") {
    return Number.isFinite(raw) && raw >= 0 ? raw : null;
  }
  if (typeof raw === "string") {
    const value = parseLocalizedAmount(raw);
    return value !== null && value >= 0 ? value : null;
  }
  return null;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// -------------------------------------------------------------------------
// Validation
// -------------------------------------------------------------------------

type ValidatedInput = {
  name: string;
  description: string | null;
  type: CostCenterType;
  status: CostCenterStatus;
  startDate: string;
  endDate: string | null;
  currencyCode: string | null;
  amount: number | null;
  periodicity: CostCenterPeriodicity | null;
  responsibleUserId: string | null;
};

const DEFAULT_CURRENCY_CODE = "ARS";

type RawInput = {
  name?: unknown;
  description?: unknown;
  type?: unknown;
  status?: unknown;
  startDate?: unknown;
  endDate?: unknown;
  currencyCode?: unknown;
  amount?: unknown;
  periodicity?: unknown;
  responsibleUserId?: unknown;
};

type ValidationResult =
  | { ok: true; input: ValidatedInput }
  | { ok: false; code: CostCenterActionCode };

function validateInput(
  raw: RawInput,
  options: { requireAll: boolean }
): ValidationResult {
  const name = normalizeText(raw.name, 120);
  const description = normalizeText(raw.description, 500);
  const typeRaw = typeof raw.type === "string" ? raw.type.trim() : "";
  const statusRaw = typeof raw.status === "string" ? raw.status.trim() : "";
  const currencyCode =
    typeof raw.currencyCode === "string" && raw.currencyCode.trim()
      ? raw.currencyCode.trim().toUpperCase()
      : null;
  const startDate = normalizeIsoDate(raw.startDate);
  const endDate =
    raw.endDate === null || raw.endDate === "" || raw.endDate === undefined
      ? null
      : normalizeIsoDate(raw.endDate);
  const amount = normalizeAmount(raw.amount);
  const periodicityRaw = typeof raw.periodicity === "string" ? raw.periodicity.trim() : null;
  const responsibleUserId =
    typeof raw.responsibleUserId === "string" && raw.responsibleUserId.trim()
      ? raw.responsibleUserId.trim()
      : null;

  if (!name) return { ok: false, code: "name_required" };
  if (!typeRaw) return { ok: false, code: "type_required" };
  if (!isCostCenterType(typeRaw)) return { ok: false, code: "invalid_type" };
  const type: CostCenterType = typeRaw;

  if (!statusRaw && options.requireAll) return { ok: false, code: "status_required" };
  if (statusRaw && !isCostCenterStatus(statusRaw)) return { ok: false, code: "invalid_status" };
  const status: CostCenterStatus = isCostCenterStatus(statusRaw) ? statusRaw : "activo";

  if (!startDate) {
    return {
      ok: false,
      code: options.requireAll ? "start_date_required" : "invalid_start_date"
    };
  }
  if (raw.endDate !== null && raw.endDate !== "" && raw.endDate !== undefined && !endDate) {
    return { ok: false, code: "invalid_end_date" };
  }
  if (endDate && endDate < startDate) return { ok: false, code: "invalid_date_range" };

  if (requiresCurrency(type) && !currencyCode) {
    return { ok: false, code: "currency_required" };
  }
  if (requiresResponsible(type) && !responsibleUserId) {
    return { ok: false, code: "responsible_required" };
  }

  if (requiresAmount(type) && amount === null) return { ok: false, code: "amount_required" };

  let periodicity: CostCenterPeriodicity | null = null;
  if (supportsPeriodicity(type)) {
    if (periodicityRaw) {
      if (!isCostCenterPeriodicity(periodicityRaw)) {
        return { ok: false, code: "invalid_periodicity" };
      }
      periodicity = periodicityRaw;
    }
  }

  return {
    ok: true,
    input: {
      name,
      description,
      type,
      status,
      startDate,
      endDate,
      currencyCode,
      amount,
      periodicity,
      responsibleUserId
    }
  };
}

// -------------------------------------------------------------------------
// Public queries
// -------------------------------------------------------------------------

export type ListCostCentersResult =
  | {
      ok: true;
      costCenters: CostCenter[];
      aggregates: Map<string, CostCenterAggregates>;
      badges: Map<string, CostCenterBadge[]>;
    }
  | { ok: false; code: CostCenterActionCode };

export async function listCostCentersForActiveClub(
  filters: ListCostCentersFilters = {}
): Promise<ListCostCentersResult> {
  const guard = await guardRead();
  if (!guard.ok) return { ok: false, code: guard.code };
  const ctx = guard.context;

  try {
    const [costCenters, aggregates] = await Promise.all([
      costCenterRepository.listForClub(ctx.clubId, filters),
      costCenterRepository.getAggregatesForClub(ctx.clubId)
    ]);

    const today = todayIso();
    const badges = new Map<string, CostCenterBadge[]>();
    for (const cc of costCenters) {
      const agg = aggregates.get(cc.id) ?? {
        costCenterId: cc.id,
        totalIngreso: 0,
        totalEgreso: 0,
        linkedMovementCount: 0
      };
      badges.set(cc.id, computeBadges({ costCenter: cc, aggregates: agg, today }));
    }

    return { ok: true, costCenters, aggregates, badges };
  } catch (error) {
    if (isCostCenterRepositoryInfraError(error)) {
      console.error("[cost-center-service.list]", error);
    }
    return { ok: false, code: "unknown_error" };
  }
}

export type CostCenterMovement = {
  movementId: string;
  movementDate: string;
  movementType: "ingreso" | "egreso";
  accountId: string;
  accountName: string;
  categoryName: string | null;
  concept: string | null;
  currencyCode: string;
  amount: number;
};

export type CostCenterDetail = {
  costCenter: CostCenter;
  aggregates: CostCenterAggregates;
  badges: CostCenterBadge[];
  auditLog: CostCenterAuditEntry[];
  movements: CostCenterMovement[];
  hasLinkedMovements: boolean;
};

export async function getCostCenterDetail(
  costCenterId: string
): Promise<CostCenterActionResult<CostCenterDetail>> {
  const guard = await guardRead();
  if (!guard.ok) return err<CostCenterDetail>(guard.code);
  const ctx = guard.context;

  try {
    const costCenter = await costCenterRepository.getById(ctx.clubId, costCenterId);
    if (!costCenter) return err<CostCenterDetail>("cost_center_not_found");

    const [aggregatesMap, auditLog, movements, hasLinkedMovements] = await Promise.all([
      costCenterRepository.getAggregatesForClub(ctx.clubId),
      costCenterRepository.listAuditForCostCenter(ctx.clubId, costCenterId),
      costCenterRepository.listMovementsForCostCenter(ctx.clubId, costCenterId),
      costCenterRepository.hasLinkedMovements(costCenterId)
    ]);

    const aggregates = aggregatesMap.get(costCenterId) ?? {
      costCenterId,
      totalIngreso: 0,
      totalEgreso: 0,
      linkedMovementCount: 0
    };
    const badges = computeBadges({
      costCenter,
      aggregates,
      today: todayIso()
    });

    return ok<CostCenterDetail>("updated", {
      costCenter,
      aggregates,
      badges,
      auditLog,
      movements,
      hasLinkedMovements
    });
  } catch (error) {
    if (isCostCenterRepositoryInfraError(error)) {
      console.error("[cost-center-service.detail]", error);
    }
    return err<CostCenterDetail>("unknown_error");
  }
}

// -------------------------------------------------------------------------
// Create
// -------------------------------------------------------------------------

export async function createCostCenter(
  raw: RawInput
): Promise<CostCenterActionResult<{ costCenter: CostCenter }>> {
  type Result = CostCenterActionResult<{ costCenter: CostCenter }>;
  const guard = await guardMutate();
  if (!guard.ok) return err<{ costCenter: CostCenter }>(guard.code);
  const ctx = guard.context;

  const validation = validateInput(raw, { requireAll: true });
  if (!validation.ok) return err<{ costCenter: CostCenter }>(validation.code);
  const input = validation.input;

  try {
    const duplicate = await costCenterRepository.existsByName({
      clubId: ctx.clubId,
      name: input.name
    });
    if (duplicate) return err<{ costCenter: CostCenter }>("duplicate_name");

    const created = await costCenterRepository.create({
      clubId: ctx.clubId,
      name: input.name,
      description: input.description,
      type: input.type,
      status: input.status,
      startDate: input.startDate,
      endDate: input.endDate,
      currencyCode: input.currencyCode ?? DEFAULT_CURRENCY_CODE,
      amount: input.amount,
      periodicity: input.periodicity,
      responsibleUserId: input.responsibleUserId,
      createdByUserId: ctx.userId
    });

    await costCenterRepository.recordAudit({
      costCenterId: created.id,
      actorUserId: ctx.userId,
      actionType: "created",
      payloadAfter: serializeCostCenter(created)
    });

    return ok<{ costCenter: CostCenter }>("created", { costCenter: created });
  } catch (error) {
    if (isCostCenterRepositoryInfraError(error)) {
      console.error("[cost-center-service.create]", error);
    }
    return err<{ costCenter: CostCenter }>("unknown_error");
  }
}

// -------------------------------------------------------------------------
// Update
// -------------------------------------------------------------------------

export async function updateCostCenter(
  costCenterId: string,
  raw: RawInput
): Promise<CostCenterActionResult<{ costCenter: CostCenter }>> {
  const guard = await guardMutate();
  if (!guard.ok) return err<{ costCenter: CostCenter }>(guard.code);
  const ctx = guard.context;

  const validation = validateInput(raw, { requireAll: true });
  if (!validation.ok) return err<{ costCenter: CostCenter }>(validation.code);
  const input = validation.input;

  try {
    const existing = await costCenterRepository.getById(ctx.clubId, costCenterId);
    if (!existing) return err<{ costCenter: CostCenter }>("cost_center_not_found");

    const duplicate = await costCenterRepository.existsByName({
      clubId: ctx.clubId,
      name: input.name,
      excludingCostCenterId: costCenterId
    });
    if (duplicate) return err<{ costCenter: CostCenter }>("duplicate_name");

    // Preserve legacy values for fields that the form may omit when the new
    // type does not require them (currency, responsible). This avoids losing
    // data on tipo transitions like Sponsor → Jornada.
    const effectiveCurrencyCode =
      input.currencyCode ?? existing.currencyCode ?? DEFAULT_CURRENCY_CODE;
    const effectiveResponsibleUserId =
      input.responsibleUserId ?? existing.responsibleUserId;

    const hasLinks = await costCenterRepository.hasLinkedMovements(costCenterId);
    if (hasLinks) {
      if (input.type !== existing.type) return err<{ costCenter: CostCenter }>("locked_field_modified");
      if (effectiveCurrencyCode !== existing.currencyCode)
        return err<{ costCenter: CostCenter }>("locked_field_modified");
      if (input.startDate !== existing.startDate)
        return err<{ costCenter: CostCenter }>("locked_field_modified");
    }

    // Auto-close end_date when the user transitions to `inactivo`.
    let effectiveEndDate = input.endDate;
    let isClosing = false;
    if (existing.status === "activo" && input.status === "inactivo") {
      isClosing = true;
      effectiveEndDate = resolveEndDateOnClose({
        currentEndDate: input.endDate,
        today: todayIso()
      });
    }

    const updated = await costCenterRepository.update({
      costCenterId,
      clubId: ctx.clubId,
      updatedByUserId: ctx.userId,
      patch: {
        name: input.name,
        description: input.description,
        type: input.type,
        status: input.status,
        startDate: input.startDate,
        endDate: effectiveEndDate,
        currencyCode: effectiveCurrencyCode,
        amount: input.amount,
        periodicity: input.periodicity,
        responsibleUserId: effectiveResponsibleUserId
      }
    });
    if (!updated) return err<{ costCenter: CostCenter }>("cost_center_not_found");

    // Append one audit row per changed field.
    const diffs = computeDiff(existing, updated);
    for (const diff of diffs) {
      await costCenterRepository.recordAudit({
        costCenterId: updated.id,
        actorUserId: ctx.userId,
        actionType: isClosing && diff.field === "status" ? "closed" : "updated",
        field: diff.field,
        oldValue: diff.oldValue,
        newValue: diff.newValue
      });
    }

    return ok<{ costCenter: CostCenter }>(isClosing ? "closed" : "updated", {
      costCenter: updated
    });
  } catch (error) {
    if (isCostCenterRepositoryInfraError(error)) {
      console.error("[cost-center-service.update]", error);
    }
    return err<{ costCenter: CostCenter }>("unknown_error");
  }
}

// -------------------------------------------------------------------------
// Movement links (US-53)
// -------------------------------------------------------------------------

export async function syncMovementCostCenterLinks(input: {
  movementId: string;
  costCenterIds: string[];
}): Promise<CostCenterActionResult<{ added: string[]; removed: string[] }>> {
  type Data = { added: string[]; removed: string[] };
  const guard = await guardMutate();
  if (!guard.ok) return err<Data>(guard.code);
  const ctx = guard.context;

  try {
    // Validate that every requested CC belongs to the active club AND is active.
    // CC inactivos no deben aparecer como opciones nuevas; se permite mantener
    // enlaces previos (esta sync reemplaza la selección completa, por lo tanto
    // la semántica acá es restrictiva y coherente con el selector).
    const uniqueIds = [...new Set(input.costCenterIds.filter(Boolean))];

    if (uniqueIds.length > 0) {
      const costCenters = await Promise.all(
        uniqueIds.map((id) => costCenterRepository.getById(ctx.clubId, id))
      );

      for (const cc of costCenters) {
        if (!cc) return err<Data>("cost_center_not_found");
        if (cc.status !== "activo") return err<Data>("cost_center_inactive");
      }
    }

    const { added, removed } = await costCenterRepository.syncLinksForMovement({
      clubId: ctx.clubId,
      movementId: input.movementId,
      costCenterIds: uniqueIds,
      createdByUserId: ctx.userId
    });

    return ok<Data>("movement_links_synced", { added, removed });
  } catch (error) {
    if (isCostCenterRepositoryInfraError(error)) {
      console.error("[cost-center-service.sync_links]", error);
    }
    return err<Data>("unknown_error");
  }
}

export async function unlinkMovementFromCostCenter(input: {
  movementId: string;
  costCenterId: string;
}): Promise<CostCenterActionResult> {
  const guard = await guardMutate();
  if (!guard.ok) return err(guard.code);
  const ctx = guard.context;

  try {
    const removed = await costCenterRepository.unlinkMovement({
      clubId: ctx.clubId,
      movementId: input.movementId,
      costCenterId: input.costCenterId
    });

    if (!removed) return err("not_found");
    return ok("movement_unlinked");
  } catch (error) {
    if (isCostCenterRepositoryInfraError(error)) {
      console.error("[cost-center-service.unlink]", error);
    }
    return err("unknown_error");
  }
}

// -------------------------------------------------------------------------
// Helpers
// -------------------------------------------------------------------------

function serializeCostCenter(cc: CostCenter): Record<string, unknown> {
  return {
    id: cc.id,
    name: cc.name,
    description: cc.description,
    type: cc.type,
    status: cc.status,
    startDate: cc.startDate,
    endDate: cc.endDate,
    currencyCode: cc.currencyCode,
    amount: cc.amount,
    periodicity: cc.periodicity,
    responsibleUserId: cc.responsibleUserId
  };
}

type Diff = { field: string; oldValue: string | null; newValue: string | null };

function toAuditString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value;
  return String(value);
}

function computeDiff(prev: CostCenter, next: CostCenter): Diff[] {
  const tracked: Array<keyof CostCenter> = [
    "name",
    "description",
    "type",
    "status",
    "startDate",
    "endDate",
    "currencyCode",
    "amount",
    "periodicity",
    "responsibleUserId"
  ];

  const diffs: Diff[] = [];
  for (const field of tracked) {
    const prevValue = prev[field];
    const nextValue = next[field];
    if (prevValue !== nextValue) {
      diffs.push({
        field: field as string,
        oldValue: toAuditString(prevValue),
        newValue: toAuditString(nextValue)
      });
    }
  }
  return diffs;
}
