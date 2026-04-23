/**
 * Repository for Salary Structures (US-54 / US-55).
 *
 * Single module for DB access to `salary_structures`,
 * `salary_structure_versions` and the `hr_activity_log` entries scoped to
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
import type {
  SalaryRemunerationType,
  SalaryStructure,
  SalaryStructureStatus,
  SalaryStructureVersion,
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
  activity_id: string;
  remuneration_type: SalaryRemunerationType;
  workload_hours: number | string | null;
  status: SalaryStructureStatus;
  created_at: string;
  updated_at: string;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
};

type VersionRow = {
  id: string;
  salary_structure_id: string;
  amount: number | string;
  start_date: string;
  end_date: string | null;
  created_at: string;
  created_by_user_id: string | null;
};

type StructureWithExtras = StructureRow & {
  activity_name: string | null;
  current_amount: number | string | null;
  current_version_id: string | null;
  active_contract_id: string | null;
  active_contract_staff_name: string | null;
};

const STRUCTURE_COLUMNS =
  "id,club_id,name,functional_role,activity_id,remuneration_type,workload_hours,status,created_at,updated_at,created_by_user_id,updated_by_user_id";

const VERSION_COLUMNS =
  "id,salary_structure_id,amount,start_date,end_date,created_at,created_by_user_id";

function mapStructure(row: StructureWithExtras): SalaryStructure {
  return {
    id: row.id,
    clubId: row.club_id,
    name: row.name,
    functionalRole: row.functional_role,
    activityId: row.activity_id,
    activityName: row.activity_name,
    remunerationType: row.remuneration_type,
    workloadHours: row.workload_hours === null ? null : Number(row.workload_hours),
    status: row.status,
    currentAmount: row.current_amount === null ? null : Number(row.current_amount),
    currentVersionId: row.current_version_id,
    hasActiveContract: Boolean(row.active_contract_id),
    activeContractId: row.active_contract_id,
    activeContractStaffName: row.active_contract_staff_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByUserId: row.created_by_user_id,
    updatedByUserId: row.updated_by_user_id,
  };
}

function mapVersion(row: VersionRow): SalaryStructureVersion {
  return {
    id: row.id,
    salaryStructureId: row.salary_structure_id,
    amount: Number(row.amount),
    startDate: row.start_date,
    endDate: row.end_date,
    createdAt: row.created_at,
    createdByUserId: row.created_by_user_id,
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
  excludingStructureId?: string | null;
};

export type RecordActivityInput = {
  clubId: string;
  entityType: "salary_structure" | "salary_structure_version";
  entityId: string;
  action: string;
  actorUserId: string | null;
  payloadBefore?: Record<string, unknown> | null;
  payloadAfter?: Record<string, unknown> | null;
};

// -------------------------------------------------------------------------
// Repository
// -------------------------------------------------------------------------

/**
 * SQL for the enriched list query: one row per structure with the current
 * version amount, the active contract (if any) and the activity name.
 * Kept as an inline select so repo queries read naturally without views.
 */
const STRUCTURE_WITH_EXTRAS_SELECT = `
  id,club_id,name,functional_role,activity_id,remuneration_type,workload_hours,status,created_at,updated_at,created_by_user_id,updated_by_user_id,
  activity:activities(name),
  current_version:salary_structure_versions!inner(id,amount,end_date),
  active_contract:staff_contracts!left(id,staff_member:staff_members(first_name,last_name))
`;

async function fetchStructureWithExtras(
  supabase: ReturnType<typeof requireAdminClient>,
  params: { clubId: string; structureId?: string; filters?: ListSalaryStructuresFilters },
) {
  // We can't leverage Supabase's nested ambient filters reliably for current
  // version (end_date is null) and active contract (status = 'vigente') in a
  // single select, so we fetch the base structure + activity, then zip with
  // the other two in separate queries.
  let baseQuery = supabase
    .from("salary_structures")
    .select(`${STRUCTURE_COLUMNS},activity:activities(name)`)
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

  // Current versions: end_date is null.
  const { data: versionData, error: versionErr } = await supabase
    .from("salary_structure_versions")
    .select("id,salary_structure_id,amount")
    .in("salary_structure_id", ids)
    .is("end_date", null);
  if (versionErr) throwReadFailure("fetch_structures_current_version", params, versionErr);
  const versionByStructure = new Map<string, { id: string; amount: number }>();
  for (const row of (versionData ?? []) as Array<{
    id: string;
    salary_structure_id: string;
    amount: number | string;
  }>) {
    versionByStructure.set(row.salary_structure_id, {
      id: row.id,
      amount: Number(row.amount),
    });
  }

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
    const version = versionByStructure.get(row.id);
    const contract = contractByStructure.get(row.id);
    const extras: StructureWithExtras = {
      ...row,
      activity_name: row.activity?.name ?? null,
      current_amount: version?.amount ?? null,
      current_version_id: version?.id ?? null,
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
      .select("id,functional_role,activity_id,status", { count: "exact", head: false })
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
    return (data ?? []).some(
      (row: { functional_role: string }) =>
        row.functional_role.trim().toLowerCase() === normalized,
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

    // La estructura se crea sin versión de sueldo. El sueldo vigente se
    // gestiona aparte via `updateCurrentAmount()` ("Actualizar monto"),
    // que abre la primera version cuando el Coordinador lo define.

    // Re-read enriched so we include current_amount and activity name.
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

  async listAllVersionsForClub(clubId: string): Promise<SalaryStructureVersion[]> {
    const supabase = requireAdminClient("list_all_versions_for_club", { clubId });

    const { data: structures, error: structuresErr } = await supabase
      .from("salary_structures")
      .select("id")
      .eq("club_id", clubId);

    if (structuresErr) {
      throwReadFailure("list_all_versions_for_club.structures", { clubId }, structuresErr);
    }
    const ids = (structures ?? []).map((s: { id: string }) => s.id);
    if (ids.length === 0) return [];

    const { data, error } = await supabase
      .from("salary_structure_versions")
      .select(VERSION_COLUMNS)
      .in("salary_structure_id", ids)
      .order("start_date", { ascending: false });

    if (error) {
      throwReadFailure("list_all_versions_for_club.versions", { clubId }, error);
    }
    return (data ?? []).map((row) => mapVersion(row as VersionRow));
  },

  async listVersions(
    clubId: string,
    structureId: string,
  ): Promise<SalaryStructureVersion[]> {
    const supabase = requireAdminClient("list_salary_structure_versions", {
      clubId,
      structureId,
    });

    // Ensure the structure belongs to the club before fetching versions.
    const { data: structure, error: structureErr } = await supabase
      .from("salary_structures")
      .select("id")
      .eq("id", structureId)
      .eq("club_id", clubId)
      .maybeSingle();

    if (structureErr) {
      throwReadFailure("list_salary_structure_versions.guard", { clubId, structureId }, structureErr);
    }
    if (!structure) return [];

    const { data, error } = await supabase
      .from("salary_structure_versions")
      .select(VERSION_COLUMNS)
      .eq("salary_structure_id", structureId)
      .order("start_date", { ascending: false });

    if (error) {
      throwReadFailure("list_salary_structure_versions", { clubId, structureId }, error);
    }
    return (data ?? []).map((row) => mapVersion(row as VersionRow));
  },

  /**
   * Delegates the amount-update transaction to the SECURITY DEFINER RPC
   * `hr_update_salary_structure_amount` which closes the current version and
   * opens a new one atomically.
   */
  async updateCurrentAmount(params: {
    clubId: string;
    structureId: string;
    newAmount: number;
    effectiveDate: string;
    actorUserId: string;
  }): Promise<{
    ok: boolean;
    code: string;
    versionId?: string | null;
  }> {
    const supabase = requireAdminClient("rpc_update_salary_structure_amount", params);
    // Seed the RLS variable before RPC so the server-side guards work.
    const { error: setErr } = await supabase.rpc("set_current_club", {
      p_club_id: params.clubId,
    });
    // `set_current_club` may not exist in every environment; swallow its
    // "function not found" error and rely on the RPC itself to validate.
    if (setErr && setErr.code !== "42883") {
      console.warn("[salary-structure-repo] set_current_club failed", setErr);
    }

    const { data, error } = await supabase.rpc("hr_update_salary_structure_amount", {
      p_structure_id: params.structureId,
      p_new_amount: params.newAmount,
      p_effective_date: params.effectiveDate,
    });

    if (error) {
      console.error("[salary-structure-repo] rpc error", error);
      throw new SalaryStructureRepositoryInfraError(
        "rpc_failed",
        "hr_update_salary_structure_amount",
        { cause: error },
      );
    }

    const payload = (data ?? {}) as { ok?: boolean; code?: string; version_id?: string | null };
    return {
      ok: Boolean(payload.ok),
      code: String(payload.code ?? "unknown_error"),
      versionId: payload.version_id ?? null,
    };
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
