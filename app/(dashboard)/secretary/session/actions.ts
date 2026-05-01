"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { resolveFeedback } from "@/lib/feedback-catalog";
import { logger } from "@/lib/logger";
import {
  closeDailyCashSessionWithDeclaredBalances,
  openDailyCashSessionWithDeclaredBalances,
} from "@/lib/services/treasury-service";
import { flashToast } from "@/lib/toast-server";
import { declaredBalancesPayloadSchema } from "@/lib/validators/secretary";

function mapDeclaredBalances(formData: FormData) {
  const accountIds = formData.getAll("account_id");
  const currencyCodes = formData.getAll("currency_code");
  const declaredBalances = formData.getAll("declared_balance");

  return accountIds.map((accountId, index) => ({
    accountId: String(accountId ?? ""),
    currencyCode: String(currencyCodes[index] ?? ""),
    declaredBalance: String(declaredBalances[index] ?? ""),
  }));
}

function redirectToSecretary(code: string) {
  revalidatePath("/dashboard");
  revalidatePath("/secretary");
  flashToast(resolveFeedback("dashboard", code));
  redirect("/secretary");
}

function parseAndValidate(formData: FormData, op: string) {
  const rows = mapDeclaredBalances(formData);
  const result = declaredBalancesPayloadSchema.safeParse(rows);
  if (!result.success) {
    logger.warn(`[secretary-session-actions.${op}] validation failed`, {
      error: result.error.issues[0]?.message ?? "unknown",
    });
    return null;
  }
  return result.data;
}

export async function openDailyCashSessionWithBalancesAction(formData: FormData) {
  const validated = parseAndValidate(formData, "open");
  if (!validated) {
    redirectToSecretary("validation_error");
    return;
  }
  const result = await openDailyCashSessionWithDeclaredBalances(validated);
  redirectToSecretary(result.code);
}

export async function closeDailyCashSessionWithBalancesAction(formData: FormData) {
  const validated = parseAndValidate(formData, "close");
  if (!validated) {
    redirectToSecretary("validation_error");
    return;
  }
  const result = await closeDailyCashSessionWithDeclaredBalances(validated);
  redirectToSecretary(result.code);
}
