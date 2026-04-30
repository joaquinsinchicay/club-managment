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

export async function listApprovedSettlementsForTreasury(): Promise<TreasuryPayrollListResult> {
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
    const all = await payrollSettlementRepository.listForClub(clubId, {});
    const settlements = all.filter((s) => s.status === "aprobada_rrhh");

    const adjustmentsBySettlementId: Record<string, PayrollSettlementAdjustment[]> = {};
    await Promise.all(
      settlements.map(async (s) => {
        const list = await payrollSettlementRepository.listAdjustments(clubId, s.id);
        adjustmentsBySettlementId[s.id] = list;
      }),
    );

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
        logger.warn("[treasury-payroll-service.list.approver_lookup]", lookupError);
      }
    }

    return { ok: true, settlements, adjustmentsBySettlementId, approverNamesByUserId };
  } catch (error) {
    if (isPayrollSettlementRepositoryInfraError(error)) {
      logger.error("[treasury-payroll-service.list]", error);
    }
    return { ok: false, code: "unknown_error" };
  }
}

/**
 * Resumen agregado para la card "Pagos de nómina pendientes" en el
 * dashboard `/treasury`. Devuelve cantidad + monto total de
 * liquidaciones aprobadas en el club activo.
 *
 * Si el actor no tiene rol Tesorería → `forbidden` (la card simplemente
 * no se renderiza, no es un error fatal en la página).
 */
export async function getTreasuryPayrollSummary(): Promise<TreasuryPayrollSummaryResult> {
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
    const all = await payrollSettlementRepository.listForClub(clubId, {});
    let count = 0;
    let totalAmount = 0;
    for (const s of all) {
      if (s.status === "aprobada_rrhh") {
        count += 1;
        totalAmount += s.totalAmount;
      }
    }
    return { ok: true, summary: { count, totalAmount } };
  } catch (error) {
    if (isPayrollSettlementRepositoryInfraError(error)) {
      logger.error("[treasury-payroll-service.summary]", error);
    }
    return { ok: false, code: "unknown_error" };
  }
}
