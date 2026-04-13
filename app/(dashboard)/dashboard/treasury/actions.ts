"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  executeDailyConsolidation,
  integrateMatchingMovement,
  updateMovementBeforeConsolidation
} from "@/lib/services/treasury-service";

function redirectToTreasury(code: string, consolidationDate: string, selectedMovementId?: string) {
  const params = new URLSearchParams();

  if (consolidationDate) {
    params.set("date", consolidationDate);
  }

  if (selectedMovementId) {
    params.set("movement", selectedMovementId);
  }

  params.set("feedback", code);

  revalidatePath("/dashboard");
  revalidatePath("/dashboard/treasury");
  revalidatePath("/dashboard/treasury/consolidation");
  redirect(`/dashboard/treasury/consolidation?${params.toString()}`);
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

export async function executeDailyConsolidationAction(formData: FormData) {
  const consolidationDate = String(formData.get("consolidation_date") ?? "");
  const result = await executeDailyConsolidation(consolidationDate);
  redirectToTreasury(result.code, consolidationDate);
}
