/**
 * Domain entity and pure helpers for Salary Structures (US-54 / US-55).
 *
 * A salary structure represents a paid position in the club defined by
 * `functional_role × activity × remuneration_type`. Each structure has a
 * versioned amount history (`salary_structure_versions`): only one version
 * can be current at any time (enforced by a partial unique index on
 * `end_date is null`). Updates to the amount close the current version and
 * open a new one with the new amount and effective date.
 *
 * This module is intentionally effect-free: it exposes enums, types and
 * pure helpers used by the UI, the service layer and the repository.
 */

export const SALARY_REMUNERATION_TYPES = [
  "mensual_fijo",
  "por_hora",
  "por_clase",
] as const;
export type SalaryRemunerationType = (typeof SALARY_REMUNERATION_TYPES)[number];

export const SALARY_STRUCTURE_STATUSES = ["activa", "inactiva"] as const;
export type SalaryStructureStatus = (typeof SALARY_STRUCTURE_STATUSES)[number];

export type SalaryStructure = {
  id: string;
  clubId: string;
  name: string;
  functionalRole: string;
  activityId: string;
  activityName: string | null;
  remunerationType: SalaryRemunerationType;
  workloadHours: number | null;
  status: SalaryStructureStatus;
  currentAmount: number | null;
  currentVersionId: string | null;
  hasActiveContract: boolean;
  activeContractId: string | null;
  activeContractStaffName: string | null;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string | null;
  updatedByUserId: string | null;
};

export type SalaryStructureVersion = {
  id: string;
  salaryStructureId: string;
  amount: number;
  startDate: string;
  endDate: string | null;
  createdAt: string;
  createdByUserId: string | null;
};

export function isSalaryRemunerationType(
  value: unknown,
): value is SalaryRemunerationType {
  return (
    typeof value === "string" &&
    (SALARY_REMUNERATION_TYPES as readonly string[]).includes(value)
  );
}

export function isSalaryStructureStatus(
  value: unknown,
): value is SalaryStructureStatus {
  return (
    typeof value === "string" &&
    (SALARY_STRUCTURE_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Normalizes a free-text functional role for dedup comparisons.
 * The DB unique index uses `lower(trim(...))`. We mirror it client-side so
 * the service layer can reject duplicates before round-tripping.
 */
export function normalizeFunctionalRole(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Pretty label for a remuneration type. Consumers should prefer
 * `texts.rrhh.salary_structures.remuneration_type_options[...]` but this
 * helper covers places where i18n is not available (logs, tests).
 */
export function remunerationTypeShortLabel(type: SalaryRemunerationType): string {
  switch (type) {
    case "mensual_fijo":
      return "Mensual fijo";
    case "por_hora":
      return "Por hora";
    case "por_clase":
      return "Por clase";
  }
}

/**
 * Whether workload hours are semantically relevant for the remuneration
 * type. We always persist whatever the user sends (null allowed) but this
 * helper is used by the UI to hint the field.
 */
export function requiresWorkloadHours(type: SalaryRemunerationType): boolean {
  return type === "por_hora" || type === "por_clase";
}
