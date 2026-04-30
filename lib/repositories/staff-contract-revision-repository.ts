/**
 * Repository para Revisiones Salariales por contrato (US-34 / US-35).
 *
 * Wraps:
 *  - Listado de revisiones de un contrato (ordenadas por fecha).
 *  - Lectura de la revisión vigente (end_date is null).
 *  - RPC `hr_create_salary_revision` (cierra vigente + abre nueva).
 *  - RPC `hr_create_salary_revisions_bulk` (ajuste masivo transaccional).
 *
 * Cada operación usa el admin client y propaga el `app.current_club_id`
 * antes de la RPC. Los errores infra se envuelven en
 * `StaffContractRevisionRepositoryInfraError`.
 */

import {
  MissingSupabaseAdminConfigError,
  createRequiredAdminSupabaseClient,
} from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";
import type {
  SalaryRevisionAdjustmentType,
  StaffContractRevision,
} from "@/lib/domain/staff-contract-revision";

export class StaffContractRevisionRepositoryInfraError extends Error {
  code: "admin_config_missing" | "write_failed" | "read_failed" | "rpc_failed";
  operation: string;

  constructor(
    code: "admin_config_missing" | "write_failed" | "read_failed" | "rpc_failed",
    operation: string,
    options?: { cause?: unknown },
  ) {
    super(
      code === "admin_config_missing"
        ? "Missing Supabase admin configuration for contract revisions."
        : code === "write_failed"
        ? "Contract revision write failed."
        : code === "read_failed"
        ? "Contract revision read failed."
        : "Contract revision RPC failed.",
    );
    this.name = "StaffContractRevisionRepositoryInfraError";
    this.code = code;
    this.operation = operation;
    if (options?.cause) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export function isStaffContractRevisionRepositoryInfraError(
  value: unknown,
): value is StaffContractRevisionRepositoryInfraError {
  return value instanceof StaffContractRevisionRepositoryInfraError;
}

function requireAdminClient(operation: string, details: Record<string, unknown>) {
  try {
    return createRequiredAdminSupabaseClient();
  } catch (error) {
    if (error instanceof MissingSupabaseAdminConfigError) {
      throw new StaffContractRevisionRepositoryInfraError("admin_config_missing", operation, {
        cause: error,
      });
    }
    throw error;
  }
}

type RevisionRow = {
  id: string;
  club_id: string;
  contract_id: string;
  amount: number | string;
  effective_date: string;
  end_date: string | null;
  reason: string | null;
  created_at: string;
  created_by_user_id: string | null;
};

const REVISION_COLUMNS =
  "id,club_id,contract_id,amount,effective_date,end_date,reason,created_at,created_by_user_id";

function mapRevision(row: RevisionRow): StaffContractRevision {
  return {
    id: row.id,
    clubId: row.club_id,
    contractId: row.contract_id,
    amount: Number(row.amount),
    effectiveDate: row.effective_date,
    endDate: row.end_date,
    reason: row.reason,
    createdAt: row.created_at,
    createdByUserId: row.created_by_user_id,
  };
}

async function seedClubId(
  supabase: ReturnType<typeof requireAdminClient>,
  clubId: string,
) {
  const { error } = await supabase.rpc("set_current_club", { p_club_id: clubId });
  if (error && error.code !== "42883") {
    logger.warn("[staff-contract-revision-repo] set_current_club failed", error);
  }
}

export const staffContractRevisionRepository = {
  async listForContract(
    clubId: string,
    contractId: string,
  ): Promise<StaffContractRevision[]> {
    const supabase = requireAdminClient("list_contract_revisions", { clubId, contractId });
    const { data, error } = await supabase
      .from("staff_contract_revisions")
      .select(REVISION_COLUMNS)
      .eq("club_id", clubId)
      .eq("contract_id", contractId)
      .order("effective_date", { ascending: false });
    if (error) {
      throw new StaffContractRevisionRepositoryInfraError(
        "read_failed",
        "list_contract_revisions",
        { cause: error },
      );
    }
    return ((data ?? []) as RevisionRow[]).map(mapRevision);
  },

  async getCurrentForContract(
    clubId: string,
    contractId: string,
  ): Promise<StaffContractRevision | null> {
    const supabase = requireAdminClient("get_current_revision", { clubId, contractId });
    const { data, error } = await supabase
      .from("staff_contract_revisions")
      .select(REVISION_COLUMNS)
      .eq("club_id", clubId)
      .eq("contract_id", contractId)
      .is("end_date", null)
      .maybeSingle();
    if (error) {
      throw new StaffContractRevisionRepositoryInfraError(
        "read_failed",
        "get_current_revision",
        { cause: error },
      );
    }
    return data ? mapRevision(data as RevisionRow) : null;
  },

  async createRevision(params: {
    clubId: string;
    contractId: string;
    amount: number;
    effectiveDate: string;
    reason: string | null;
  }): Promise<{ ok: boolean; code: string; revisionId: string | null }> {
    const supabase = requireAdminClient("rpc_hr_create_salary_revision", params);
    await seedClubId(supabase, params.clubId);

    const { data, error } = await supabase.rpc("hr_create_salary_revision", {
      p_contract_id: params.contractId,
      p_amount: params.amount,
      p_effective_date: params.effectiveDate,
      p_reason: params.reason,
    });

    if (error) {
      logger.error("[staff-contract-revision-repo] rpc error", error);
      throw new StaffContractRevisionRepositoryInfraError(
        "rpc_failed",
        "hr_create_salary_revision",
        { cause: error },
      );
    }

    const payload = (data ?? {}) as {
      ok?: boolean;
      code?: string;
      revision_id?: string;
    };
    return {
      ok: Boolean(payload.ok),
      code: String(payload.code ?? "unknown_error"),
      revisionId: payload.revision_id ?? null,
    };
  },

  async bulkRevision(params: {
    clubId: string;
    contractIds: string[];
    adjustmentType: SalaryRevisionAdjustmentType;
    value: number;
    effectiveDate: string;
    reason: string;
  }): Promise<{
    ok: boolean;
    code: string;
    createdCount: number;
    created: Array<{
      contractId: string;
      revisionId: string;
      previousAmount: number;
      newAmount: number;
    }>;
  }> {
    const supabase = requireAdminClient("rpc_hr_create_salary_revisions_bulk", params);
    await seedClubId(supabase, params.clubId);

    const { data, error } = await supabase.rpc("hr_create_salary_revisions_bulk", {
      p_contract_ids: params.contractIds,
      p_adjustment_type: params.adjustmentType,
      p_value: params.value,
      p_effective_date: params.effectiveDate,
      p_reason: params.reason,
    });

    if (error) {
      logger.error("[staff-contract-revision-repo] bulk rpc error", error);
      throw new StaffContractRevisionRepositoryInfraError(
        "rpc_failed",
        "hr_create_salary_revisions_bulk",
        { cause: error },
      );
    }

    const payload = (data ?? {}) as {
      ok?: boolean;
      code?: string;
      created_count?: number;
      created?: Array<{
        contract_id: string;
        revision_id: string;
        previous_amount: number | string;
        new_amount: number | string;
      }>;
    };
    return {
      ok: Boolean(payload.ok),
      code: String(payload.code ?? "unknown_error"),
      createdCount: Number(payload.created_count ?? 0),
      created: (payload.created ?? []).map((c) => ({
        contractId: c.contract_id,
        revisionId: c.revision_id,
        previousAmount: Number(c.previous_amount),
        newAmount: Number(c.new_amount),
      })),
    };
  },
};
