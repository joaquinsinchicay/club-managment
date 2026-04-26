/**
 * Repository for Payroll Settlements (US-61 / US-62 / US-63 / US-66).
 *
 * Handles reads over `payroll_settlements` + `payroll_settlement_adjustments`
 * and delegates the transactional workflows (generate, confirm, annul) to
 * SECURITY DEFINER RPCs. Writes over adjustments go through the admin
 * Supabase client; the DB trigger `payroll_settlement_adjustments_recalc`
 * keeps `adjustments_total` and `total_amount` in sync.
 */

import {
  MissingSupabaseAdminConfigError,
  createRequiredAdminSupabaseClient,
} from "@/lib/supabase/admin";
import type {
  PayrollAdjustmentType,
  PayrollSettlement,
  PayrollSettlementAdjustment,
  PayrollSettlementStatus,
} from "@/lib/domain/payroll-settlement";

// -------------------------------------------------------------------------
// Errors
// -------------------------------------------------------------------------

export class PayrollSettlementRepositoryInfraError extends Error {
  code: "admin_config_missing" | "read_failed" | "write_failed" | "rpc_failed";
  operation: string;

  constructor(
    code: "admin_config_missing" | "read_failed" | "write_failed" | "rpc_failed",
    operation: string,
    options?: { cause?: unknown },
  ) {
    super(
      code === "admin_config_missing"
        ? "Missing Supabase admin configuration for payroll settlements."
        : code === "read_failed"
        ? "Payroll settlement read failed."
        : code === "write_failed"
        ? "Payroll settlement write failed."
        : "Payroll settlement RPC failed.",
    );
    this.name = "PayrollSettlementRepositoryInfraError";
    this.code = code;
    this.operation = operation;
    if (options?.cause) (this as Error & { cause?: unknown }).cause = options.cause;
  }
}

export function isPayrollSettlementRepositoryInfraError(
  value: unknown,
): value is PayrollSettlementRepositoryInfraError {
  return value instanceof PayrollSettlementRepositoryInfraError;
}

function log(op: string, kind: "r" | "w", details: Record<string, unknown>, error?: unknown) {
  console.error(`[payroll-settlement-${kind === "r" ? "read" : "write"}-failure]`, {
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
      throw new PayrollSettlementRepositoryInfraError("admin_config_missing", op, { cause: error });
    }
    throw error;
  }
}
function throwRead(op: string, details: Record<string, unknown>, error?: unknown): never {
  log(op, "r", details, error);
  throw new PayrollSettlementRepositoryInfraError("read_failed", op, { cause: error });
}
function throwWrite(op: string, details: Record<string, unknown>, error?: unknown): never {
  log(op, "w", details, error);
  throw new PayrollSettlementRepositoryInfraError("write_failed", op, { cause: error });
}

// -------------------------------------------------------------------------
// Row shapes + mappers
// -------------------------------------------------------------------------

type SettlementRow = {
  id: string;
  club_id: string;
  contract_id: string;
  period_year: number;
  period_month: number;
  base_amount: number | string;
  adjustments_total: number | string;
  total_amount: number | string;
  hours_worked: number | string | null;
  classes_worked: number | null;
  requires_hours_input: boolean;
  notes: string | null;
  status: PayrollSettlementStatus;
  approved_at: string | null;
  approved_by_user_id: string | null;
  returned_at: string | null;
  returned_by_user_id: string | null;
  returned_by_role: "rrhh" | "tesoreria" | null;
  returned_reason: string | null;
  paid_at: string | null;
  paid_movement_id: string | null;
  annulled_at: string | null;
  annulled_reason: string | null;
  annulled_by_user_id: string | null;
  created_at: string;
  updated_at: string;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
};

type AdjustmentRow = {
  id: string;
  settlement_id: string;
  type: PayrollAdjustmentType;
  concept: string;
  amount: number | string;
  created_at: string;
  created_by_user_id: string | null;
};

const SETTLEMENT_COLUMNS =
  "id,club_id,contract_id,period_year,period_month,base_amount,adjustments_total,total_amount,hours_worked,classes_worked,requires_hours_input,notes,status,approved_at,approved_by_user_id,returned_at,returned_by_user_id,returned_by_role,returned_reason,paid_at,paid_movement_id,annulled_at,annulled_reason,annulled_by_user_id,created_at,updated_at,created_by_user_id,updated_by_user_id";

const ADJUSTMENT_COLUMNS =
  "id,settlement_id,type,concept,amount,created_at,created_by_user_id";

type EnrichmentMaps = {
  contractToMember: Map<string, { id: string; name: string }>;
  contractToStructure: Map<
    string,
    {
      id: string;
      name: string;
      role: string;
      activityId: string | null;
      activityName: string | null;
      remunerationType: string;
    }
  >;
};

async function fetchEnrichment(
  supabase: ReturnType<typeof requireAdminClient>,
  clubId: string,
  contractIds: string[],
): Promise<EnrichmentMaps> {
  const maps: EnrichmentMaps = {
    contractToMember: new Map(),
    contractToStructure: new Map(),
  };
  if (contractIds.length === 0) return maps;

  const { data, error } = await supabase
    .from("staff_contracts")
    .select(
      "id,staff_member_id,salary_structure_id,staff_member:staff_members(first_name,last_name),structure:salary_structures(name,functional_role,remuneration_type,activity_id,activity:club_activities(name))",
    )
    .in("id", contractIds)
    .eq("club_id", clubId);
  if (error) throwRead("fetch_enrichment_contracts", { clubId }, error);

  type Raw = {
    id: string;
    staff_member_id: string;
    salary_structure_id: string;
    staff_member:
      | { first_name: string; last_name: string }
      | { first_name: string; last_name: string }[]
      | null;
    structure:
      | {
          name: string;
          functional_role: string;
          remuneration_type: string;
          activity_id: string | null;
          activity: { name: string } | { name: string }[] | null;
        }
      | null
      | Array<{
          name: string;
          functional_role: string;
          remuneration_type: string;
          activity_id: string | null;
          activity: { name: string } | { name: string }[] | null;
        }>;
  };
  const rows = (data ?? []) as unknown as Raw[];

  for (const row of rows) {
    const memberValue = Array.isArray(row.staff_member)
      ? row.staff_member[0] ?? null
      : row.staff_member;
    if (memberValue) {
      maps.contractToMember.set(row.id, {
        id: row.staff_member_id,
        name: `${memberValue.first_name} ${memberValue.last_name}`.trim(),
      });
    }
    const structureValue = Array.isArray(row.structure)
      ? row.structure[0] ?? null
      : row.structure;
    if (structureValue) {
      const activityValue = Array.isArray(structureValue.activity)
        ? structureValue.activity[0] ?? null
        : structureValue.activity;
      maps.contractToStructure.set(row.id, {
        id: row.salary_structure_id,
        name: structureValue.name,
        role: structureValue.functional_role,
        activityId: structureValue.activity_id,
        activityName: activityValue?.name ?? null,
        remunerationType: structureValue.remuneration_type,
      });
    }
  }
  return maps;
}

function mapSettlement(row: SettlementRow, maps: EnrichmentMaps): PayrollSettlement {
  const member = maps.contractToMember.get(row.contract_id);
  const structure = maps.contractToStructure.get(row.contract_id);
  return {
    id: row.id,
    clubId: row.club_id,
    contractId: row.contract_id,
    staffMemberId: member?.id ?? null,
    staffMemberName: member?.name ?? null,
    salaryStructureId: structure?.id ?? null,
    salaryStructureName: structure?.name ?? null,
    salaryStructureRole: structure?.role ?? null,
    salaryStructureActivityId: structure?.activityId ?? null,
    salaryStructureActivityName: structure?.activityName ?? null,
    remunerationType: structure?.remunerationType ?? null,
    periodYear: row.period_year,
    periodMonth: row.period_month,
    baseAmount: Number(row.base_amount),
    adjustmentsTotal: Number(row.adjustments_total),
    totalAmount: Number(row.total_amount),
    hoursWorked: row.hours_worked === null ? 0 : Number(row.hours_worked),
    classesWorked: row.classes_worked ?? 0,
    requiresHoursInput: row.requires_hours_input,
    notes: row.notes,
    status: row.status,
    approvedAt: row.approved_at,
    approvedByUserId: row.approved_by_user_id,
    returnedAt: row.returned_at,
    returnedByUserId: row.returned_by_user_id,
    returnedByRole: row.returned_by_role,
    returnedReason: row.returned_reason,
    paidAt: row.paid_at,
    paidMovementId: row.paid_movement_id,
    annulledAt: row.annulled_at,
    annulledReason: row.annulled_reason,
    annulledByUserId: row.annulled_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByUserId: row.created_by_user_id,
    updatedByUserId: row.updated_by_user_id,
  };
}

function mapAdjustment(row: AdjustmentRow): PayrollSettlementAdjustment {
  return {
    id: row.id,
    settlementId: row.settlement_id,
    type: row.type,
    concept: row.concept,
    amount: Number(row.amount),
    createdAt: row.created_at,
    createdByUserId: row.created_by_user_id,
  };
}

// -------------------------------------------------------------------------
// Input shapes
// -------------------------------------------------------------------------

export type ListSettlementsFilters = {
  status?: PayrollSettlementStatus | null;
  periodYear?: number | null;
  periodMonth?: number | null;
  staffMemberId?: string | null;
  salaryStructureId?: string | null;
};

export type AddAdjustmentInput = {
  clubId: string;
  settlementId: string;
  type: PayrollAdjustmentType;
  concept: string;
  amount: number;
  createdByUserId: string;
};

export type UpdateAdjustmentInput = {
  clubId: string;
  settlementId: string;
  adjustmentId: string;
  type?: PayrollAdjustmentType;
  concept?: string;
  amount?: number;
};

export type UpdateSettlementFieldsInput = {
  clubId: string;
  settlementId: string;
  updatedByUserId: string;
  patch: {
    hoursWorked?: number;
    classesWorked?: number;
    baseAmount?: number;
    notes?: string | null;
    requiresHoursInput?: boolean;
  };
};

// -------------------------------------------------------------------------
// Helper used by the UI + service
// -------------------------------------------------------------------------

function recalcTotalAmount(baseAmount: number, adjustments: PayrollSettlementAdjustment[]) {
  const adjustmentsTotal = adjustments.reduce(
    (acc, adj) => acc + (adj.type === "descuento" ? -adj.amount : adj.amount),
    0,
  );
  return {
    adjustmentsTotal,
    totalAmount: baseAmount + adjustmentsTotal,
  };
}

// -------------------------------------------------------------------------
// Repository
// -------------------------------------------------------------------------

export const payrollSettlementRepository = {
  async listForClub(
    clubId: string,
    filters: ListSettlementsFilters = {},
  ): Promise<PayrollSettlement[]> {
    const supabase = requireAdminClient("list_payroll_settlements", { clubId });
    let query = supabase
      .from("payroll_settlements")
      .select(SETTLEMENT_COLUMNS)
      .eq("club_id", clubId)
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false });

    if (filters.status) query = query.eq("status", filters.status);
    if (filters.periodYear) query = query.eq("period_year", filters.periodYear);
    if (filters.periodMonth) query = query.eq("period_month", filters.periodMonth);

    if (filters.staffMemberId || filters.salaryStructureId) {
      // Filter by contract's staff or structure via a pre-query.
      let contractsQuery = supabase
        .from("staff_contracts")
        .select("id")
        .eq("club_id", clubId);
      if (filters.staffMemberId) {
        contractsQuery = contractsQuery.eq("staff_member_id", filters.staffMemberId);
      }
      if (filters.salaryStructureId) {
        contractsQuery = contractsQuery.eq("salary_structure_id", filters.salaryStructureId);
      }
      const { data: contracts, error: contractsErr } = await contractsQuery;
      if (contractsErr) {
        throwRead("list_payroll_settlements.contracts_filter", { clubId }, contractsErr);
      }
      const ids = (contracts ?? []).map((c: { id: string }) => c.id);
      if (ids.length === 0) return [];
      query = query.in("contract_id", ids);
    }

    const { data, error } = await query;
    if (error) throwRead("list_payroll_settlements", { clubId }, error);
    const rows = (data ?? []) as SettlementRow[];
    if (rows.length === 0) return [];

    const contractIds = Array.from(new Set(rows.map((r) => r.contract_id)));
    const maps = await fetchEnrichment(supabase, clubId, contractIds);
    return rows.map((r) => mapSettlement(r, maps));
  },

  async listForContract(
    clubId: string,
    contractId: string,
    limit?: number,
  ): Promise<PayrollSettlement[]> {
    const supabase = requireAdminClient("list_payroll_settlements_for_contract", {
      clubId,
      contractId,
    });
    let query = supabase
      .from("payroll_settlements")
      .select(SETTLEMENT_COLUMNS)
      .eq("club_id", clubId)
      .eq("contract_id", contractId)
      .order("period_year", { ascending: false })
      .order("period_month", { ascending: false });
    if (limit && limit > 0) query = query.limit(limit);

    const { data, error } = await query;
    if (error) throwRead("list_payroll_settlements_for_contract", { clubId, contractId }, error);
    const rows = (data ?? []) as SettlementRow[];
    if (rows.length === 0) return [];
    const maps = await fetchEnrichment(supabase, clubId, [contractId]);
    return rows.map((r) => mapSettlement(r, maps));
  },

  async getById(clubId: string, settlementId: string): Promise<PayrollSettlement | null> {
    const supabase = requireAdminClient("get_payroll_settlement", { clubId, settlementId });
    const { data, error } = await supabase
      .from("payroll_settlements")
      .select(SETTLEMENT_COLUMNS)
      .eq("id", settlementId)
      .eq("club_id", clubId)
      .maybeSingle();
    if (error) throwRead("get_payroll_settlement", { clubId, settlementId }, error);
    if (!data) return null;
    const row = data as SettlementRow;
    const maps = await fetchEnrichment(supabase, clubId, [row.contract_id]);
    return mapSettlement(row, maps);
  },

  async listAdjustments(
    clubId: string,
    settlementId: string,
  ): Promise<PayrollSettlementAdjustment[]> {
    const supabase = requireAdminClient("list_payroll_settlement_adjustments", {
      clubId,
      settlementId,
    });
    // Guard: settlement belongs to the club.
    const { data: guard } = await supabase
      .from("payroll_settlements")
      .select("id")
      .eq("id", settlementId)
      .eq("club_id", clubId)
      .maybeSingle();
    if (!guard) return [];

    const { data, error } = await supabase
      .from("payroll_settlement_adjustments")
      .select(ADJUSTMENT_COLUMNS)
      .eq("settlement_id", settlementId)
      .order("created_at", { ascending: true });
    if (error) {
      throwRead("list_payroll_settlement_adjustments", { clubId, settlementId }, error);
    }
    return (data ?? []).map((r) => mapAdjustment(r as AdjustmentRow));
  },

  async addAdjustment(input: AddAdjustmentInput): Promise<PayrollSettlementAdjustment> {
    const supabase = requireAdminClient("add_payroll_adjustment", { ...input });
    const { data, error } = await supabase
      .from("payroll_settlement_adjustments")
      .insert({
        settlement_id: input.settlementId,
        type: input.type,
        concept: input.concept,
        amount: input.amount,
        created_by_user_id: input.createdByUserId,
      })
      .select(ADJUSTMENT_COLUMNS)
      .single();
    if (error || !data) return throwWrite("add_payroll_adjustment", { ...input }, error);
    return mapAdjustment(data as AdjustmentRow);
  },

  async updateAdjustment(
    input: UpdateAdjustmentInput,
  ): Promise<PayrollSettlementAdjustment | null> {
    const supabase = requireAdminClient("update_payroll_adjustment", { ...input });
    const patch: Record<string, unknown> = {};
    if (input.type !== undefined) patch.type = input.type;
    if (input.concept !== undefined) patch.concept = input.concept;
    if (input.amount !== undefined) patch.amount = input.amount;

    const { data, error } = await supabase
      .from("payroll_settlement_adjustments")
      .update(patch)
      .eq("id", input.adjustmentId)
      .eq("settlement_id", input.settlementId)
      .select(ADJUSTMENT_COLUMNS)
      .maybeSingle();
    if (error) return throwWrite("update_payroll_adjustment", { ...input }, error);
    return data ? mapAdjustment(data as AdjustmentRow) : null;
  },

  async deleteAdjustment(params: {
    clubId: string;
    settlementId: string;
    adjustmentId: string;
  }): Promise<void> {
    const supabase = requireAdminClient("delete_payroll_adjustment", params);
    const { error } = await supabase
      .from("payroll_settlement_adjustments")
      .delete()
      .eq("id", params.adjustmentId)
      .eq("settlement_id", params.settlementId);
    if (error) throwWrite("delete_payroll_adjustment", params, error);
  },

  async updateFields(input: UpdateSettlementFieldsInput): Promise<PayrollSettlement | null> {
    const supabase = requireAdminClient("update_payroll_settlement_fields", {
      clubId: input.clubId,
      settlementId: input.settlementId,
    });
    const patch: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
      updated_by_user_id: input.updatedByUserId,
    };
    if (input.patch.hoursWorked !== undefined) patch.hours_worked = input.patch.hoursWorked;
    if (input.patch.classesWorked !== undefined) patch.classes_worked = input.patch.classesWorked;
    if (input.patch.baseAmount !== undefined) patch.base_amount = input.patch.baseAmount;
    if (input.patch.notes !== undefined) patch.notes = input.patch.notes;
    if (input.patch.requiresHoursInput !== undefined) {
      patch.requires_hours_input = input.patch.requiresHoursInput;
    }

    const { error } = await supabase
      .from("payroll_settlements")
      .update(patch)
      .eq("id", input.settlementId)
      .eq("club_id", input.clubId);
    if (error) return throwWrite("update_payroll_settlement_fields", input, error);

    // The DB trigger recalculates adjustments_total and total_amount whenever
    // adjustments change. Base amount changes require an explicit recalc
    // because the trigger doesn't listen on the settlement itself.
    if (input.patch.baseAmount !== undefined) {
      const adjustments = await this.listAdjustments(input.clubId, input.settlementId);
      const { adjustmentsTotal, totalAmount } = recalcTotalAmount(
        input.patch.baseAmount,
        adjustments,
      );
      const { error: recalcErr } = await supabase
        .from("payroll_settlements")
        .update({
          adjustments_total: adjustmentsTotal,
          total_amount: totalAmount,
        })
        .eq("id", input.settlementId)
        .eq("club_id", input.clubId);
      if (recalcErr) throwWrite("update_payroll_settlement_fields.recalc", input, recalcErr);
    }

    return this.getById(input.clubId, input.settlementId);
  },

  async callGenerateMonthly(params: {
    clubId: string;
    year: number;
    month: number;
  }): Promise<{ ok: boolean; code: string; generatedCount: number; skippedCount: number; errorCount: number }> {
    const supabase = requireAdminClient("rpc_hr_generate_monthly_settlements", params);
    const { data, error } = await supabase.rpc("hr_generate_monthly_settlements", {
      p_club_id: params.clubId,
      p_year: params.year,
      p_month: params.month,
    });
    if (error) {
      throw new PayrollSettlementRepositoryInfraError(
        "rpc_failed",
        "hr_generate_monthly_settlements",
        { cause: error },
      );
    }
    const payload = (data ?? {}) as {
      ok?: boolean;
      code?: string;
      generated_count?: number;
      skipped_count?: number;
      error_count?: number;
    };
    return {
      ok: Boolean(payload.ok),
      code: String(payload.code ?? "unknown_error"),
      generatedCount: Number(payload.generated_count ?? 0),
      skippedCount: Number(payload.skipped_count ?? 0),
      errorCount: Number(payload.error_count ?? 0),
    };
  },

  async callApprove(params: {
    clubId: string;
    settlementId: string;
    approveZero: boolean;
  }): Promise<{ ok: boolean; code: string }> {
    const supabase = requireAdminClient("rpc_hr_approve_settlement", params);
    const { error: setErr } = await supabase.rpc("set_current_club", {
      p_club_id: params.clubId,
    });
    if (setErr && setErr.code !== "42883") {
      console.warn("[payroll-settlement-repo] set_current_club failed", setErr);
    }
    const { data, error } = await supabase.rpc("hr_approve_settlement", {
      p_settlement_id: params.settlementId,
      p_approve_zero: params.approveZero,
    });
    if (error) {
      throw new PayrollSettlementRepositoryInfraError("rpc_failed", "hr_approve_settlement", {
        cause: error,
      });
    }
    const payload = (data ?? {}) as { ok?: boolean; code?: string };
    return { ok: Boolean(payload.ok), code: String(payload.code ?? "unknown_error") };
  },

  async callApproveBulk(params: {
    clubId: string;
    ids: string[];
    approveZero: boolean;
  }): Promise<{
    ok: boolean;
    code: string;
    approvedCount: number;
    skippedCount: number;
    errors: Array<{ id: string; code: string }>;
  }> {
    const supabase = requireAdminClient("rpc_hr_approve_settlements_bulk", {
      clubId: params.clubId,
      count: params.ids.length,
    });
    const { error: setErr } = await supabase.rpc("set_current_club", {
      p_club_id: params.clubId,
    });
    if (setErr && setErr.code !== "42883") {
      console.warn("[payroll-settlement-repo] set_current_club failed", setErr);
    }
    const { data, error } = await supabase.rpc("hr_approve_settlements_bulk", {
      p_ids: params.ids,
      p_approve_zero: params.approveZero,
    });
    if (error) {
      throw new PayrollSettlementRepositoryInfraError(
        "rpc_failed",
        "hr_approve_settlements_bulk",
        { cause: error },
      );
    }
    const payload = (data ?? {}) as {
      ok?: boolean;
      code?: string;
      approved_count?: number;
      skipped_count?: number;
      errors?: Array<{ id: string; code: string }>;
    };
    return {
      ok: Boolean(payload.ok),
      code: String(payload.code ?? "unknown_error"),
      approvedCount: Number(payload.approved_count ?? 0),
      skippedCount: Number(payload.skipped_count ?? 0),
      errors: Array.isArray(payload.errors) ? payload.errors : [],
    };
  },

  async callReturnToGenerated(params: {
    clubId: string;
    settlementId: string;
    reason: string;
  }): Promise<{ ok: boolean; code: string; returnedByRole: "rrhh" | "tesoreria" | null }> {
    const supabase = requireAdminClient("rpc_hr_return_settlement_to_generated", params);
    const { error: setErr } = await supabase.rpc("set_current_club", {
      p_club_id: params.clubId,
    });
    if (setErr && setErr.code !== "42883") {
      console.warn("[payroll-settlement-repo] set_current_club failed", setErr);
    }
    const { data, error } = await supabase.rpc("hr_return_settlement_to_generated", {
      p_settlement_id: params.settlementId,
      p_reason: params.reason,
    });
    if (error) {
      throw new PayrollSettlementRepositoryInfraError(
        "rpc_failed",
        "hr_return_settlement_to_generated",
        { cause: error },
      );
    }
    const payload = (data ?? {}) as {
      ok?: boolean;
      code?: string;
      returned_by_role?: "rrhh" | "tesoreria";
    };
    return {
      ok: Boolean(payload.ok),
      code: String(payload.code ?? "unknown_error"),
      returnedByRole: payload.returned_by_role ?? null,
    };
  },

  async callAnnul(params: {
    clubId: string;
    settlementId: string;
    reason: string | null;
  }): Promise<{ ok: boolean; code: string }> {
    const supabase = requireAdminClient("rpc_hr_annul_settlement", params);
    const { error: setErr } = await supabase.rpc("set_current_club", {
      p_club_id: params.clubId,
    });
    if (setErr && setErr.code !== "42883") {
      console.warn("[payroll-settlement-repo] set_current_club failed", setErr);
    }
    const { data, error } = await supabase.rpc("hr_annul_settlement", {
      p_settlement_id: params.settlementId,
      p_reason: params.reason,
    });
    if (error) {
      throw new PayrollSettlementRepositoryInfraError("rpc_failed", "hr_annul_settlement", {
        cause: error,
      });
    }
    const payload = (data ?? {}) as { ok?: boolean; code?: string };
    return { ok: Boolean(payload.ok), code: String(payload.code ?? "unknown_error") };
  },

  async recordActivity(input: {
    clubId: string;
    entityId: string;
    action: string;
    actorUserId: string | null;
    payloadBefore?: Record<string, unknown> | null;
    payloadAfter?: Record<string, unknown> | null;
  }): Promise<void> {
    const supabase = requireAdminClient("record_payroll_settlement_activity", input);
    const { error } = await supabase.from("hr_activity_log").insert({
      club_id: input.clubId,
      entity_type: "payroll_settlement",
      entity_id: input.entityId,
      action: input.action,
      performed_by_user_id: input.actorUserId,
      payload_before: input.payloadBefore ?? null,
      payload_after: input.payloadAfter ?? null,
    });
    if (error) console.error("[payroll-settlement-repo] audit insert failed", error);
  },
};
