/**
 * Domain entity and pure helpers for Staff Members (US-56).
 *
 * Staff members are the master catalog of people paid by the club. Each
 * person has identity, contact and payment data, a `vinculo_type` and a
 * soft-delete style `status` (`activo | inactivo`). The service layer
 * blocks deactivation while the member has active contracts (US-58).
 *
 * Module is effect-free; only types, enums and helpers used by the UI,
 * the service layer and the repository.
 */

export const STAFF_VINCULO_TYPES = [
  "relacion_dependencia",
  "monotributista",
  "honorarios",
] as const;
export type StaffVinculoType = (typeof STAFF_VINCULO_TYPES)[number];

export const STAFF_MEMBER_STATUSES = ["activo", "inactivo"] as const;
export type StaffMemberStatus = (typeof STAFF_MEMBER_STATUSES)[number];

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
  status: StaffMemberStatus;
  activeContractCount: number;
  hasActiveContract: boolean;
  deactivatedAt: string | null;
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

export function isStaffMemberStatus(value: unknown): value is StaffMemberStatus {
  return (
    typeof value === "string" &&
    (STAFF_MEMBER_STATUSES as readonly string[]).includes(value)
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
