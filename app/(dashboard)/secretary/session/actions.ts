"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { resolveFeedback } from "@/lib/feedback-catalog";
import {
  closeDailyCashSessionWithDeclaredBalances,
  openDailyCashSessionWithDeclaredBalances
} from "@/lib/services/treasury-service";
import { flashToast } from "@/lib/toast-server";

function mapDeclaredBalances(formData: FormData) {
  const accountIds = formData.getAll("account_id");
  const currencyCodes = formData.getAll("currency_code");
  const declaredBalances = formData.getAll("declared_balance");

  return accountIds.map((accountId, index) => ({
    accountId: String(accountId ?? ""),
    currencyCode: String(currencyCodes[index] ?? ""),
    declaredBalance: String(declaredBalances[index] ?? "")
  }));
}

function redirectToSecretary(code: string) {
  revalidatePath("/dashboard");
  revalidatePath("/secretary");
  flashToast(resolveFeedback("dashboard", code));
  redirect("/secretary");
}

export async function openDailyCashSessionWithBalancesAction(formData: FormData) {
  const result = await openDailyCashSessionWithDeclaredBalances(mapDeclaredBalances(formData));
  redirectToSecretary(result.code);
}

export async function closeDailyCashSessionWithBalancesAction(formData: FormData) {
  const result = await closeDailyCashSessionWithDeclaredBalances(mapDeclaredBalances(formData));
  redirectToSecretary(result.code);
}
