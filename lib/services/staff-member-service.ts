/**
 * Service layer for Staff Members (US-56).
 *
 * Orchestrates authorization, validation y CRUD del maestro de colaboradores.
 * El concepto de activo/inactivo fue removido; los colaboradores se crean y
 * se editan, pero no se dan de baja desde este flujo.
 */

import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import type { Membership } from "@/lib/domain/access";
import { canAccessHrMasters, canMutateHrMasters } from "@/lib/domain/authorization";
import {
  isStaffVinculoType,
  normalizeDni,
  isValidDniShape,
  type StaffMember,
  type StaffVinculoType,
} from "@/lib/domain/staff-member";
import {
  isStaffMemberRepositoryInfraError,
  staffMemberRepository,
  type ListStaffMembersFilters,
} from "@/lib/repositories/staff-member-repository";
import {
  formatCuit,
  hasValidCuitDv,
  hasValidCuitShape,
  normalizeCuit,
} from "@/lib/validators/cuit";
import { isValidEmail, validatePhone } from "@/lib/validators/contact";

// -------------------------------------------------------------------------
// Result codes
// -------------------------------------------------------------------------

export type StaffMemberActionCode =
  | "unauthenticated"
  | "no_active_club"
  | "forbidden"
  | "created"
  | "updated"
  | "member_not_found"
  | "first_name_required"
  | "last_name_required"
  | "dni_required"
  | "invalid_dni"
  | "invalid_cuit_cuil"
  | "invalid_cuit_dv"
  | "vinculo_required"
  | "invalid_vinculo"
  | "email_invalid"
  | "phone_invalid"
  | "invalid_hire_date"
  | "duplicate_dni"
  | "duplicate_cuit_cuil"
  | "unknown_error";

export type StaffMemberActionResult<T = void> =
  | { ok: true; code: StaffMemberActionCode; data?: T }
  | { ok: false; code: StaffMemberActionCode };

function ok<T>(code: StaffMemberActionCode, data?: T): StaffMemberActionResult<T> {
  return { ok: true, code, data };
}
function err<T = void>(code: StaffMemberActionCode): StaffMemberActionResult<T> {
  return { ok: false, code };
}

// -------------------------------------------------------------------------
// Auth guards
// -------------------------------------------------------------------------

type GuardedContext = { userId: string; clubId: string; membership: Membership };

async function guardRead():
  Promise<{ ok: true; context: GuardedContext } | { ok: false; code: StaffMemberActionCode }> {
  const session = await getAuthenticatedSessionContext();
  if (!session) return { ok: false, code: "unauthenticated" };
  if (!session.activeClub || !session.activeMembership) {
    return { ok: false, code: "no_active_club" };
  }
  if (!canAccessHrMasters(session.activeMembership)) return { ok: false, code: "forbidden" };
  return {
    ok: true,
    context: {
      userId: session.user.id,
      clubId: session.activeClub.id,
      membership: session.activeMembership,
    },
  };
}

async function guardMutate():
  Promise<{ ok: true; context: GuardedContext } | { ok: false; code: StaffMemberActionCode }> {
  const session = await getAuthenticatedSessionContext();
  if (!session) return { ok: false, code: "unauthenticated" };
  if (!session.activeClub || !session.activeMembership) {
    return { ok: false, code: "no_active_club" };
  }
  if (!canMutateHrMasters(session.activeMembership)) return { ok: false, code: "forbidden" };
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
// Normalizers + validation
// -------------------------------------------------------------------------

function normalizeText(raw: unknown, maxLength: number): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

function normalizeOptionalText(raw: unknown, maxLength: number): string | null {
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

type RawMemberInput = {
  firstName?: unknown;
  lastName?: unknown;
  dni?: unknown;
  cuitCuil?: unknown;
  email?: unknown;
  phone?: unknown;
  vinculoType?: unknown;
  cbuAlias?: unknown;
  hireDate?: unknown;
};

type ValidatedMemberInput = {
  firstName: string;
  lastName: string;
  dni: string;
  cuitCuil: string | null;
  email: string | null;
  phone: string | null;
  vinculoType: StaffVinculoType;
  cbuAlias: string | null;
  hireDate: string;
};

function validateMemberInput(
  raw: RawMemberInput,
  mode: "create" | "update",
):
  | { ok: true; input: ValidatedMemberInput }
  | { ok: false; code: StaffMemberActionCode } {
  const firstName = normalizeText(raw.firstName, 80);
  const lastName = normalizeText(raw.lastName, 80);
  const dniRaw = typeof raw.dni === "string" ? raw.dni : "";
  const cuitRaw = typeof raw.cuitCuil === "string" ? raw.cuitCuil : "";
  const email = typeof raw.email === "string" ? raw.email.trim() : "";
  const phoneRaw = typeof raw.phone === "string" ? raw.phone : "";
  const vinculoRaw = typeof raw.vinculoType === "string" ? raw.vinculoType.trim() : "";
  const cbuAlias = normalizeOptionalText(raw.cbuAlias, 50);
  const hireDate = normalizeIsoDate(raw.hireDate) ?? new Date().toISOString().slice(0, 10);

  if (!firstName) return { ok: false, code: "first_name_required" };
  if (!lastName) return { ok: false, code: "last_name_required" };

  const dni = normalizeDni(dniRaw);
  if (!dni) return { ok: false, code: "dni_required" };
  if (!isValidDniShape(dni)) return { ok: false, code: "invalid_dni" };

  // CUIT/CUIL es opcional. Si viene, validamos shape + digito verificador;
  // si no viene, lo persistimos como null.
  let cuit: string | null = null;
  if (cuitRaw.trim()) {
    const cuitDigits = normalizeCuit(cuitRaw);
    const formatted = formatCuit(cuitDigits);
    if (!formatted || !hasValidCuitShape(formatted)) {
      return { ok: false, code: "invalid_cuit_cuil" };
    }
    if (!hasValidCuitDv(cuitDigits)) return { ok: false, code: "invalid_cuit_dv" };
    cuit = formatted;
  }

  if (!vinculoRaw) return { ok: false, code: "vinculo_required" };
  if (!isStaffVinculoType(vinculoRaw)) return { ok: false, code: "invalid_vinculo" };

  let normalizedEmail: string | null = null;
  if (email) {
    if (!isValidEmail(email)) return { ok: false, code: "email_invalid" };
    normalizedEmail = email;
  }

  let normalizedPhone: string | null = null;
  if (phoneRaw.trim()) {
    const phoneCheck = validatePhone(phoneRaw);
    if (!phoneCheck.ok) return { ok: false, code: "phone_invalid" };
    normalizedPhone = phoneCheck.normalized;
  }

  if (mode === "create" && !hireDate) return { ok: false, code: "invalid_hire_date" };

  return {
    ok: true,
    input: {
      firstName,
      lastName,
      dni,
      cuitCuil: cuit,
      email: normalizedEmail,
      phone: normalizedPhone,
      vinculoType: vinculoRaw,
      cbuAlias,
      hireDate,
    },
  };
}

// -------------------------------------------------------------------------
// Public queries
// -------------------------------------------------------------------------

export type ListStaffMembersResult =
  | { ok: true; members: StaffMember[] }
  | { ok: false; code: StaffMemberActionCode };

export async function listStaffMembersForActiveClub(
  filters: ListStaffMembersFilters = {},
): Promise<ListStaffMembersResult> {
  const guard = await guardRead();
  if (!guard.ok) return { ok: false, code: guard.code };
  try {
    const members = await staffMemberRepository.listForClub(guard.context.clubId, filters);
    return { ok: true, members };
  } catch (error) {
    if (isStaffMemberRepositoryInfraError(error)) {
      console.error("[staff-member-service.list]", error);
    }
    return { ok: false, code: "unknown_error" };
  }
}

// -------------------------------------------------------------------------
// Mutations
// -------------------------------------------------------------------------

export async function createStaffMember(
  raw: RawMemberInput,
): Promise<StaffMemberActionResult<{ member: StaffMember }>> {
  const guard = await guardMutate();
  if (!guard.ok) return err<{ member: StaffMember }>(guard.code);
  const ctx = guard.context;

  const validation = validateMemberInput(raw, "create");
  if (!validation.ok) return err<{ member: StaffMember }>(validation.code);
  const input = validation.input;

  try {
    const dup = await staffMemberRepository.existsByIdentifier({
      clubId: ctx.clubId,
      dni: input.dni,
      cuitCuil: input.cuitCuil,
    });
    if (dup.dniTaken) return err<{ member: StaffMember }>("duplicate_dni");
    if (dup.cuitTaken) return err<{ member: StaffMember }>("duplicate_cuit_cuil");

    const created = await staffMemberRepository.create({
      clubId: ctx.clubId,
      firstName: input.firstName,
      lastName: input.lastName,
      dni: input.dni,
      cuitCuil: input.cuitCuil,
      email: input.email,
      phone: input.phone,
      vinculoType: input.vinculoType,
      cbuAlias: input.cbuAlias,
      hireDate: input.hireDate,
      createdByUserId: ctx.userId,
    });

    await staffMemberRepository.recordActivity({
      clubId: ctx.clubId,
      entityId: created.id,
      action: "CREATED",
      actorUserId: ctx.userId,
      payloadAfter: {
        first_name: created.firstName,
        last_name: created.lastName,
        dni: created.dni,
        cuit_cuil: created.cuitCuil,
        vinculo_type: created.vinculoType,
      },
    });

    return ok<{ member: StaffMember }>("created", { member: created });
  } catch (error) {
    if (isStaffMemberRepositoryInfraError(error)) {
      console.error("[staff-member-service.create]", error);
    }
    return err<{ member: StaffMember }>("unknown_error");
  }
}

export async function updateStaffMember(
  memberId: string,
  raw: RawMemberInput,
): Promise<StaffMemberActionResult<{ member: StaffMember }>> {
  const guard = await guardMutate();
  if (!guard.ok) return err<{ member: StaffMember }>(guard.code);
  const ctx = guard.context;

  const validation = validateMemberInput(raw, "update");
  if (!validation.ok) return err<{ member: StaffMember }>(validation.code);
  const input = validation.input;

  try {
    const existing = await staffMemberRepository.getById(ctx.clubId, memberId);
    if (!existing) return err<{ member: StaffMember }>("member_not_found");

    const dup = await staffMemberRepository.existsByIdentifier({
      clubId: ctx.clubId,
      dni: input.dni,
      cuitCuil: input.cuitCuil,
      excludingMemberId: memberId,
    });
    if (dup.dniTaken) return err<{ member: StaffMember }>("duplicate_dni");
    if (dup.cuitTaken) return err<{ member: StaffMember }>("duplicate_cuit_cuil");

    const updated = await staffMemberRepository.update({
      memberId,
      clubId: ctx.clubId,
      updatedByUserId: ctx.userId,
      patch: {
        firstName: input.firstName,
        lastName: input.lastName,
        dni: input.dni,
        cuitCuil: input.cuitCuil,
        email: input.email,
        phone: input.phone,
        vinculoType: input.vinculoType,
        cbuAlias: input.cbuAlias,
        hireDate: input.hireDate,
      },
    });
    if (!updated) return err<{ member: StaffMember }>("member_not_found");

    await staffMemberRepository.recordActivity({
      clubId: ctx.clubId,
      entityId: updated.id,
      action: "UPDATED",
      actorUserId: ctx.userId,
      payloadBefore: {
        first_name: existing.firstName,
        last_name: existing.lastName,
        dni: existing.dni,
        cuit_cuil: existing.cuitCuil,
        vinculo_type: existing.vinculoType,
      },
      payloadAfter: {
        first_name: updated.firstName,
        last_name: updated.lastName,
        dni: updated.dni,
        cuit_cuil: updated.cuitCuil,
        vinculo_type: updated.vinculoType,
      },
    });

    return ok<{ member: StaffMember }>("updated", { member: updated });
  } catch (error) {
    if (isStaffMemberRepositoryInfraError(error)) {
      console.error("[staff-member-service.update]", error);
    }
    return err<{ member: StaffMember }>("unknown_error");
  }
}

