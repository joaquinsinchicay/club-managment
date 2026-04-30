/**
 * lib/services/treasury/_shared.ts — helpers internos compartidos por los
 * sub-módulos de treasury-service. NO es parte de la API pública: sólo lo
 * importan los archivos en `lib/services/treasury/*` y el barrel
 * `treasury-service.ts` durante el split progresivo (P2 audit).
 *
 * Convención: cualquier helper privado de treasury-service que sea
 * referenciado por más de un sub-módulo vive acá. Los helpers usados por
 * un solo sub-módulo se quedan local en ese archivo.
 */

import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canOperateSecretaria, canOperateTesoreria } from "@/lib/domain/authorization";
import type {
  ReceiptFormat,
  TreasuryAccount,
  TreasuryCurrencyConfig,
  MovementTypeConfig,
  TreasuryMovement,
} from "@/lib/domain/access";
import { accessRepository } from "@/lib/repositories/access-repository";

export type TreasuryVisibilityRole = "secretaria" | "tesoreria";

const OPERATIONAL_TIME_ZONE = "America/Argentina/Buenos_Aires";

export function getTodayDate(): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: OPERATIONAL_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(new Date());
  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
}

export async function getSecretariaSession() {
  const context = await getAuthenticatedSessionContext();

  if (!context || !context.activeClub || !context.activeMembership) {
    return null;
  }

  if (!canOperateSecretaria(context.activeMembership)) {
    return null;
  }

  return context;
}

export async function getTesoreriaSession() {
  const context = await getAuthenticatedSessionContext();

  if (!context || !context.activeClub || !context.activeMembership) {
    return null;
  }

  if (!canOperateTesoreria(context.activeMembership)) {
    return null;
  }

  return context;
}

export function buildMovementSignedAmount(
  movementType: "ingreso" | "egreso",
  amount: number,
): number {
  return movementType === "ingreso" ? amount : amount * -1;
}

export function shouldIncludeMovementInRoleBalances(
  movement: Pick<TreasuryMovement, "status">,
  role: TreasuryVisibilityRole,
): boolean {
  if (role === "secretaria") {
    return true;
  }

  return movement.status === "posted" || movement.status === "consolidated";
}

export function getAccountsVisibleForRole(
  accounts: TreasuryAccount[],
  role: TreasuryVisibilityRole,
): TreasuryAccount[] {
  return accounts.filter((account) =>
    role === "secretaria" ? account.visibleForSecretaria : account.visibleForTesoreria,
  );
}

export function buildAccountBalances(
  account: TreasuryAccount,
  movements: Array<{
    accountId: string;
    currencyCode: string;
    movementType: "ingreso" | "egreso";
    amount: number;
  }>,
) {
  return account.currencies.map((currencyCode) => ({
    currencyCode,
    amount: movements
      .filter(
        (movement) =>
          movement.accountId === account.id && movement.currencyCode === currencyCode,
      )
      .reduce(
        (total, movement) =>
          total + buildMovementSignedAmount(movement.movementType, movement.amount),
        0,
      ),
  }));
}

export async function getConfiguredTreasuryCurrencies(
  clubId: string,
): Promise<TreasuryCurrencyConfig[]> {
  return [
    {
      clubId,
      currencyCode: "ARS",
      isPrimary: true,
    },
    {
      clubId,
      currencyCode: "USD",
      isPrimary: false,
    },
  ];
}

export async function getConfiguredMovementTypes(
  clubId: string,
): Promise<MovementTypeConfig[]> {
  return [
    { clubId, movementType: "ingreso", isEnabled: true },
    { clubId, movementType: "egreso", isEnabled: true },
  ];
}

export function validateReceiptNumberAgainstFormat(
  receiptNumber: string,
  receiptFormat: ReceiptFormat,
): boolean {
  if (receiptFormat.validationType === "numeric") {
    return /^[0-9]+$/.test(receiptNumber);
  }

  return /^[a-zA-Z0-9]+$/.test(receiptNumber);
}

export function isReceiptNumberValidForFormats(
  receiptNumber: string,
  activeReceiptFormats: ReceiptFormat[],
): boolean {
  if (receiptNumber.length === 0) {
    return true;
  }

  if (activeReceiptFormats.length === 0) {
    return false;
  }

  return activeReceiptFormats.some((format) =>
    validateReceiptNumberAgainstFormat(receiptNumber, format),
  );
}

export async function getActiveReceiptFormatsForRole(
  clubId: string,
  role: TreasuryVisibilityRole,
) {
  const receiptFormats = await accessRepository.listReceiptFormatsForClub(clubId);

  return receiptFormats.filter(
    (receiptFormat) =>
      receiptFormat.status === "active" &&
      (role === "secretaria"
        ? receiptFormat.visibleForSecretaria
        : receiptFormat.visibleForTesoreria),
  );
}
