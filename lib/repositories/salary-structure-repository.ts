/**
 * Repository for Salary Structures (US-54 / US-55).
 *
 * Single module for DB access to `salary_structures`,
 * the `hr_activity_log` entries scoped to
 * those entities. The service layer (`salary-structure-service`) guards
 * authorization and business rules.
 *
 * Uses the admin Supabase client and filters by `club_id` on every query.
 * `app.current_club_id` is not set from the JS-side server client; only the
 * RPC functions seed it. Mirrors the approach of `cost-center-repository`.
 */

import {
  MissingSupabaseAdminConfigError,
  createRequiredAdminSupabaseClient,
} from "@/lib/supabase/admin";
import {
  isSalaryDivision,
  type SalaryDivision,
  type SalaryPaymentType,
  type SalaryRemunerationType,
  type SalaryStructure,
  type SalaryStructureStatus,
} from "@/lib/domain/salary-structure";

// -------------------------------------------------------------------------
// Errors
// -------------------------------------------------------------------------

export class SalaryStructureRepositoryInfraError extends Error {
  code: "admin_config_missing" | "write_failed" | "read_failed" | "rpc_failed";
  operation: string;

  constructor(
    code: "admin_config_missing" | "write_failed" | "read_failed" | "rpc_failed",
    operation: string,
    options?: { cause?: unknown },
  ) {
    super(
      code === "admin_config_missing"
        ? "Missing Supabase admin configuration for salary structures."
        : code === "write_failed"
        ? "Salary structure write failed."
        : code === "read_failed"
        ? "Salary structure read failed."
        : "Salary structure RPC failed.",
    );
    this.name = "SalaryStructureRepositoryInfraError";
    this.code = code;
    this.operation = operation;
    if (options?.cause) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export function isSalaryStructureRepositoryInfraError(
  value: unknown,
): value is SalaryStructureRepositoryInfraError {
  return value instanceof SalaryStructureRepositoryInfraError;
}

function logWriteFailure(operation: string, details: Record<string, unknown>, error?: unknown) {
  console.error("[salary-structure-write-failure]", { operation, ...details, error });
}

function logReadFailure(operation: string, details: Record<string, unknown>, error?: unknown) {
  console.error("[salary-structure-read-failure]", { operation, ...details, error });
}

function requireAdminClient(operation: string, details: Record<string, unknown>) {
  try {
    return createRequiredAdminSupabaseClient();
  } catch (error) {
    logWriteFailure(operation, { codePath: "admin", ...details }, error);
    if (error instanceof MissingSupabaseAdminConfigError) {
      throw new SalaryStructureRepositoryInfraError("admin_config_missing", operation, {
        cause: error,
      });
    }
    throw error;
  }
}

function throwWriteFailure(
  operation: string,
  details: Record<string, unknown>,
  error?: unknown,
): never {
  logWriteFailure(operation, details, error);
  throw new SalaryStructureRepositoryInfraError("write_failed", operation, { cause: error });
}

function throwReadFailure(
  operation: string,
  details: Record<string, unknown>,
  error?: unknown,
): never {
  logReadFailure(operation, details, error);
  throw new SalaryStructureRepositoryInfraError("read_failed", operation, { cause: error });
}

// -------------------------------------------------------------------------
// Row shapes + mappers
// -------------------------------------------------------------------------

type StructureRow = {
  id: string;
  club_id: string;
  name: string;
  functional_role: string;
  activity_id: string | null;
  divisions: string[] | null;
  payment_type: SalaryPaymentType;
  remuneration_type: SalaryRemunerationType;
  workload_hours: number | string | null;
  status: SalaryStructureStatus;
  created_at: string;
  updated_at: string;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
};

type StructureWithExtras = StructureRow & {
  activity_name: string | null;
  active_contract_id: string | null;
  active_contract_staff_name: string | null;
};

const STRUCTURE_COLUMNS =
  "id,club_id,name,functional_role,activity_id,divisions,payment_type,remuneration_type,workload_hours,status,created_at,updated_at,created_by_user_id,updated_by_user_id";

function mapStructure(row: StructureWithExtras): SalaryStructure {
  const rawDivisions = Array.isArray(row.divisions) ? row.divisions : [];
  const divisions = rawDivisions.filter(isSalaryDivision);
  return {
    id: row.id,
    clubId: row.club_id,
    name: row.name,
    functionalRole: row.functional_role,
    activityId: row.activity_id,
    activityName: row.activity_name,
    divisions,
    paymentType: row.payment_type,
    remunerationType: row.remuneration_type,
    workloadHours: row.workload_hours === null ? null : Number(row.workload_hours),
    status: row.status,
    hasActiveContract: Boolean(row.active_contract_id),
    activeContractId: row.active_contract_id,
    activeContractStaffName: row.active_contract_staff_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByUserId: row.created_by_user_id,
    updatedByUserId: row.updated_by_user_id,
  };
}

// -------------------------------------------------------------------------
// Input shapes
// -------------------------------------------------------------------------

export type CreateSalaryStructureInput = {
  clubId: string;
  name: string;
  functionalRole: string;
  activityId: string | null;
  divisions: SalaryDivision[];
  paymentType: SalaryPaymentType;
  remunerationType: SalaryRemunerationType;
  workloadHours: number | null;
  status: SalaryStructureStatus;
  createdByUserId: string;
};

export type UpdateSalaryStructureInput = {
  structureId: string;
  clubId: string;
  updatedByUserId: string;
  patch: {
    name?: string;
    remunerationType?: SalaryRemunerationType;
    workloadHours?: number | null;
    status?: SalaryStructureStatus;
  };
};

export type ListSalaryStructuresFilters = {
  status?: SalaryStructureStatus | null;
  activityId?: string | null;
  search?: string | null;
};

export type ExistsByRoleActivityInput = {
  clubId: string;
  functionalRole: string;
  activityId: string | null;
  divisions: SalaryDivision[];
  excludingStructureId?: string | null;
};

export type RecordActivityInput = {
  clubId: string;
  entityType: "salary_structure";
  entityId: string;
  action: string;
  actorUserId: string | null;
  payloadBefore?: Record<string, unknown> | null;
  payloadAfter?: Record<string, unknown> | null;
};

// -------------------------------------------------------------------------
// Repository
// -------------------------------------------------------------------------

async function fetchStructureWithExtras(
  supabase: ReturnType<typeof requireAdminClient>,
  params: { clubId: string; structureId?: string; filters?: ListSalaryStructuresFilters },
) {
  let baseQuery = supabase
    .from("salary_structures")
    .select(`${STRUCTURE_COLUMNS},activity:club_activities(name)`)
    .eq("club_id", params.clubId)
    .order("created_at", { ascending: false });

  if (params.structureId) {
    baseQuery = baseQuery.eq("id", params.structureId);
  }
  if (params.filters?.status) {
    baseQuery = baseQuery.eq("status", params.filters.status);
  }
  if (params.filters?.activityId) {
    baseQuery = baseQuery.eq("activity_id", params.filters.activityId);
  }
  if (params.filters?.search) {
    const escaped = params.filters.search.replace(/[%_]/g, (match) => `\\${match}`);
    baseQuery = baseQuery.or(`name.ilike.%${escaped}%,functional_role.ilike.%${escaped}%`);
  }

  const { data: baseData, error: baseErr } = await baseQuery;
  if (baseErr) throwReadFailure("fetch_structures_base", params, baseErr);
  const baseRowsRaw = (baseData ?? []) as unknown as Array<
    StructureRow & { activity: { name: string } | { name: string }[] | null }
  >;
  const baseRows = baseRowsRaw.map((row) => {
    const activityValue = Array.isArray(row.activity) ? row.activity[0] ?? null : row.activity;
    return { ...row, activity: activityValue } as StructureRow & {
      activity: { name: string } | null;
    };
  });

  if (baseRows.length === 0) return [] as StructureWithExtras[];

  const ids = baseRows.map((r) => r.id);

  // Active contract per structure (one because of the partial unique index).
  const { data: contractData, error: contractErr } = await supabase
    .from("staff_contracts")
    .select("id,salary_structure_id,staff_member:staff_members(first_name,last_name)")
    .in("salary_structure_id", ids)
    .eq("status", "vigente");
  if (contractErr) throwReadFailure("fetch_structures_active_contract", params, contractErr);
  const contractByStructure = new Map<
    string,
    { id: string; staffName: string | null }
  >();
  const contractRows = (contractData ?? []) as unknown as Array<{
    id: string;
    salary_structure_id: string;
    staff_member:
      | { first_name: string; last_name: string }
      | { first_name: string; last_name: string }[]
      | null;
  }>;
  for (const row of contractRows) {
    const staffValue = Array.isArray(row.staff_member)
      ? row.staff_member[0] ?? null
      : row.staff_member;
    const name = staffValue
      ? `${staffValue.first_name} ${staffValue.last_name}`.trim()
      : null;
    contractByStructure.set(row.salary_structure_id, { id: row.id, staffName: name });
  }

  return baseRows.map((row) => {
    const contract = contractByStructure.get(row.id);
    const extras: StructureWithExtras = {
      ...row,
      activity_name: row.activity?.name ?? null,
      active_contract_id: contract?.id ?? null,
      active_contract_staff_name: contract?.staffName ?? null,
    };
    return extras;
  });
}

export const salaryStructureRepository = {
  async listForClub(
    clubId: string,
    filters: ListSalaryStructuresFilters = {},
  ): Promise<SalaryStructure[]> {
    const supabase = requireAdminClient("list_salary_structures", { clubId });
    const rows = await fetchStructureWithExtras(supabase, { clubId, filters });
    return rows.map(mapStructure);
  },

  async getById(clubId: string, structureId: string): Promise<SalaryStructure | null> {
    const supabase = requireAdminClient("get_salary_structure", { clubId, structureId });
    const rows = await fetchStructureWithExtras(supabase, { clubId, structureId });
    return rows[0] ? mapStructure(rows[0]) : null;
  },

  async existsByRoleActivity(input: ExistsByRoleActivityInput): Promise<boolean> {
    const supabase = requireAdminClient("exists_by_role_activity", input);
    let query = supabase
      .from("salary_structures")
      .select("id,functional_role,activity_id,divisions,status", {
        count: "exact",
        head: false,
      })
      .eq("club_id", input.clubId)
      .eq("status", "activa");

    if (input.activityId === null) {
      query = query.is("activity_id", null);
    } else {
      query = query.eq("activity_id", input.activityId);
    }

    if (input.excludingStructureId) {
      query = query.neq("id", input.excludingStructureId);
    }

    const { data, error } = await query.limit(50);
    if (error) throwReadFailure("exists_by_role_activity", input, error);

    const normalized = input.functionalRole.trim().toLowerCase();
    const expectedDivisions = [...input.divisions].sort();
    return (data ?? []).some(
      (row: { functional_role: string; divisions: string[] | null }) => {
        if (row.functional_role.trim().toLowerCase() !== normalized) return false;
        const rowDivisions = [...(row.divisions ?? [])].sort();
        if (rowDivisions.length !== expectedDivisions.length) return false;
        return rowDivisions.every((v, i) => v === expectedDivisions[i]);
      },
    );
  },

  async create(input: CreateSalaryStructureInput): Promise<SalaryStructure> {
    const supabase = requireAdminClient("create_salary_structure", { clubId: input.clubId });

    // 1. Insert the structure.
    const { data: structureData, error: structureErr } = await supabase
      .from("salary_structures")
      .insert({
        club_id: input.clubId,
        name: input.name,
        functional_role: input.functionalRole,
        activity_id: input.activityId,
        divisions: input.divisions,
        payment_type: input.paymentType,
        remuneration_type: input.remunerationType,
        workload_hours: input.workloadHours,
        status: input.status,
        created_by_user_id: input.createdByUserId,
        updated_by_user_id: input.createdByUserId,
      })
      .select(STRUCTURE_COLUMNS)
      .single();

    if (structureErr || !structureData) {
      return throwWriteFailure(
        "create_salary_structure.insert",
        { clubId: input.clubId },
        structureErr,
      );
    }

    const structureRow = structureData as StructureRow;

    // La Estructura es puro catálogo — el monto vive en las revisiones
    // por contrato (`staff_contract_revisions`). No se crea versión aquí.
    const created = await this.getById(input.clubId, structureRow.id);
    if (!created) {
      return throwWriteFailure(
        "create_salary_structure.refetch",
        { clubId: input.clubId, structureId: structureRow.id },
      );
    }
    return created;
  },

  async update(input: UpdateSalaryStructureInput): Promise<SalaryStructure | null> {
    const supabase = requireAdminClient("update_salary_structure", {
      clubId: input.clubId,
      structureId: input.structureId,
    });

    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by_user_id: input.updatedByUserId,
    };
    if (input.patch.name !== undefined) patch.name = input.patch.name;
    if (input.patch.remunerationType !== undefined) patch.remuneration_type = input.patch.remunerationType;
    if (input.patch.workloadHours !== undefined) patch.workload_hours = input.patch.workloadHours;
    if (input.patch.status !== undefined) patch.status = input.patch.status;

    const { error } = await supabase
      .from("salary_structures")
      .update(patch)
      .eq("id", input.structureId)
      .eq("club_id", input.clubId);

    if (error) {
      return throwWriteFailure("update_salary_structure", input, error);
    }

    return this.getById(input.clubId, input.structureId);
  },

  async recordActivity(input: RecordActivityInput): Promise<void> {
    const supabase = requireAdminClient("record_hr_activity_log", {
      clubId: input.clubId,
      entityType: input.entityType,
      entityId: input.entityId,
    });
    const { error } = await supabase.from("hr_activity_log").insert({
      club_id: input.clubId,
      entity_type: input.entityType,
      entity_id: input.entityId,
      action: input.action,
      performed_by_user_id: input.actorUserId,
      payload_before: input.payloadBefore ?? null,
      payload_after: input.payloadAfter ?? null,
    });
    if (error) {
      // Audit failure must not block the operation; log and continue.
      console.error("[salary-structure-repo] audit insert failed", error);
    }
  },
};
