"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  closeDailyCashSession,
  createAccountTransfer,
  createFxOperation,
  createTreasuryMovement,
  createTreasuryRoleMovement,
  openDailyCashSession
} from "@/lib/services/treasury-service";

export type TreasuryActionResponse = {
  ok: boolean;
  code: string;
  movementDisplayId?: string;
};

function redirectToDashboard(code: string, movementDisplayId?: string) {
  revalidatePath("/dashboard");
  const params = new URLSearchParams({ feedback: code });

  if (movementDisplayId) {
    params.set("movement_id", movementDisplayId);
  }

  redirect(`/dashboard?${params.toString()}`);
}

export async function openDailyCashSessionAction() {
  const result = await openDailyCashSession();
  redirectToDashboard(result.code, result.movementDisplayId);
}

export async function closeDailyCashSessionAction() {
  const result = await closeDailyCashSession();
  redirectToDashboard(result.code, result.movementDisplayId);
}

export async function createTreasuryMovementAction(formData: FormData) {
  const result = await createTreasuryMovement({
    accountId: String(formData.get("account_id") ?? ""),
    movementType: String(formData.get("movement_type") ?? ""),
    categoryId: String(formData.get("category_id") ?? ""),
    activityId: String(formData.get("activity_id") ?? ""),
    receiptNumber: String(formData.get("receipt_number") ?? ""),
    calendarEventId: String(formData.get("calendar_event_id") ?? ""),
    concept: String(formData.get("concept") ?? ""),
    currencyCode: String(formData.get("currency_code") ?? ""),
    amount: String(formData.get("amount") ?? "")
  });

  revalidatePath("/dashboard");

  return {
    ok: result.ok,
    code: result.code,
    movementDisplayId: result.movementDisplayId
  } satisfies TreasuryActionResponse;
}

export async function createTreasuryRoleMovementAction(formData: FormData) {
  const result = await createTreasuryRoleMovement({
    movementDate: String(formData.get("movement_date") ?? ""),
    accountId: String(formData.get("account_id") ?? ""),
    movementType: String(formData.get("movement_type") ?? ""),
    categoryId: String(formData.get("category_id") ?? ""),
    activityId: String(formData.get("activity_id") ?? ""),
    receiptNumber: String(formData.get("receipt_number") ?? ""),
    concept: String(formData.get("concept") ?? ""),
    currencyCode: String(formData.get("currency_code") ?? ""),
    amount: String(formData.get("amount") ?? "")
  });

  redirectToDashboard(result.code);
}

export async function createAccountTransferAction(formData: FormData) {
  const result = await createAccountTransfer({
    sourceAccountId: String(formData.get("source_account_id") ?? ""),
    targetAccountId: String(formData.get("target_account_id") ?? ""),
    currencyCode: String(formData.get("currency_code") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    concept: String(formData.get("concept") ?? "")
  });

  redirectToDashboard(result.code);
}

export async function createFxOperationAction(formData: FormData) {
  const result = await createFxOperation({
    sourceAccountId: String(formData.get("source_account_id") ?? ""),
    sourceCurrencyCode: String(formData.get("source_currency_code") ?? ""),
    sourceAmount: String(formData.get("source_amount") ?? ""),
    targetAccountId: String(formData.get("target_account_id") ?? ""),
    targetCurrencyCode: String(formData.get("target_currency_code") ?? ""),
    targetAmount: String(formData.get("target_amount") ?? ""),
    concept: String(formData.get("concept") ?? "")
  });

  redirectToDashboard(result.code);
}
