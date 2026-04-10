"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  closeDailyCashSessionWithDeclaredBalances,
  openDailyCashSessionWithDeclaredBalances
} from "@/lib/services/treasury-service";

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

function redirectToDashboard(code: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/secretaria");
  redirect(`/dashboard/secretaria?feedback=${code}`);
}

export async function openDailyCashSessionWithBalancesAction(formData: FormData) {
  const result = await openDailyCashSessionWithDeclaredBalances(mapDeclaredBalances(formData));
  redirectToDashboard(result.code);
}

export async function closeDailyCashSessionWithBalancesAction(formData: FormData) {
  const result = await closeDailyCashSessionWithDeclaredBalances(mapDeclaredBalances(formData));
  redirectToDashboard(result.code);
}
