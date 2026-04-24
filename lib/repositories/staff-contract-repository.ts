/**
 * Repository for Staff Contracts (US-57 / US-58).
 *
 * Handles CRUD over `staff_contracts` and delegates the atomic finalize
 * transaction to the SECURITY DEFINER RPC `hr_finalize_contract`. Reads
 * enrich each row with the staff member name, structure name, role,
 * activity and the current effective amount (from the structure's current
 * version or the frozen amount on the contract, whichever applies).
 *
 * Uses the admin Supabase client and filters by `club_id` on every query.
 */

import {
  MissingSupabaseAdminConfigError,
  createRequiredAdminSupabaseClient,
} from "@/lib/supabase/admin";
import type { StaffContract, StaffContractStatus } from "@/lib/domain/staff-contract";

// -------------------------------------------------------------------------
// Errors
// -------------------------------------------------------------------------

export class StaffContractRepositoryInfraError extends Error {
  code: "admin_config_missing" | "write_failed" | "read_failed" | "rpc_failed";
  operation: string;

  constructor(
    code: "admin_config_missing" | "write_failed" | "read_failed" | "rpc_failed",
    operation: string,
    options?: { cause?: unknown },
  ) {
    super(
      code === "admin_config_missing"
        ? "Missing Supabase admin configuration for staff contracts."
        : code === "write_failed"
        ? "Staff contract write failed."
        : code === "read_failed"
        ? "Staff contract read failed."
        : "Staff contract RPC failed.",
    );
    this.name = "StaffContractRepositoryInfraError";
    this.code = code;
    this.operation = operation;
    if (options?.cause) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export function isStaffContractRepositoryInfraError(
  value: unknown,
): value is StaffContractRepositoryInfraError {
  return value instanceof StaffContractRepositoryInfraError;
}

function log(op: string, kind: "r" | "w", details: Record<string, unknown>, error?: unknown) {
  console.error(`[staff-contract-${kind === "r" ? "read" : "write"}-failure]`, {
    operation: op,
    ...details,
    error,
  });
}

function requireAdminClient(op: string, details: Record<string, unknown>) {
  try {
    return createRequiredAdminSupabaseClient();
  } catch (error) {
    log(op, "w", { codePath: "admin", ...details }, error);
    if (error instanceof MissingSupabaseAdminConfigError) {
      throw new StaffContractRepositoryInfraError("admin_config_missing", op, { cause: error });
    }
    throw error;
  }
}
function throwWrite(op: string, details: Record<string, unknown>, error?: unknown): never {
  log(op, "w", details, error);
  throw new StaffContractRepositoryInfraError("write_failed", op, { cause: error });
}
function throwRead(op: string, details: Record<string, unknown>, error?: unknown): never {
  log(op, "r", details, error);
  throw new StaffContractRepositoryInfraError("read_failed", op, { cause: error });
}

// -------------------------------------------------------------------------
// Row shape + mapper
// -------------------------------------------------------------------------

type ContractRow = {
  id: string;
  club_id: string;
  staff_member_id: string;
  salary_structure_id: string;
  start_date: string;
  end_date: string | null;
  status: StaffContractStatus;
  finalized_at: string | null;
  finalized_reason: string | null;
  finalized_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
};

const CONTRACT_COLUMNS =
  "id,club_id,staff_member_id,salary_structure_id,start_date,end_date,status,finalized_at,finalized_reason,finalized_by_user_id,created_at,updated_at,created_by_user_id,updated_by_user_id";

// -------------------------------------------------------------------------
// Input shapes
// -------------------------------------------------------------------------

export type CreateStaffContractInput = {
  clubId: string;
  staffMemberId: string;
  salaryStructureId: string;
  startDate: string;
  endDate: string | null;
  initialAmount: number;
  initialRevisionReason: string | null;
  createdByUserId: string;
};

export type UpdateStaffContractInput = {
  contractId: string;
  clubId: string;
  updatedByUserId: string;
  patch: {
    endDate?: string | null;
  };
};

export type ListStaffContractsFilters = {
  status?: StaffContractStatus | null;
  staffMemberId?: string | null;
  salaryStructureId?: string | null;
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
// Helpers to resolve the effective amount per contract
// -------------------------------------------------------------------------

type EnrichedMaps = {
  staffNameById: Map<string, string | null>;
  structureById: Map<
    string,
    {
      name: string;
      role: string;
      activityId: string | null;
      activityName: string | null;
      remunerationType: string;
      paymentType: string;
      divisions: string[];
    }
  >;
  currentRevisionByContract: Map<
    string,
    { id: string; amount: number; effectiveDate: string }
  >;
};

async function fetchEnrichedMaps(
  supabase: ReturnType<typeof requireAdminClient>,
  opts: {
    clubId: string;
    contractIds: string[];
    staffMemberIds: string[];
    structureIds: string[];
  },
): Promise<EnrichedMaps> {
  const maps: EnrichedMaps = {
    staffNameById: new Map(),
    structureById: new Map(),
    currentRevisionByContract: new Map(),
  };

  if (opts.staffMemberIds.length > 0) {
    const { data, error } = await supabase
      .from("staff_members")
      .select("id,first_name,last_name")
      .in("id", opts.staffMemberIds)
      .eq("club_id", opts.clubId);
    if (error) throwRead("fetch_enriched.staff_members", opts, error);
    for (const row of (data ?? []) as Array<{
      id: string;
      first_name: string;
      last_name: string;
    }>) {
      maps.staffNameById.set(row.id, `${row.first_name} ${row.last_name}`.trim());
    }
  }

  if (opts.structureIds.length > 0) {
    const { data, error } = await supabase
      .from("salary_structures")
      .select(
        "id,name,functional_role,remuneration_type,payment_type,divisions,activity_id,activity:club_activities(name)",
      )
      .in("id", opts.structureIds)
      .eq("club_id", opts.clubId);
    if (error) throwRead("fetch_enriched.structures", opts, error);
    const structureRowsRaw = (data ?? []) as unknown as Array<{
      id: string;
      name: string;
      functional_role: string;
      remuneration_type: string;
      payment_type: string;
      divisions: string[] | null;
      activity_id: string | null;
      activity: { name: string } | { name: string }[] | null;
    }>;
    for (const row of structureRowsRaw) {
      const activityValue = Array.isArray(row.activity)
        ? row.activity[0] ?? null
        : row.activity;
      maps.structureById.set(row.id, {
        name: row.name,
        role: row.functional_role,
        activityId: row.activity_id,
        activityName: activityValue?.name ?? null,
        remunerationType: row.remuneration_type,
        paymentType: row.payment_type,
        divisions: Array.isArray(row.divisions) ? row.divisions : [],
      });
    }
  }

  if (opts.contractIds.length > 0) {
    const { data: revisionData, error: revisionErr } = await supabase
      .from("staff_contract_revisions")
      .select("id,contract_id,amount,effective_date")
      .in("contract_id", opts.contractIds)
      .is("end_date", null);
    if (revisionErr) throwRead("fetch_enriched.revisions", opts, revisionErr);
    for (const v of (revisionData ?? []) as Array<{
      id: string;
      contract_id: string;
      amount: number | string;
      effective_date: string;
    }>) {
      maps.currentRevisionByContract.set(v.contract_id, {
        id: v.id,
        amount: Number(v.amount),
        effectiveDate: v.effective_date,
      });
    }
  }

  return maps;
}

function mapContract(row: ContractRow, maps: EnrichedMaps): StaffContract {
  const structure = maps.structureById.get(row.salary_structure_id);
  const revision = maps.currentRevisionByContract.get(row.id);

  return {
    id: row.id,
    clubId: row.club_id,
    staffMemberId: row.staff_member_id,
    staffMemberName: maps.staffNameById.get(row.staff_member_id) ?? null,
    salaryStructureId: row.salary_structure_id,
    salaryStructureName: structure?.name ?? null,
    salaryStructureRole: structure?.role ?? null,
    salaryStructureActivityId: structure?.activityId ?? null,
    salaryStructureActivityName: structure?.activityName ?? null,
    salaryStructureRemunerationType: structure?.remunerationType ?? null,
    salaryStructurePaymentType: structure?.paymentType ?? null,
    salaryStructureDivisions: structure?.divisions ?? [],
    startDate: row.start_date,
    endDate: row.end_date,
    currentAmount: revision?.amount ?? null,
    currentRevisionId: revision?.id ?? null,
    currentRevisionEffectiveDate: revision?.effectiveDate ?? null,
    status: row.status,
    finalizedAt: row.finalized_at,
    finalizedReason: row.finalized_reason,
    finalizedByUserId: row.finalized_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByUserId: row.created_by_user_id,
    updatedByUserId: row.updated_by_user_id,
  };
}

// -------------------------------------------------------------------------
// Repository
// -------------------------------------------------------------------------

export const staffContractRepository = {
  async listForClub(
    clubId: string,
    filters: ListStaffContractsFilters = {},
  ): Promise<StaffContract[]> {
    const supabase = requireAdminClient("list_staff_contracts", { clubId });
    let query = supabase
      .from("staff_contracts")
      .select(CONTRACT_COLUMNS)
      .eq("club_id", clubId)
      .order("status", { ascending: true }) // vigente first
      .order("start_date", { ascending: false });
    if (filters.status) query = query.eq("status", filters.status);
    if (filters.staffMemberId) query = query.eq("staff_member_id", filters.staffMemberId);
    if (filters.salaryStructureId) {
      query = query.eq("salary_structure_id", filters.salaryStructureId);
    }
    const { data, error } = await query;
    if (error) throwRead("list_staff_contracts", { clubId }, error);
    const rows = (data ?? []) as ContractRow[];
    if (rows.length === 0) return [];

    const staffIds = Array.from(new Set(rows.map((r) => r.staff_member_id)));
    const structureIds = Array.from(new Set(rows.map((r) => r.salary_structure_id)));
    const contractIds = rows.map((r) => r.id);
    const maps = await fetchEnrichedMaps(supabase, {
      clubId,
      contractIds,
      staffMemberIds: staffIds,
      structureIds,
    });
    return rows.map((r) => mapContract(r, maps));
  },

  async getById(clubId: string, contractId: string): Promise<StaffContract | null> {
    const supabase = requireAdminClient("get_staff_contract", { clubId, contractId });
    const { data, error } = await supabase
      .from("staff_contracts")
      .select(CONTRACT_COLUMNS)
      .eq("id", contractId)
      .eq("club_id", clubId)
      .maybeSingle();
    if (error) throwRead("get_staff_contract", { clubId, contractId }, error);
    if (!data) return null;
    const row = data as ContractRow;
    const maps = await fetchEnrichedMaps(supabase, {
      clubId,
      contractIds: [row.id],
      staffMemberIds: [row.staff_member_id],
      structureIds: [row.salary_structure_id],
    });
    return mapContract(row, maps);
  },

  async hasActiveContractForStructure(
    clubId: string,
    structureId: string,
  ): Promise<boolean> {
    const supabase = requireAdminClient("has_active_contract_for_structure", {
      clubId,
      structureId,
    });
    const { count, error } = await supabase
      .from("staff_contracts")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("salary_structure_id", structureId)
      .eq("status", "vigente");
    if (error) throwRead("has_active_contract_for_structure", { clubId, structureId }, error);
    return (count ?? 0) > 0;
  },

  async create(input: CreateStaffContractInput): Promise<{
    ok: boolean;
    code: string;
    contract: StaffContract | null;
  }> {
    const supabase = requireAdminClient("create_staff_contract", { clubId: input.clubId });

    // Seed RLS variable antes de la RPC.
    const { error: setErr } = await supabase.rpc("set_current_club", {
      p_club_id: input.clubId,
    });
    if (setErr && setErr.code !== "42883") {
      console.warn("[staff-contract-repo] set_current_club failed", setErr);
    }

    const { data, error } = await supabase.rpc("hr_create_contract_with_initial_revision", {
      p_staff_member_id: input.staffMemberId,
      p_salary_structure_id: input.salaryStructureId,
      p_start_date: input.startDate,
      p_end_date: input.endDate,
      p_initial_amount: input.initialAmount,
      p_initial_revision_reason: input.initialRevisionReason,
    });

    if (error) {
      console.error("[staff-contract-repo] create rpc error", error);
      throw new StaffContractRepositoryInfraError(
        "rpc_failed",
        "hr_create_contract_with_initial_revision",
        { cause: error },
      );
    }

    const payload = (data ?? {}) as {
      ok?: boolean;
      code?: string;
      contract_id?: string;
      revision_id?: string;
    };
    if (!payload.ok || !payload.contract_id) {
      return {
        ok: false,
        code: String(payload.code ?? "unknown_error"),
        contract: null,
      };
    }

    const contract = await this.getById(input.clubId, payload.contract_id);
    return { ok: true, code: "created", contract };
  },

  async update(input: UpdateStaffContractInput): Promise<StaffContract | null> {
    const supabase = requireAdminClient("update_staff_contract", {
      clubId: input.clubId,
      contractId: input.contractId,
    });
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by_user_id: input.updatedByUserId,
    };
    if (input.patch.endDate !== undefined) patch.end_date = input.patch.endDate;

    const { error } = await supabase
      .from("staff_contracts")
      .update(patch)
      .eq("id", input.contractId)
      .eq("club_id", input.clubId);
    if (error) return throwWrite("update_staff_contract", input, error);

    return this.getById(input.clubId, input.contractId);
  },

  async finalize(params: {
    clubId: string;
    contractId: string;
    endDate: string;
    reason: string | null;
    actorUserId: string;
  }): Promise<{ ok: boolean; code: string }> {
    const supabase = requireAdminClient("rpc_hr_finalize_contract", params);
    const { error: setErr } = await supabase.rpc("set_current_club", {
      p_club_id: params.clubId,
    });
    if (setErr && setErr.code !== "42883") {
      console.warn("[staff-contract-repo] set_current_club failed", setErr);
    }

    const { data, error } = await supabase.rpc("hr_finalize_contract", {
      p_contract_id: params.contractId,
      p_end_date: params.endDate,
      p_reason: params.reason,
    });
    if (error) {
      console.error("[staff-contract-repo] rpc error", error);
      throw new StaffContractRepositoryInfraError(
        "rpc_failed",
        "hr_finalize_contract",
        { cause: error },
      );
    }
    const payload = (data ?? {}) as { ok?: boolean; code?: string };
    return {
      ok: Boolean(payload.ok),
      code: String(payload.code ?? "unknown_error"),
    };
  },

  async recordActivity(input: RecordActivityInput): Promise<void> {
    const supabase = requireAdminClient("record_staff_contract_activity", {
      clubId: input.clubId,
      entityId: input.entityId,
    });
    const { error } = await supabase.from("hr_activity_log").insert({
      club_id: input.clubId,
      entity_type: "staff_contract",
      entity_id: input.entityId,
      action: input.action,
      performed_by_user_id: input.actorUserId,
      payload_before: input.payloadBefore ?? null,
      payload_after: input.payloadAfter ?? null,
    });
    if (error) console.error("[staff-contract-repo] audit insert failed", error);
  },
};
