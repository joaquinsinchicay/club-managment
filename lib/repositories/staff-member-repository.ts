/**
 * Repository for Staff Members (US-56).
 *
 * Single module for DB access to `staff_members` + the `hr_activity_log`
 * entries scoped to those entities. The service layer
 * (`staff-member-service`) enforces authorization and business rules.
 *
 * Uses the admin Supabase client and filters by `club_id` on every query,
 * mirroring the approach already used for cost-centers and salary
 * structures.
 */

import {
  MissingSupabaseAdminConfigError,
  createRequiredAdminSupabaseClient,
} from "@/lib/supabase/admin";
import type {
  StaffMember,
  StaffVinculoType,
} from "@/lib/domain/staff-member";

// -------------------------------------------------------------------------
// Errors
// -------------------------------------------------------------------------

export class StaffMemberRepositoryInfraError extends Error {
  code: "admin_config_missing" | "write_failed" | "read_failed" | "rpc_failed";
  operation: string;

  constructor(
    code: "admin_config_missing" | "write_failed" | "read_failed" | "rpc_failed",
    operation: string,
    options?: { cause?: unknown },
  ) {
    super(
      code === "admin_config_missing"
        ? "Missing Supabase admin configuration for staff members."
        : code === "write_failed"
        ? "Staff member write failed."
        : code === "rpc_failed"
        ? "Staff member RPC failed."
        : "Staff member read failed.",
    );
    this.name = "StaffMemberRepositoryInfraError";
    this.code = code;
    this.operation = operation;
    if (options?.cause) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export function isStaffMemberRepositoryInfraError(
  value: unknown,
): value is StaffMemberRepositoryInfraError {
  return value instanceof StaffMemberRepositoryInfraError;
}

function logWriteFailure(op: string, details: Record<string, unknown>, error?: unknown) {
  console.error("[staff-member-write-failure]", { operation: op, ...details, error });
}
function logReadFailure(op: string, details: Record<string, unknown>, error?: unknown) {
  console.error("[staff-member-read-failure]", { operation: op, ...details, error });
}

function requireAdminClient(op: string, details: Record<string, unknown>) {
  try {
    return createRequiredAdminSupabaseClient();
  } catch (error) {
    logWriteFailure(op, { codePath: "admin", ...details }, error);
    if (error instanceof MissingSupabaseAdminConfigError) {
      throw new StaffMemberRepositoryInfraError("admin_config_missing", op, { cause: error });
    }
    throw error;
  }
}
function throwWriteFailure(op: string, details: Record<string, unknown>, error?: unknown): never {
  logWriteFailure(op, details, error);
  throw new StaffMemberRepositoryInfraError("write_failed", op, { cause: error });
}
function throwReadFailure(op: string, details: Record<string, unknown>, error?: unknown): never {
  logReadFailure(op, details, error);
  throw new StaffMemberRepositoryInfraError("read_failed", op, { cause: error });
}

// -------------------------------------------------------------------------
// Row shapes
// -------------------------------------------------------------------------

type MemberRow = {
  id: string;
  club_id: string;
  first_name: string;
  last_name: string;
  dni: string;
  cuit_cuil: string | null;
  email: string | null;
  phone: string | null;
  vinculo_type: StaffVinculoType;
  cbu_alias: string | null;
  hire_date: string;
  created_at: string;
  updated_at: string;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
};

const MEMBER_COLUMNS =
  "id,club_id,first_name,last_name,dni,cuit_cuil,email,phone,vinculo_type,cbu_alias,hire_date,created_at,updated_at,created_by_user_id,updated_by_user_id";

function mapMember(row: MemberRow, activeContractCount: number): StaffMember {
  return {
    id: row.id,
    clubId: row.club_id,
    firstName: row.first_name,
    lastName: row.last_name,
    dni: row.dni,
    cuitCuil: row.cuit_cuil,
    email: row.email,
    phone: row.phone,
    vinculoType: row.vinculo_type,
    cbuAlias: row.cbu_alias,
    hireDate: row.hire_date,
    activeContractCount,
    hasActiveContract: activeContractCount > 0,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByUserId: row.created_by_user_id,
    updatedByUserId: row.updated_by_user_id,
  };
}

// -------------------------------------------------------------------------
// Input shapes
// -------------------------------------------------------------------------

export type CreateStaffMemberInput = {
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
  createdByUserId: string;
};

export type UpdateStaffMemberInput = {
  memberId: string;
  clubId: string;
  updatedByUserId: string;
  patch: {
    firstName?: string;
    lastName?: string;
    dni?: string;
    cuitCuil?: string | null;
    email?: string | null;
    phone?: string | null;
    vinculoType?: StaffVinculoType;
    cbuAlias?: string | null;
    hireDate?: string;
  };
};

export type ListStaffMembersFilters = {
  vinculoType?: StaffVinculoType | null;
  search?: string | null;
};

export type ExistsByIdentifierInput = {
  clubId: string;
  dni?: string | null;
  cuitCuil?: string | null;
  excludingMemberId?: string | null;
};

export type RecordActivityInput = {
  clubId: string;
  entityId: string;
  action: string;
  actorUserId: string | null;
  payloadBefore?: Record<string, unknown> | null;
  payloadAfter?: Record<string, unknown> | null;
};

// -------------------------------------------------------------------------
// Repository
// -------------------------------------------------------------------------

export const staffMemberRepository = {
  async listForClub(
    clubId: string,
    filters: ListStaffMembersFilters = {},
  ): Promise<StaffMember[]> {
    const supabase = requireAdminClient("list_staff_members", { clubId });

    let query = supabase
      .from("staff_members")
      .select(MEMBER_COLUMNS)
      .eq("club_id", clubId)
      .order("last_name", { ascending: true })
      .order("first_name", { ascending: true });

    if (filters.vinculoType) query = query.eq("vinculo_type", filters.vinculoType);
    if (filters.search) {
      const escaped = filters.search.replace(/[%_]/g, (m) => `\\${m}`);
      query = query.or(
        `first_name.ilike.%${escaped}%,last_name.ilike.%${escaped}%,dni.ilike.%${escaped}%`,
      );
    }

    const { data, error } = await query;
    if (error) throwReadFailure("list_staff_members", { clubId }, error);

    const rows = (data ?? []) as MemberRow[];
    if (rows.length === 0) return [];

    // Attach active contract count per member.
    const memberIds = rows.map((r) => r.id);
    const { data: contracts, error: contractsErr } = await supabase
      .from("staff_contracts")
      .select("staff_member_id,status")
      .in("staff_member_id", memberIds)
      .eq("status", "vigente");
    if (contractsErr) {
      throwReadFailure("list_staff_members.contracts", { clubId }, contractsErr);
    }
    const activeCountByMember = new Map<string, number>();
    for (const c of (contracts ?? []) as Array<{ staff_member_id: string }>) {
      activeCountByMember.set(
        c.staff_member_id,
        (activeCountByMember.get(c.staff_member_id) ?? 0) + 1,
      );
    }

    return rows.map((r) => mapMember(r, activeCountByMember.get(r.id) ?? 0));
  },

  async getById(clubId: string, memberId: string): Promise<StaffMember | null> {
    const supabase = requireAdminClient("get_staff_member", { clubId, memberId });
    const { data, error } = await supabase
      .from("staff_members")
      .select(MEMBER_COLUMNS)
      .eq("id", memberId)
      .eq("club_id", clubId)
      .maybeSingle();
    if (error) throwReadFailure("get_staff_member", { clubId, memberId }, error);
    if (!data) return null;

    const { count } = await supabase
      .from("staff_contracts")
      .select("id", { count: "exact", head: true })
      .eq("staff_member_id", memberId)
      .eq("status", "vigente");

    return mapMember(data as MemberRow, count ?? 0);
  },

  async existsByIdentifier(input: ExistsByIdentifierInput): Promise<{
    dniTaken: boolean;
    cuitTaken: boolean;
  }> {
    const supabase = requireAdminClient("exists_by_identifier", input);

    let dniTaken = false;
    let cuitTaken = false;

    if (input.dni) {
      let q = supabase
        .from("staff_members")
        .select("id", { count: "exact", head: true })
        .eq("club_id", input.clubId)
        .eq("dni", input.dni);
      if (input.excludingMemberId) q = q.neq("id", input.excludingMemberId);
      const { count, error } = await q;
      if (error) throwReadFailure("exists_by_identifier.dni", input, error);
      dniTaken = (count ?? 0) > 0;
    }

    if (input.cuitCuil) {
      let q = supabase
        .from("staff_members")
        .select("id", { count: "exact", head: true })
        .eq("club_id", input.clubId)
        .eq("cuit_cuil", input.cuitCuil);
      if (input.excludingMemberId) q = q.neq("id", input.excludingMemberId);
      const { count, error } = await q;
      if (error) throwReadFailure("exists_by_identifier.cuit", input, error);
      cuitTaken = (count ?? 0) > 0;
    }

    return { dniTaken, cuitTaken };
  },

  async create(input: CreateStaffMemberInput): Promise<StaffMember> {
    const supabase = requireAdminClient("create_staff_member", { clubId: input.clubId });
    const { data, error } = await supabase
      .from("staff_members")
      .insert({
        club_id: input.clubId,
        first_name: input.firstName,
        last_name: input.lastName,
        dni: input.dni,
        cuit_cuil: input.cuitCuil,
        email: input.email,
        phone: input.phone,
        vinculo_type: input.vinculoType,
        cbu_alias: input.cbuAlias,
        hire_date: input.hireDate,
        created_by_user_id: input.createdByUserId,
        updated_by_user_id: input.createdByUserId,
      })
      .select(MEMBER_COLUMNS)
      .single();

    if (error || !data) {
      return throwWriteFailure("create_staff_member", { clubId: input.clubId }, error);
    }
    return mapMember(data as MemberRow, 0);
  },

  async update(input: UpdateStaffMemberInput): Promise<StaffMember | null> {
    const supabase = requireAdminClient("update_staff_member", {
      clubId: input.clubId,
      memberId: input.memberId,
    });
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by_user_id: input.updatedByUserId,
    };
    if (input.patch.firstName !== undefined) patch.first_name = input.patch.firstName;
    if (input.patch.lastName !== undefined) patch.last_name = input.patch.lastName;
    if (input.patch.dni !== undefined) patch.dni = input.patch.dni;
    if (input.patch.cuitCuil !== undefined) patch.cuit_cuil = input.patch.cuitCuil;
    if (input.patch.email !== undefined) patch.email = input.patch.email;
    if (input.patch.phone !== undefined) patch.phone = input.patch.phone;
    if (input.patch.vinculoType !== undefined) patch.vinculo_type = input.patch.vinculoType;
    if (input.patch.cbuAlias !== undefined) patch.cbu_alias = input.patch.cbuAlias;
    if (input.patch.hireDate !== undefined) patch.hire_date = input.patch.hireDate;

    const { error } = await supabase
      .from("staff_members")
      .update(patch)
      .eq("id", input.memberId)
      .eq("club_id", input.clubId);
    if (error) return throwWriteFailure("update_staff_member", input, error);

    return this.getById(input.clubId, input.memberId);
  },

  async recordActivity(input: RecordActivityInput): Promise<void> {
    const supabase = requireAdminClient("record_staff_member_activity", {
      clubId: input.clubId,
      entityId: input.entityId,
    });
    const { error } = await supabase.from("hr_activity_log").insert({
      club_id: input.clubId,
      entity_type: "staff_member",
      entity_id: input.entityId,
      action: input.action,
      performed_by_user_id: input.actorUserId,
      payload_before: input.payloadBefore ?? null,
      payload_after: input.payloadAfter ?? null,
    });
    if (error) {
      console.error("[staff-member-repo] audit insert failed", error);
    }
  },
};
