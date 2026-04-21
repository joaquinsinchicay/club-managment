/**
 * Domain entity and pure helpers for Cost Centers (US-52 / US-53).
 *
 * Cost centers are a parallel imputation dimension for treasury movements.
 * They group economic commitments bounded in time (debts, events, budgets,
 * sponsors, advertising) so Tesorería can track execution against a target
 * amount and close the concept when the commitment is fulfilled.
 *
 * This module contains:
 *  - Type definitions aligned with the DB enums.
 *  - Pure helpers used by the UI, the service layer and the repository.
 *
 * Any effectful logic (persistence, RLS, auth) lives in repositories and
 * services.
 */

export const COST_CENTER_TYPES = [
  "deuda",
  "evento",
  "jornada",
  "presupuesto",
  "publicidad",
  "sponsor"
] as const;

export type CostCenterType = (typeof COST_CENTER_TYPES)[number];

export const COST_CENTER_STATUSES = ["activo", "inactivo"] as const;
export type CostCenterStatus = (typeof COST_CENTER_STATUSES)[number];

export const COST_CENTER_PERIODICITIES = [
  "unico",
  "mensual",
  "trimestral",
  "semestral",
  "anual"
] as const;
export type CostCenterPeriodicity = (typeof COST_CENTER_PERIODICITIES)[number];

/**
 * Types where `amount` is mandatory (deuda, presupuesto, publicidad, sponsor).
 * `evento` and `jornada` accept a nullable amount.
 */
export const COST_CENTER_TYPES_REQUIRING_AMOUNT: readonly CostCenterType[] = [
  "deuda",
  "presupuesto",
  "publicidad",
  "sponsor"
];

/**
 * Types where `periodicity` is visible and persistable.
 * For the rest the field is hidden and stored as null.
 */
export const COST_CENTER_TYPES_SUPPORTING_PERIODICITY: readonly CostCenterType[] = [
  "presupuesto",
  "publicidad",
  "sponsor"
];

/**
 * Types where `currency_code` must be elicited from the user and is
 * mandatory in the form. For the rest the field is hidden and the system
 * persists a default currency (resolved by the caller).
 */
export const COST_CENTER_TYPES_REQUIRING_CURRENCY: readonly CostCenterType[] = [
  "deuda",
  "presupuesto",
  "publicidad",
  "sponsor"
];

/**
 * Types where `responsible_user_id` is visible and mandatory. For the rest
 * the field is hidden and the value is left null on create (or preserved on
 * edit if a previous value existed).
 */
export const COST_CENTER_TYPES_REQUIRING_RESPONSIBLE: readonly CostCenterType[] = [
  "deuda",
  "presupuesto"
];

export type CostCenter = {
  id: string;
  clubId: string;
  name: string;
  description: string | null;
  type: CostCenterType;
  status: CostCenterStatus;
  startDate: string;
  endDate: string | null;
  currencyCode: string;
  amount: number | null;
  periodicity: CostCenterPeriodicity | null;
  responsibleUserId: string | null;
  createdByUserId: string | null;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type CostCenterAggregates = {
  costCenterId: string;
  totalIngreso: number;
  totalEgreso: number;
  linkedMovementCount: number;
};

export type CostCenterBadgeKind =
  | "debt_settled"
  | "budget_near_limit"
  | "budget_exceeded"
  | "goal_met"
  | "overdue";

export type CostCenterBadge = {
  kind: CostCenterBadgeKind;
};

export type CostCenterAuditActionType = "created" | "updated" | "closed";

export type CostCenterAuditEntry = {
  id: string;
  costCenterId: string;
  actorUserId: string | null;
  actionType: CostCenterAuditActionType;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  payloadBefore: Record<string, unknown> | null;
  payloadAfter: Record<string, unknown> | null;
  changedAt: string;
};

export type CostCenterMovementLink = {
  movementId: string;
  costCenterId: string;
  createdAt: string;
  createdByUserId: string | null;
};

// -------------------------------------------------------------------------
// Pure helpers (US-52)
// -------------------------------------------------------------------------

export function isCostCenterType(value: unknown): value is CostCenterType {
  return typeof value === "string" && (COST_CENTER_TYPES as readonly string[]).includes(value);
}

export function isCostCenterStatus(value: unknown): value is CostCenterStatus {
  return typeof value === "string" && (COST_CENTER_STATUSES as readonly string[]).includes(value);
}

export function isCostCenterPeriodicity(value: unknown): value is CostCenterPeriodicity {
  return (
    typeof value === "string" && (COST_CENTER_PERIODICITIES as readonly string[]).includes(value)
  );
}

export function requiresAmount(type: CostCenterType): boolean {
  return COST_CENTER_TYPES_REQUIRING_AMOUNT.includes(type);
}

export function supportsPeriodicity(type: CostCenterType): boolean {
  return COST_CENTER_TYPES_SUPPORTING_PERIODICITY.includes(type);
}

export function requiresCurrency(type: CostCenterType): boolean {
  return COST_CENTER_TYPES_REQUIRING_CURRENCY.includes(type);
}

export function requiresResponsible(type: CostCenterType): boolean {
  return COST_CENTER_TYPES_REQUIRING_RESPONSIBLE.includes(type);
}

/**
 * Returns the date (ISO `YYYY-MM-DD`) to persist as `end_date` when the user
 * transitions the CC from `activo` to `inactivo`.
 *
 * Rules (PDD US-52 § 8 / Scenarios 15–16):
 *  - If end_date is empty OR in the future, autocomplete with `today`.
 *  - If end_date already exists and is ≤ today, keep it.
 */
export function resolveEndDateOnClose(params: {
  currentEndDate: string | null;
  today: string; // ISO YYYY-MM-DD
}): string {
  const { currentEndDate, today } = params;

  if (!currentEndDate) {
    return today;
  }

  // Lexical comparison is safe for ISO YYYY-MM-DD strings.
  if (currentEndDate > today) {
    return today;
  }

  return currentEndDate;
}

/**
 * Fields that become read-only when the CC already has linked movements.
 * The rest (name, description, status, end_date, amount, periodicity,
 * responsible_user_id) remain editable.
 */
export const COST_CENTER_LOCKED_FIELDS_WHEN_LINKED = [
  "type",
  "currencyCode",
  "startDate"
] as const;

export type CostCenterLockedField = (typeof COST_CENTER_LOCKED_FIELDS_WHEN_LINKED)[number];

export function isFieldLockedWhenLinked(field: string): field is CostCenterLockedField {
  return (COST_CENTER_LOCKED_FIELDS_WHEN_LINKED as readonly string[]).includes(field);
}

// -------------------------------------------------------------------------
// Badge computation (US-52 § 8)
// -------------------------------------------------------------------------

/**
 * Computes the visual badges that should render on a cost center row, given
 * the aggregates of its linked movements and the current date.
 *
 * Rules:
 *  - `debt_settled`          → type = deuda         & Σegresos ≥ amount.
 *  - `budget_near_limit`     → type = presupuesto   & 80% ≤ ratio < 100%.
 *  - `budget_exceeded`       → type = presupuesto   & ratio ≥ 100%.
 *  - `goal_met`              → type ∈ {sponsor,publicidad} & Σingresos ≥ amount.
 *  - `overdue`               → status = activo       & end_date < today.
 *
 * Amounts are summed directly — no currency conversion (see PDD § 8).
 */
export function computeBadges(params: {
  costCenter: Pick<CostCenter, "type" | "status" | "amount" | "endDate">;
  aggregates: Pick<CostCenterAggregates, "totalIngreso" | "totalEgreso">;
  today: string;
}): CostCenterBadge[] {
  const { costCenter, aggregates, today } = params;
  const badges: CostCenterBadge[] = [];

  const amount = costCenter.amount;
  const hasAmount = typeof amount === "number" && amount > 0;

  if (costCenter.type === "deuda" && hasAmount && aggregates.totalEgreso >= amount) {
    badges.push({ kind: "debt_settled" });
  }

  if (costCenter.type === "presupuesto" && hasAmount) {
    const ratio = aggregates.totalEgreso / amount;
    if (ratio >= 1) {
      badges.push({ kind: "budget_exceeded" });
    } else if (ratio >= 0.8) {
      badges.push({ kind: "budget_near_limit" });
    }
  }

  if (
    (costCenter.type === "sponsor" || costCenter.type === "publicidad") &&
    hasAmount &&
    aggregates.totalIngreso >= amount
  ) {
    badges.push({ kind: "goal_met" });
  }

  if (
    costCenter.status === "activo" &&
    costCenter.endDate !== null &&
    costCenter.endDate < today
  ) {
    badges.push({ kind: "overdue" });
  }

  return badges;
}

/**
 * Normalizes a free-form string to the canonical form used for uniqueness
 * comparison at application level (case-insensitive, trimmed). The DB
 * enforces the same via a unique index on `(club_id, lower(trim(name)))`.
 */
export function normalizeCostCenterName(raw: string): string {
  return raw.trim().toLocaleLowerCase("es-AR");
}
