/**
 * Schemas zod para inputs de server actions del módulo Secretaría.
 */
import { z } from "zod";

/**
 * Cada fila de balance declarado de una cuenta+moneda al abrir/cerrar la
 * jornada. El FormData usa arrays paralelos de account_id / currency_code /
 * declared_balance, que se zip-ean a este shape antes de validar.
 */
export const declaredBalanceRowSchema = z.object({
  accountId: z.string().min(1, "accountId required"),
  currencyCode: z.string().min(1, "currencyCode required"),
  declaredBalance: z.string().min(1, "declaredBalance required"),
});

export const declaredBalancesPayloadSchema = z
  .array(declaredBalanceRowSchema)
  .min(1, "at least one balance row required");
