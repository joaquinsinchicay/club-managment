/**
 * Service layer for Treasury · Payroll Tray (US-45).
 *
 * Bandeja Tesorería de pagos pendientes: lista las liquidaciones en
 * estado `aprobada_rrhh` del club activo + el resumen agregado para
 * la card del dashboard `/treasury`.
 *
 * Read-only: las mutaciones (pagar, devolver) reusan los services
 * de payroll-settlement (US-42/43) y payroll-payment (US-41).
 */

import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canAccessTreasuryPayrollTray } from "@/lib/domain/authorization";
import type {
  PayrollSettlement,
  PayrollSettlementAdjustment,
} from "@/lib/domain/payroll-settlement";
import {
  isPayrollSettlementRepositoryInfraError,
  payrollSettlementRepository,
} from "@/lib/repositories/payroll-settlement-repository";
import { createAdminSupabaseClient } from "@/lib/supabase/admin";
import { logger } from "@/lib/logger";

// -------------------------------------------------------------------------
// Result codes
// -------------------------------------------------------------------------

export type TreasuryPayrollActionCode =
  | "unauthenticated"
  | "no_active_club"
  | "forbidden"
  | "ok"
  | "unknown_error";

export type TreasuryPayrollListResult =
  | {
      ok: true;
      settlements: PayrollSettlement[];
      adjustmentsBySettlementId: Record<string, PayrollSettlementAdjustment[]>;
      approverNamesByUserId: Record<string, string>;
    }
  | { ok: false; code: TreasuryPayrollActionCode };

export type TreasuryPayrollSummary = {
  count: number;
  totalAmount: number;
};

export type TreasuryPayrollSummaryResult =
  | { ok: true; summary: TreasuryPayrollSummary }
  | { ok: false; code: TreasuryPayrollActionCode };

// -------------------------------------------------------------------------
// Public queries
// -------------------------------------------------------------------------

export type TreasuryPayrollDataResult =
  | {
      ok: true;
      summary: TreasuryPayrollSummary;
      settlements: PayrollSettlement[];
      adjustmentsBySettlementId: Record<string, PayrollSettlementAdjustment[]>;
      approverNamesByUserId: Record<string, string>;
    }
  | { ok: false; code: TreasuryPayrollActionCode };

/**
 * Lectura unificada para la página `/treasury`: trae las liquidaciones
 * aprobadas + sus ajustes + nombres de aprobadores + summary agregado,
 * todo desde una sola query base.
 *
 * Antes existían `getTreasuryPayrollSummary()` y
 * `listApprovedSettlementsForTreasury()` que ejecutaban un mismo
 * `listForClub(clubId, {})` cada una (Promise.all en page.tsx) → 2x el
 * trabajo + ambas filtraban `aprobada_rrhh` en JS, no en SQL. Ahora una
 * sola query con `.eq("status", "aprobada_rrhh")` y los derivados se
 * computan del mismo dataset.
 */
export async function getTreasuryPayrollData(): Promise<TreasuryPayrollDataResult> {
  const session = await getAuthenticatedSessionContext();
  if (!session) return { ok: false, code: "unauthenticated" };
  if (!session.activeClub || !session.activeMembership) {
    return { ok: false, code: "no_active_club" };
  }
  if (!canAccessTreasuryPayrollTray(session.activeMembership)) {
    return { ok: false, code: "forbidden" };
  }
  const clubId = session.activeClub.id;

  try {
    // Filtramos `aprobada_rrhh` directamente en SQL (antes traíamos TODAS
    // las settlements y filtrábamos en JS).
    const settlements = await payrollSettlementRepository.listForClub(clubId, {
      status: "aprobada_rrhh",
    });

    const summary: TreasuryPayrollSummary = {
      count: settlements.length,
      totalAmount: settlements.reduce((sum, s) => sum + s.totalAmount, 0),
    };

    const adjustmentsBySettlementId: Record<string, PayrollSettlementAdjustment[]> = {};
    if (settlements.length > 0) {
      const adjustmentsMap = await payrollSettlementRepository.listAdjustmentsBySettlementIds(
        clubId,
        settlements.map((s) => s.id),
      );
      for (const s of settlements) {
        adjustmentsBySettlementId[s.id] = adjustmentsMap.get(s.id) ?? [];
      }
    }

    // Resolver nombres de aprobadores (US-71). Best-effort: si falla la
    // consulta a `users` o no hay admin client, devolvemos mapa vacío y la
    // UI hace fallback a "fecha sin nombre".
    const approverIds = Array.from(
      new Set(
        settlements
          .map((s) => s.approvedByUserId)
          .filter((id): id is string => id !== null),
      ),
    );
    const approverNamesByUserId: Record<string, string> = {};
    if (approverIds.length > 0) {
      try {
        const supabase = createAdminSupabaseClient();
        if (supabase) {
          const { data, error } = await supabase
            .from("users")
            .select("id,full_name,email")
            .in("id", approverIds);
          if (!error && data) {
            for (const row of data) {
              const name = (row.full_name?.trim() || row.email?.trim()) ?? "";
              if (name) approverNamesByUserId[row.id] = name;
            }
          }
        }
      } catch (lookupError) {
        logger.warn("[treasury-payroll-service.data.approver_lookup]", lookupError);
      }
    }

    return { ok: true, summary, settlements, adjustmentsBySettlementId, approverNamesByUserId };
  } catch (error) {
    if (isPayrollSettlementRepositoryInfraError(error)) {
      logger.error("[treasury-payroll-service.data]", error);
    }
    return { ok: false, code: "unknown_error" };
  }
}
