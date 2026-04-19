"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  executeDailyConsolidation,
  integrateMatchingMovement,
  updateMovementBeforeConsolidation,
  updateTransferBeforeConsolidation
} from "@/lib/services/treasury-service";

function redirectToTreasury(code: string, consolidationDate: string, selectedMovementId?: string) {
  const params = new URLSearchParams();

  params.set("tab", "conciliacion");

  if (consolidationDate) {
    params.set("date", consolidationDate);
  }

  if (selectedMovementId) {
    params.set("movement", selectedMovementId);
  }

  params.set("feedback", code);

  revalidatePath("/dashboard");
  revalidatePath("/treasury");
  redirect(`/treasury?${params.toString()}`);
}

export async function updateMovementBeforeConsolidationAction(formData: FormData) {
  const consolidationDate = String(formData.get("consolidation_date") ?? "");
  const movementId = String(formData.get("movement_id") ?? "");

  const result = await updateMovementBeforeConsolidation({
    movementId,
    movementDate: String(formData.get("movement_date") ?? ""),
    accountId: String(formData.get("account_id") ?? ""),
    movementType: String(formData.get("movement_type") ?? ""),
    categoryId: String(formData.get("category_id") ?? ""),
    activityId: String(formData.get("activity_id") ?? ""),
    receiptNumber: String(formData.get("receipt_number") ?? ""),
    calendarEventId: "",
    concept: String(formData.get("concept") ?? ""),
    currencyCode: String(formData.get("currency_code") ?? ""),
    amount: String(formData.get("amount") ?? "")
  });

  redirectToTreasury(result.code, consolidationDate, movementId);
}

export async function integrateMatchingMovementAction(formData: FormData) {
  const consolidationDate = String(formData.get("consolidation_date") ?? "");
  const secretariaMovementId = String(formData.get("secretaria_movement_id") ?? "");

  const result = await integrateMatchingMovement({
    secretariaMovementId,
    tesoreriaMovementId: String(formData.get("tesoreria_movement_id") ?? "")
  });

  redirectToTreasury(result.code, consolidationDate, secretariaMovementId);
}

export async function updateTransferBeforeConsolidationAction(formData: FormData) {
  const consolidationDate = String(formData.get("consolidation_date") ?? "");
  const movementId = String(formData.get("movement_id") ?? "");

  const result = await updateTransferBeforeConsolidation({
    movementId,
    sourceAccountId: String(formData.get("source_account_id") ?? ""),
    targetAccountId: String(formData.get("target_account_id") ?? ""),
    currencyCode: String(formData.get("currency_code") ?? ""),
    concept: String(formData.get("concept") ?? ""),
    amount: String(formData.get("amount") ?? "")
  });

  redirectToTreasury(result.code, consolidationDate, movementId);
}

export async function executeDailyConsolidationAction(formData: FormData) {
  const consolidationDate = String(formData.get("consolidation_date") ?? "");
  const result = await executeDailyConsolidation(consolidationDate);
  redirectToTreasury(result.code, consolidationDate);
}
