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

/**
 * Catalogo cerrado de roles funcionales. La UI renderiza este listado como
 * un select y el service valida que `functional_role` sea uno de estos
 * valores antes de persistir. Cambiar este listado requiere coordinar con
 * reports/liquidaciones que proyectan la columna `functional_role`.
 */
/**
 * Catalogo cerrado de divisiones/categorias deportivas del club. Una
 * estructura salarial puede aplicar a varias divisiones (ej. DT 4ta+5ta+6ta).
 * El orden del array importa para la unicidad: dos estructuras con las
 * mismas divisiones en distinto orden siguen siendo la misma combinacion
 * — la UI siempre ordena segun este catalogo antes de persistir.
 */
export const SALARY_DIVISIONS = [
  "1ra",
  "3ra",
  "4ta",
  "5ta",
  "6ta",
  "7ma",
  "8va",
  "2012",
  "2013",
  "2014",
  "2015",
  "2016",
  "2017",
  "2018",
  "2019",
  "Senior",
] as const;
export type SalaryDivision = (typeof SALARY_DIVISIONS)[number];

export function isSalaryDivision(value: unknown): value is SalaryDivision {
  return (
    typeof value === "string" && (SALARY_DIVISIONS as readonly string[]).includes(value)
  );
}

/**
 * Naturaleza contable del pago. Complemento de `remuneration_type` (que
 * define la mecanica: mensual_fijo, por_hora, por_clase). Ambas coexisten
 * porque un Sueldo puede ser mensual_fijo o por_hora, y un Viatico puede
 * ser por_clase — son dimensiones independientes.
 */
export const SALARY_PAYMENT_TYPES = ["sueldo", "viatico", "honorarios"] as const;
export type SalaryPaymentType = (typeof SALARY_PAYMENT_TYPES)[number];

export function isSalaryPaymentType(value: unknown): value is SalaryPaymentType {
  return (
    typeof value === "string" && (SALARY_PAYMENT_TYPES as readonly string[]).includes(value)
  );
}

/**
 * Ordena divisiones segun el catalogo canonico para que la unicidad
 * (rol + divisiones + actividad) sea estable independientemente del orden
 * de seleccion en la UI.
 */
export function sortDivisions(divisions: readonly SalaryDivision[]): SalaryDivision[] {
  const indexOf = (d: SalaryDivision) => SALARY_DIVISIONS.indexOf(d);
  return [...divisions].sort((a, b) => indexOf(a) - indexOf(b));
}

export const FUNCTIONAL_ROLES = [
  "Abogado",
  "Administrativo",
  "Analista de Vídeo",
  "Ayudante de Campo",
  "Ayudante de Preparador Físico",
  "Contador",
  "Coordinador",
  "Delegado",
  "Director Técnico",
  "Entrenador de Arqueros",
  "Intendente",
  "Jugador",
  "Kinesiólogo",
  "Médico",
  "Nutricionista",
  "Personal de Limpieza",
  "Prensa",
  "Preparador Físico",
  "Profesor",
  "Psicólogo Deportivo",
  "Sereno / Seguridad",
  "Utilero",
] as const;
export type FunctionalRole = (typeof FUNCTIONAL_ROLES)[number];

export function isFunctionalRole(value: unknown): value is FunctionalRole {
  return (
    typeof value === "string" && (FUNCTIONAL_ROLES as readonly string[]).includes(value)
  );
}

export type SalaryStructure = {
  id: string;
  clubId: string;
  name: string;
  functionalRole: string;
  activityId: string | null;
  activityName: string | null;
  divisions: SalaryDivision[];
  paymentType: SalaryPaymentType;
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

/**
 * Compone el nombre de una estructura a partir de sus partes operativas.
 * La UI y el service usan el mismo helper para mantener consistencia
 * entre preview (client) y persistencia (server). Ejemplos:
 *   ("DT", ["4ta"], "FUTSAL AFA")   → "DT 4ta FUTSAL AFA"
 *   ("Administrativo", [], null)     → "Administrativo"
 *   ("Profesor", ["4ta","5ta"], "Boxeo") → "Profesor 4ta/5ta Boxeo"
 */
export function composeStructureName(
  functionalRole: string,
  divisions: readonly SalaryDivision[],
  activityName: string | null | undefined,
): string {
  const parts: string[] = [functionalRole.trim()];
  if (divisions.length > 0) {
    parts.push(sortDivisions(divisions).join("/"));
  }
  if (activityName && activityName.trim()) {
    parts.push(activityName.trim());
  }
  return parts.filter(Boolean).join(" ");
}
