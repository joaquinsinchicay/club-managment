"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  closeDailyCashSession,
  createAccountTransfer,
  createFxOperation,
  createTreasuryMovement,
  createTreasuryRoleMovement,
  type TreasuryMovementOptimisticUpdate,
  updateTreasuryRoleMovement,
  updateSecretariaMovementInOpenSession,
  openDailyCashSession
} from "@/lib/services/treasury-service";

export type TreasuryActionResponse = {
  ok: boolean;
  code: string;
  movementDisplayId?: string;
  optimisticUpdate?: TreasuryMovementOptimisticUpdate;
};

function redirectToTreasuryModule(code: string, movementDisplayId?: string) {
  revalidatePath("/dashboard");
  revalidatePath("/dashboard/treasury");
  const params = new URLSearchParams({ feedback: code });

  if (movementDisplayId) {
    params.set("movement_id", movementDisplayId);
  }

  redirect(`/dashboard/treasury?${params.toString()}`);
}

export async function openDailyCashSessionAction() {
  const result = await openDailyCashSession();
  redirectToTreasuryModule(result.code, result.movementDisplayId);
}

export async function closeDailyCashSessionAction() {
  const result = await closeDailyCashSession();
  redirectToTreasuryModule(result.code, result.movementDisplayId);
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
  revalidatePath("/dashboard/secretaria");

  return {
    ok: result.ok,
    code: result.code,
    movementDisplayId: result.movementDisplayId,
    optimisticUpdate: result.optimisticUpdate
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

  redirectToTreasuryModule(result.code, result.movementDisplayId);
}

export async function updateTreasuryRoleMovementAction(formData: FormData) {
  const result = await updateTreasuryRoleMovement({
    movementId: String(formData.get("movement_id") ?? ""),
    accountId: String(formData.get("account_id") ?? ""),
    movementType: String(formData.get("movement_type") ?? ""),
    categoryId: String(formData.get("category_id") ?? ""),
    activityId: String(formData.get("activity_id") ?? ""),
    receiptNumber: String(formData.get("receipt_number") ?? ""),
    concept: String(formData.get("concept") ?? ""),
    currencyCode: String(formData.get("currency_code") ?? ""),
    amount: String(formData.get("amount") ?? "")
  });

  redirectToTreasuryModule(result.code, result.movementDisplayId);
}

export async function updateSecretariaMovementAction(formData: FormData) {
  const result = await updateSecretariaMovementInOpenSession({
    movementId: String(formData.get("movement_id") ?? ""),
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
  revalidatePath("/dashboard/secretaria");

  return {
    ok: result.ok,
    code: result.code
  } satisfies TreasuryActionResponse;
}

export async function createAccountTransferAction(formData: FormData) {
  const result = await createAccountTransfer({
    sourceAccountId: String(formData.get("source_account_id") ?? ""),
    targetAccountId: String(formData.get("target_account_id") ?? ""),
    currencyCode: String(formData.get("currency_code") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    concept: String(formData.get("concept") ?? "")
  });

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/secretaria");

  return {
    ok: result.ok,
    code: result.code,
    movementDisplayId: result.movementDisplayId
  } satisfies TreasuryActionResponse;
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

  redirectToTreasuryModule(result.code);
}
