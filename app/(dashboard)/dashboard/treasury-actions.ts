"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  closeDailyCashSession,
  createTreasuryMovement,
  createTreasuryRoleMovement,
  openDailyCashSession
} from "@/lib/services/treasury-service";

function redirectToDashboard(code: string) {
  revalidatePath("/dashboard");
  redirect(`/dashboard?feedback=${code}`);
}

export async function openDailyCashSessionAction() {
  const result = await openDailyCashSession();
  redirectToDashboard(result.code);
}

export async function closeDailyCashSessionAction() {
  const result = await closeDailyCashSession();
  redirectToDashboard(result.code);
}

export async function createTreasuryMovementAction(formData: FormData) {
  const result = await createTreasuryMovement({
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
