/**
 * Repository for Cost Centers (US-52 / US-53).
 *
 * Keeps all DB access for `cost_centers`, `treasury_movement_cost_centers`
 * and `cost_center_audit_log` in a single module so the service layer
 * (`lib/services/cost-center-service.ts`) can orchestrate business logic
 * without touching Supabase directly.
 *
 *  - Reads use the server client and rely on RLS + `club_id` filter.
 *  - Writes go through the admin client following the same pattern used by
 *    the rest of the treasury settings module.
 */

import {
  MissingSupabaseAdminConfigError,
  createRequiredAdminSupabaseClient
} from "@/lib/supabase/admin";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import type {
  CostCenter,
  CostCenterAggregates,
  CostCenterAuditActionType,
  CostCenterAuditEntry,
  CostCenterMovementLink,
  CostCenterPeriodicity,
  CostCenterStatus,
  CostCenterType
} from "@/lib/domain/cost-center";

// -------------------------------------------------------------------------
// Errors
// -------------------------------------------------------------------------

export class CostCenterRepositoryInfraError extends Error {
  code: "admin_config_missing" | "write_failed" | "read_failed";
  operation: string;

  constructor(
    code: "admin_config_missing" | "write_failed" | "read_failed",
    operation: string,
    options?: { cause?: unknown }
  ) {
    super(
      code === "admin_config_missing"
        ? "Missing Supabase admin configuration for cost centers."
        : code === "write_failed"
          ? "Cost center write failed."
          : "Cost center read failed."
    );
    this.name = "CostCenterRepositoryInfraError";
    this.code = code;
    this.operation = operation;
    if (options?.cause) {
      (this as Error & { cause?: unknown }).cause = options.cause;
    }
  }
}

export function isCostCenterRepositoryInfraError(
  value: unknown
): value is CostCenterRepositoryInfraError {
  return value instanceof CostCenterRepositoryInfraError;
}

function logWriteFailure(operation: string, details: Record<string, unknown>, error?: unknown) {
  console.error("[cost-center-write-failure]", { operation, ...details, error });
}

function logReadFailure(operation: string, details: Record<string, unknown>, error?: unknown) {
  console.error("[cost-center-read-failure]", { operation, ...details, error });
}

function requireAdminClient(operation: string, details: Record<string, unknown>) {
  try {
    return createRequiredAdminSupabaseClient();
  } catch (error) {
    logWriteFailure(operation, { codePath: "admin", ...details }, error);
    if (error instanceof MissingSupabaseAdminConfigError) {
      throw new CostCenterRepositoryInfraError("admin_config_missing", operation, { cause: error });
    }
    throw error;
  }
}

function throwWriteFailure(
  operation: string,
  details: Record<string, unknown>,
  error?: unknown
): never {
  logWriteFailure(operation, details, error);
  throw new CostCenterRepositoryInfraError("write_failed", operation, { cause: error });
}

// -------------------------------------------------------------------------
// Row mappers
// -------------------------------------------------------------------------

type CostCenterRow = {
  id: string;
  club_id: string;
  name: string;
  description: string | null;
  type: CostCenterType;
  status: CostCenterStatus;
  start_date: string;
  end_date: string | null;
  currency_code: string;
  amount: number | string | null;
  periodicity: CostCenterPeriodicity | null;
  responsible_user_id: string | null;
  created_by_user_id: string | null;
  updated_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

function mapCostCenterRow(row: CostCenterRow): CostCenter {
  return {
    id: row.id,
    clubId: row.club_id,
    name: row.name,
    description: row.description,
    type: row.type,
    status: row.status,
    startDate: row.start_date,
    endDate: row.end_date,
    currencyCode: row.currency_code,
    amount: row.amount === null ? null : Number(row.amount),
    periodicity: row.periodicity,
    responsibleUserId: row.responsible_user_id,
    createdByUserId: row.created_by_user_id,
    updatedByUserId: row.updated_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

type AuditRow = {
  id: string;
  cost_center_id: string;
  actor_user_id: string | null;
  action_type: CostCenterAuditActionType;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  payload_before: Record<string, unknown> | null;
  payload_after: Record<string, unknown> | null;
  changed_at: string;
};

function mapAuditRow(row: AuditRow): CostCenterAuditEntry {
  return {
    id: row.id,
    costCenterId: row.cost_center_id,
    actorUserId: row.actor_user_id,
    actionType: row.action_type,
    field: row.field,
    oldValue: row.old_value,
    newValue: row.new_value,
    payloadBefore: row.payload_before,
    payloadAfter: row.payload_after,
    changedAt: row.changed_at
  };
}

const COST_CENTER_COLUMNS =
  "id,club_id,name,description,type,status,start_date,end_date,currency_code,amount,periodicity,responsible_user_id,created_by_user_id,updated_by_user_id,created_at,updated_at";

// -------------------------------------------------------------------------
// Input shapes
// -------------------------------------------------------------------------

export type CreateCostCenterInput = {
  clubId: string;
  name: string;
  description: string | null;
  type: CostCenterType;
  status: CostCenterStatus;
  startDate: string;
  endDate: string | null;
  currencyCode: string;
  amount: number | null;
  periodicity: CostCenterPeriodicity | null;
  responsibleUserId: string | null;
  createdByUserId: string;
};

export type UpdateCostCenterInput = {
  costCenterId: string;
  clubId: string;
  updatedByUserId: string;
  patch: {
    name?: string;
    description?: string | null;
    type?: CostCenterType;
    status?: CostCenterStatus;
    startDate?: string;
    endDate?: string | null;
    currencyCode?: string;
    amount?: number | null;
    periodicity?: CostCenterPeriodicity | null;
    responsibleUserId?: string | null;
  };
};

export type ListCostCentersFilters = {
  type?: CostCenterType | null;
  status?: CostCenterStatus | null;
  responsibleUserId?: string | null;
  search?: string | null;
};

export type LinkMovementToCostCentersInput = {
  clubId: string;
  movementId: string;
  costCenterIds: string[];
  createdByUserId: string;
};

export type UnlinkMovementFromCostCenterInput = {
  clubId: string;
  movementId: string;
  costCenterId: string;
};

export type RecordAuditInput = {
  costCenterId: string;
  actorUserId: string;
  actionType: CostCenterAuditActionType;
  field?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  payloadBefore?: Record<string, unknown> | null;
  payloadAfter?: Record<string, unknown> | null;
};

// -------------------------------------------------------------------------
// Repository
// -------------------------------------------------------------------------

export const costCenterRepository = {
  async listForClub(
    clubId: string,
    filters: ListCostCentersFilters = {}
  ): Promise<CostCenter[]> {
    const supabase = createServerSupabaseClient();
    let query = supabase
      .from("cost_centers")
      .select(COST_CENTER_COLUMNS)
      .eq("club_id", clubId)
      .order("created_at", { ascending: false });

    if (filters.type) {
      query = query.eq("type", filters.type);
    }
    if (filters.status) {
      query = query.eq("status", filters.status);
    }
    if (filters.responsibleUserId) {
      query = query.eq("responsible_user_id", filters.responsibleUserId);
    }
    if (filters.search) {
      const escaped = filters.search.replace(/[%_]/g, (match) => `\\${match}`);
      query = query.ilike("name", `%${escaped}%`);
    }

    const { data, error } = await query;
    if (error) {
      logReadFailure("list_cost_centers_for_club", { clubId }, error);
      throw new CostCenterRepositoryInfraError("read_failed", "list_cost_centers_for_club", {
        cause: error
      });
    }
    return (data ?? []).map(mapCostCenterRow);
  },

  async getById(clubId: string, costCenterId: string): Promise<CostCenter | null> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("cost_centers")
      .select(COST_CENTER_COLUMNS)
      .eq("id", costCenterId)
      .eq("club_id", clubId)
      .maybeSingle();

    if (error) {
      logReadFailure("get_cost_center_by_id", { clubId, costCenterId }, error);
      throw new CostCenterRepositoryInfraError("read_failed", "get_cost_center_by_id", {
        cause: error
      });
    }

    return data ? mapCostCenterRow(data) : null;
  },

  async existsByName(params: {
    clubId: string;
    name: string;
    excludingCostCenterId?: string | null;
  }): Promise<boolean> {
    const supabase = createServerSupabaseClient();
    const normalized = params.name.trim().toLocaleLowerCase("es-AR");

    let query = supabase
      .from("cost_centers")
      .select("id", { head: true, count: "exact" })
      .eq("club_id", params.clubId)
      // Lower-cased comparison — matches the unique index on (club_id, lower(trim(name))).
      .ilike("name", normalized);

    if (params.excludingCostCenterId) {
      query = query.neq("id", params.excludingCostCenterId);
    }

    const { count, error } = await query;
    if (error) {
      logReadFailure("exists_cost_center_by_name", params, error);
      throw new CostCenterRepositoryInfraError("read_failed", "exists_cost_center_by_name", {
        cause: error
      });
    }
    return (count ?? 0) > 0;
  },

  async hasLinkedMovements(costCenterId: string): Promise<boolean> {
    const supabase = createServerSupabaseClient();
    const { count, error } = await supabase
      .from("treasury_movement_cost_centers")
      .select("cost_center_id", { head: true, count: "exact" })
      .eq("cost_center_id", costCenterId);

    if (error) {
      logReadFailure("has_linked_movements", { costCenterId }, error);
      throw new CostCenterRepositoryInfraError("read_failed", "has_linked_movements", {
        cause: error
      });
    }
    return (count ?? 0) > 0;
  },

  async create(input: CreateCostCenterInput): Promise<CostCenter> {
    const supabase = requireAdminClient("create_cost_center", { clubId: input.clubId });

    const payload = {
      club_id: input.clubId,
      name: input.name,
      description: input.description,
      type: input.type,
      status: input.status,
      start_date: input.startDate,
      end_date: input.endDate,
      currency_code: input.currencyCode,
      amount: input.amount,
      periodicity: input.periodicity,
      responsible_user_id: input.responsibleUserId,
      created_by_user_id: input.createdByUserId,
      updated_by_user_id: input.createdByUserId
    };

    const { data, error } = await supabase
      .from("cost_centers")
      .insert(payload)
      .select(COST_CENTER_COLUMNS)
      .maybeSingle();

    if (error || !data) {
      throwWriteFailure("create_cost_center", { clubId: input.clubId }, error);
    }
    return mapCostCenterRow(data);
  },

  async update(input: UpdateCostCenterInput): Promise<CostCenter | null> {
    const supabase = requireAdminClient("update_cost_center", {
      clubId: input.clubId,
      costCenterId: input.costCenterId
    });

    const patch: Record<string, unknown> = { updated_by_user_id: input.updatedByUserId };

    if (input.patch.name !== undefined) patch.name = input.patch.name;
    if (input.patch.description !== undefined) patch.description = input.patch.description;
    if (input.patch.type !== undefined) patch.type = input.patch.type;
    if (input.patch.status !== undefined) patch.status = input.patch.status;
    if (input.patch.startDate !== undefined) patch.start_date = input.patch.startDate;
    if (input.patch.endDate !== undefined) patch.end_date = input.patch.endDate;
    if (input.patch.currencyCode !== undefined) patch.currency_code = input.patch.currencyCode;
    if (input.patch.amount !== undefined) patch.amount = input.patch.amount;
    if (input.patch.periodicity !== undefined) patch.periodicity = input.patch.periodicity;
    if (input.patch.responsibleUserId !== undefined) {
      patch.responsible_user_id = input.patch.responsibleUserId;
    }

    const { data, error } = await supabase
      .from("cost_centers")
      .update(patch)
      .eq("id", input.costCenterId)
      .eq("club_id", input.clubId)
      .select(COST_CENTER_COLUMNS)
      .maybeSingle();

    if (error) {
      throwWriteFailure(
        "update_cost_center",
        { clubId: input.clubId, costCenterId: input.costCenterId },
        error
      );
    }

    return data ? mapCostCenterRow(data) : null;
  },

  // -----------------------------------------------------------------------
  // Aggregates for badges (US-52 § 8)
  // -----------------------------------------------------------------------

  async getAggregatesForClub(clubId: string): Promise<Map<string, CostCenterAggregates>> {
    const supabase = createServerSupabaseClient();

    // One row per (movement, cost_center) with the movement amount and type.
    const { data, error } = await supabase
      .from("treasury_movement_cost_centers")
      .select(
        "cost_center_id, treasury_movements!inner(amount, movement_type, club_id)"
      )
      .eq("treasury_movements.club_id", clubId);

    if (error) {
      logReadFailure("get_aggregates_for_club", { clubId }, error);
      throw new CostCenterRepositoryInfraError("read_failed", "get_aggregates_for_club", {
        cause: error
      });
    }

    const aggregates = new Map<string, CostCenterAggregates>();

    type MovementJoin = {
      amount: number | string;
      movement_type: "ingreso" | "egreso";
      club_id: string;
    };
    type Row = {
      cost_center_id: string;
      // Supabase returns joined rows either as a single object or as an array
      // depending on the embed shape. Normalize both shapes.
      treasury_movements: MovementJoin | MovementJoin[] | null;
    };

    for (const row of (data ?? []) as unknown as Row[]) {
      const joined = row.treasury_movements;
      const mov = Array.isArray(joined) ? joined[0] : joined;
      if (!mov) continue;

      const agg = aggregates.get(row.cost_center_id) ?? {
        costCenterId: row.cost_center_id,
        totalIngreso: 0,
        totalEgreso: 0,
        linkedMovementCount: 0
      };

      const amount = Number(mov.amount);
      agg.linkedMovementCount += 1;
      if (mov.movement_type === "ingreso") {
        agg.totalIngreso += amount;
      } else {
        agg.totalEgreso += amount;
      }
      aggregates.set(row.cost_center_id, agg);
    }

    return aggregates;
  },

  // -----------------------------------------------------------------------
  // Movement links (US-53)
  // -----------------------------------------------------------------------

  async listLinksForMovement(
    clubId: string,
    movementId: string
  ): Promise<CostCenterMovementLink[]> {
    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("treasury_movement_cost_centers")
      .select(
        "movement_id, cost_center_id, created_at, created_by_user_id, cost_centers!inner(club_id)"
      )
      .eq("movement_id", movementId)
      .eq("cost_centers.club_id", clubId);

    if (error) {
      logReadFailure("list_links_for_movement", { clubId, movementId }, error);
      throw new CostCenterRepositoryInfraError("read_failed", "list_links_for_movement", {
        cause: error
      });
    }

    return ((data ?? []) as Array<{
      movement_id: string;
      cost_center_id: string;
      created_at: string;
      created_by_user_id: string | null;
    }>).map((row) => ({
      movementId: row.movement_id,
      costCenterId: row.cost_center_id,
      createdAt: row.created_at,
      createdByUserId: row.created_by_user_id
    }));
  },

  async syncLinksForMovement(input: LinkMovementToCostCentersInput): Promise<{
    added: string[];
    removed: string[];
  }> {
    const supabase = requireAdminClient("sync_movement_cost_center_links", {
      clubId: input.clubId,
      movementId: input.movementId
    });

    // 1. Read current links (scoped to the club via cost_centers.club_id).
    const { data: currentRows, error: readError } = await supabase
      .from("treasury_movement_cost_centers")
      .select("cost_center_id, cost_centers!inner(club_id)")
      .eq("movement_id", input.movementId)
      .eq("cost_centers.club_id", input.clubId);

    if (readError) {
      throwWriteFailure(
        "sync_movement_cost_center_links",
        { clubId: input.clubId, movementId: input.movementId, phase: "read_current" },
        readError
      );
    }

    const current = new Set(
      ((currentRows ?? []) as Array<{ cost_center_id: string }>).map((row) => row.cost_center_id)
    );
    const nextSet = new Set(input.costCenterIds);

    const added = [...nextSet].filter((id) => !current.has(id));
    const removed = [...current].filter((id) => !nextSet.has(id));

    // 2. Insert new links.
    if (added.length > 0) {
      const { error: insertError } = await supabase
        .from("treasury_movement_cost_centers")
        .insert(
          added.map((costCenterId) => ({
            movement_id: input.movementId,
            cost_center_id: costCenterId,
            created_by_user_id: input.createdByUserId
          }))
        );
      if (insertError) {
        throwWriteFailure(
          "sync_movement_cost_center_links",
          {
            clubId: input.clubId,
            movementId: input.movementId,
            phase: "insert",
            addedCount: added.length
          },
          insertError
        );
      }
    }

    // 3. Remove stale links.
    if (removed.length > 0) {
      const { error: deleteError } = await supabase
        .from("treasury_movement_cost_centers")
        .delete()
        .eq("movement_id", input.movementId)
        .in("cost_center_id", removed);
      if (deleteError) {
        throwWriteFailure(
          "sync_movement_cost_center_links",
          {
            clubId: input.clubId,
            movementId: input.movementId,
            phase: "delete",
            removedCount: removed.length
          },
          deleteError
        );
      }
    }

    return { added, removed };
  },

  async unlinkMovement(input: UnlinkMovementFromCostCenterInput): Promise<boolean> {
    const supabase = requireAdminClient("unlink_movement_from_cost_center", {
      clubId: input.clubId,
      movementId: input.movementId,
      costCenterId: input.costCenterId
    });

    // Ensure the cost center belongs to the active club before deleting.
    const { data: ownerRow, error: ownerError } = await supabase
      .from("cost_centers")
      .select("id")
      .eq("id", input.costCenterId)
      .eq("club_id", input.clubId)
      .maybeSingle();

    if (ownerError) {
      throwWriteFailure(
        "unlink_movement_from_cost_center",
        { ...input, phase: "verify_owner" },
        ownerError
      );
    }
    if (!ownerRow) {
      return false;
    }

    const { error, count } = await supabase
      .from("treasury_movement_cost_centers")
      .delete({ count: "exact" })
      .eq("movement_id", input.movementId)
      .eq("cost_center_id", input.costCenterId);

    if (error) {
      throwWriteFailure("unlink_movement_from_cost_center", input, error);
    }
    return (count ?? 0) > 0;
  },

  async listMovementsForCostCenter(
    clubId: string,
    costCenterId: string
  ): Promise<Array<{
    movementId: string;
    movementDate: string;
    movementType: "ingreso" | "egreso";
    accountId: string;
    accountName: string;
    categoryName: string | null;
    concept: string | null;
    currencyCode: string;
    amount: number;
  }>> {
    const supabase = createServerSupabaseClient();

    // Ownership check to avoid leaking data across clubs.
    const { data: owner, error: ownerError } = await supabase
      .from("cost_centers")
      .select("id")
      .eq("id", costCenterId)
      .eq("club_id", clubId)
      .maybeSingle();

    if (ownerError) {
      logReadFailure(
        "list_movements_for_cost_center",
        { clubId, costCenterId, phase: "verify_owner" },
        ownerError
      );
      throw new CostCenterRepositoryInfraError(
        "read_failed",
        "list_movements_for_cost_center",
        { cause: ownerError }
      );
    }
    if (!owner) return [];

    const { data, error } = await supabase
      .from("treasury_movement_cost_centers")
      .select(
        `cost_center_id,
         treasury_movements!inner(
           id,
           movement_date,
           movement_type,
           account_id,
           concept,
           currency_code,
           amount,
           club_id,
           treasury_accounts(name),
           treasury_categories(sub_category_name)
         )`
      )
      .eq("cost_center_id", costCenterId)
      .eq("treasury_movements.club_id", clubId);

    if (error) {
      logReadFailure("list_movements_for_cost_center", { clubId, costCenterId }, error);
      throw new CostCenterRepositoryInfraError(
        "read_failed",
        "list_movements_for_cost_center",
        { cause: error }
      );
    }

    type Joined = {
      id: string;
      movement_date: string;
      movement_type: "ingreso" | "egreso";
      account_id: string;
      concept: string | null;
      currency_code: string;
      amount: number | string;
      treasury_accounts: { name: string | null } | { name: string | null }[] | null;
      treasury_categories:
        | { sub_category_name: string | null }
        | { sub_category_name: string | null }[]
        | null;
    };

    const rows = ((data ?? []) as unknown as Array<{
      cost_center_id: string;
      treasury_movements: Joined | Joined[] | null;
    }>)
      .map((row) => (Array.isArray(row.treasury_movements) ? row.treasury_movements[0] : row.treasury_movements))
      .filter((mov): mov is Joined => mov !== null && mov !== undefined);

    return rows
      .map((mov) => {
        const account = Array.isArray(mov.treasury_accounts)
          ? mov.treasury_accounts[0]
          : mov.treasury_accounts;
        const category = Array.isArray(mov.treasury_categories)
          ? mov.treasury_categories[0]
          : mov.treasury_categories;
        return {
          movementId: mov.id,
          movementDate: mov.movement_date,
          movementType: mov.movement_type,
          accountId: mov.account_id,
          accountName: account?.name ?? "—",
          categoryName: category?.sub_category_name ?? null,
          concept: mov.concept,
          currencyCode: mov.currency_code,
          amount: Number(mov.amount)
        };
      })
      .sort((a, b) => (a.movementDate < b.movementDate ? 1 : -1));
  },

  async listMovementIdsForCostCenter(
    clubId: string,
    costCenterId: string
  ): Promise<string[]> {
    const supabase = createServerSupabaseClient();

    // Validate ownership first to avoid leaking IDs from other clubs.
    const { data: owner, error: ownerError } = await supabase
      .from("cost_centers")
      .select("id")
      .eq("id", costCenterId)
      .eq("club_id", clubId)
      .maybeSingle();

    if (ownerError) {
      logReadFailure(
        "list_movement_ids_for_cost_center",
        { clubId, costCenterId, phase: "verify_owner" },
        ownerError
      );
      throw new CostCenterRepositoryInfraError(
        "read_failed",
        "list_movement_ids_for_cost_center",
        { cause: ownerError }
      );
    }
    if (!owner) {
      return [];
    }

    const { data, error } = await supabase
      .from("treasury_movement_cost_centers")
      .select("movement_id")
      .eq("cost_center_id", costCenterId);

    if (error) {
      logReadFailure("list_movement_ids_for_cost_center", { clubId, costCenterId }, error);
      throw new CostCenterRepositoryInfraError(
        "read_failed",
        "list_movement_ids_for_cost_center",
        { cause: error }
      );
    }

    return ((data ?? []) as Array<{ movement_id: string }>).map((row) => row.movement_id);
  },

  // -----------------------------------------------------------------------
  // Audit log
  // -----------------------------------------------------------------------

  async recordAudit(entry: RecordAuditInput): Promise<void> {
    const supabase = requireAdminClient("record_cost_center_audit", {
      costCenterId: entry.costCenterId
    });

    const { error } = await supabase.from("cost_center_audit_log").insert({
      cost_center_id: entry.costCenterId,
      actor_user_id: entry.actorUserId,
      action_type: entry.actionType,
      field: entry.field ?? null,
      old_value: entry.oldValue ?? null,
      new_value: entry.newValue ?? null,
      payload_before: entry.payloadBefore ?? null,
      payload_after: entry.payloadAfter ?? null
    });

    if (error) {
      throwWriteFailure(
        "record_cost_center_audit",
        { costCenterId: entry.costCenterId, actionType: entry.actionType },
        error
      );
    }
  },

  async listAuditForCostCenter(
    clubId: string,
    costCenterId: string
  ): Promise<CostCenterAuditEntry[]> {
    const supabase = createServerSupabaseClient();

    // Validate ownership first (RLS would enforce this, but double-check).
    const { data: owner, error: ownerError } = await supabase
      .from("cost_centers")
      .select("id")
      .eq("id", costCenterId)
      .eq("club_id", clubId)
      .maybeSingle();

    if (ownerError) {
      logReadFailure(
        "list_audit_for_cost_center",
        { clubId, costCenterId, phase: "verify_owner" },
        ownerError
      );
      throw new CostCenterRepositoryInfraError("read_failed", "list_audit_for_cost_center", {
        cause: ownerError
      });
    }
    if (!owner) {
      return [];
    }

    const { data, error } = await supabase
      .from("cost_center_audit_log")
      .select(
        "id,cost_center_id,actor_user_id,action_type,field,old_value,new_value,payload_before,payload_after,changed_at"
      )
      .eq("cost_center_id", costCenterId)
      .order("changed_at", { ascending: false });

    if (error) {
      logReadFailure("list_audit_for_cost_center", { clubId, costCenterId }, error);
      throw new CostCenterRepositoryInfraError("read_failed", "list_audit_for_cost_center", {
        cause: error
      });
    }

    return ((data ?? []) as AuditRow[]).map(mapAuditRow);
  }
};
