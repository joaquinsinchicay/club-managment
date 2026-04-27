/**
 * Domain entity and pure helpers for Staff Members (US-56).
 *
 * Staff members are the master catalog of people paid by the club. Cada
 * persona tiene datos personales, vinculo contable y datos de pago. El
 * unico concepto de baja es la "alerta de contratos": un colaborador
 * sin contratos vigentes se marca visualmente pero NO cambia estado —
 * el concepto activo/inactivo fue removido de este módulo.
 */

export const STAFF_VINCULO_TYPES = [
  "relacion_dependencia",
  "monotributista",
  "honorarios",
  "contrato_locacion",
] as const;
export type StaffVinculoType = (typeof STAFF_VINCULO_TYPES)[number];

export type StaffMember = {
  id: string;
  clubId: string;
  firstName: string;
  lastName: string;
  dni: string;
  cuitCuil: string | null;
  email: string | null;
  phone: string | null;
  vinculoType: StaffVinculoType;
  cbuAlias: string | null;
  hireDate: string;
  activeContractCount: number;
  hasActiveContract: boolean;
  createdAt: string;
  updatedAt: string;
  createdByUserId: string | null;
  updatedByUserId: string | null;
};

export function isStaffVinculoType(value: unknown): value is StaffVinculoType {
  return (
    typeof value === "string" &&
    (STAFF_VINCULO_TYPES as readonly string[]).includes(value)
  );
}

/**
 * Normalizes a DNI by removing dots and spaces. DB stores the normalized
 * value so unique checks compare apples to apples. We accept 7 or 8 digit
 * DNIs (Argentina).
 */
export function normalizeDni(raw: string): string {
  return raw.replace(/[.\s-]/g, "").trim();
}

export function isValidDniShape(value: string): boolean {
  const normalized = normalizeDni(value);
  return /^\d{7,8}$/.test(normalized);
}

export function fullName(member: Pick<StaffMember, "firstName" | "lastName">): string {
  return `${member.firstName} ${member.lastName}`.trim();
}
