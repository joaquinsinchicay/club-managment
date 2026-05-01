/**
 * Schemas zod para inputs de server actions del módulo Treasury.
 *
 * Convención: cada schema corresponde 1:1 a una server action y describe los
 * fields del FormData submitted desde el modal/form correspondiente. Los
 * campos opcionales se marcan con `.optional()` o `.default("")`. Los IDs de
 * recursos del club son UUIDs salvo casos legacy.
 *
 * Cuando una action se migra a usar uno de estos schemas:
 *  - Reemplazar `String(formData.get("x") ?? "")` por `parsed.data.x`.
 *  - Si parse falla, devolver `{ ok: false, code: "validation_error" }` o el
 *    código equivalente del flow.
 */
import { z } from "zod";

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "expected YYYY-MM-DD");

const amountString = z.string().min(1, "amount required");

export const updateMovementBeforeConsolidationSchema = z.object({
  consolidation_date: isoDate,
  movement_id: z.string().uuid(),
  movement_date: isoDate,
  account_id: z.string().uuid(),
  movement_type: z.enum(["ingreso", "egreso"]),
  category_id: z.string().uuid().or(z.literal("")),
  activity_id: z.string().uuid().or(z.literal("")),
  receipt_number: z.string().optional().default(""),
  concept: z.string().min(1).max(500),
  currency_code: z.string().min(3).max(8),
  amount: amountString,
});

export const integrateMatchingMovementSchema = z.object({
  consolidation_date: isoDate,
  secretaria_movement_id: z.string().uuid(),
  tesoreria_movement_id: z.string().uuid(),
});

export const updateTransferBeforeConsolidationSchema = z.object({
  consolidation_date: isoDate,
  movement_id: z.string().uuid(),
  source_account_id: z.string().uuid(),
  target_account_id: z.string().uuid(),
  currency_code: z.string().min(3).max(8),
  concept: z.string().min(1).max(500),
  amount: amountString,
});

export const executeDailyConsolidationSchema = z.object({
  consolidation_date: isoDate,
});

export const syncMovementCostCenterLinksSchema = z.object({
  movement_id: z.string().uuid(),
  cost_center_ids: z.union([z.string(), z.array(z.string())]).optional(),
});

export const unlinkMovementFromCostCenterSchema = z.object({
  movement_id: z.string().uuid(),
  cost_center_id: z.string().uuid(),
});
