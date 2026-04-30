/**
 * lib/treasury-ui-helpers.ts — Helpers de presentación para Tesorería.
 *
 * Centraliza pequeñas funciones de display que vivían inline duplicadas:
 *  - símbolo de moneda según código
 *  - color/tone de un tipo de movimiento (ingreso/egreso/neutral)
 *  - tone de cuenta tesorería para el primitivo Avatar
 *
 * No incluye lógica de cálculo (eso vive en lib/services/*) ni formato
 * numérico (vive en lib/amounts.ts).
 */

import type { TreasuryAccountType, TreasuryMovementType } from "@/lib/domain/access";
import type { AvatarTone } from "@/components/ui/avatar";

/**
 * Símbolo de moneda para prefijar montos. ARS → "$", USD → "US$".
 * Para nuevas divisas, agregar mapping explícito acá (NO interpolar inline).
 */
export function getCurrencySymbol(currencyCode: string): string {
  if (currencyCode === "USD") return "US$";
  return "$";
}

/**
 * Clase de color del bullet decorativo de un movimiento según su tipo.
 *  ingreso → verde brand
 *  egreso  → rojo brand
 *  neutral / transfer → gris brand
 */
export function getMovementTypeBulletClass(type: TreasuryMovementType | string): string {
  if (type === "ingreso") return "bg-ds-green";
  if (type === "egreso") return "bg-ds-red";
  return "bg-ds-slate-400";
}

/**
 * Tone semántico para mostrar un movimiento como income/expense/neutral
 * en primitivos como `<DataTableChip>` o `<Chip>`.
 */
export function getMovementTypeTone(type: TreasuryMovementType): "income" | "expense" | "neutral" {
  if (type === "ingreso") return "income";
  if (type === "egreso") return "expense";
  return "neutral";
}

/**
 * Tone del primitivo `<Avatar>` para una cuenta tesorería según su tipo.
 * El primitivo Avatar acepta tones específicos del dominio cuenta:
 *  bancaria, billetera_virtual, efectivo. Mapeamos a los nombres del
 *  primitivo (sin guion bajo).
 */
export function getAccountAvatarTone(
  accountType?: TreasuryAccountType | null,
): AvatarTone {
  if (accountType === "bancaria") return "bancaria";
  if (accountType === "billetera_virtual") return "virtual";
  return "efectivo";
}
