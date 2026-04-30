"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { logger } from "@/lib/logger";
import {
  executeDailyConsolidation,
  integrateMatchingMovement,
  updateMovementBeforeConsolidation,
  updateTransferBeforeConsolidation,
} from "@/lib/services/treasury-service";
import { parseFormData } from "@/lib/validators/server-action";
import {
  executeDailyConsolidationSchema,
  integrateMatchingMovementSchema,
  updateMovementBeforeConsolidationSchema,
  updateTransferBeforeConsolidationSchema,
} from "@/lib/validators/treasury";

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
  const parsed = parseFormData(formData, updateMovementBeforeConsolidationSchema);
  if (!parsed.ok) {
    logger.warn("[treasury-actions.update-movement] validation failed", {
      error: parsed.firstError,
    });
    redirectToTreasury("validation_error", String(formData.get("consolidation_date") ?? ""));
    return;
  }

  const result = await updateMovementBeforeConsolidation({
    movementId: parsed.data.movement_id,
    movementDate: parsed.data.movement_date,
    accountId: parsed.data.account_id,
    movementType: parsed.data.movement_type,
    categoryId: parsed.data.category_id,
    activityId: parsed.data.activity_id,
    receiptNumber: parsed.data.receipt_number,
    calendarEventId: "",
    concept: parsed.data.concept,
    currencyCode: parsed.data.currency_code,
    amount: parsed.data.amount,
  });

  redirectToTreasury(result.code, parsed.data.consolidation_date, parsed.data.movement_id);
}

export async function integrateMatchingMovementAction(formData: FormData) {
  const parsed = parseFormData(formData, integrateMatchingMovementSchema);
  if (!parsed.ok) {
    logger.warn("[treasury-actions.integrate-matching] validation failed", {
      error: parsed.firstError,
    });
    redirectToTreasury("validation_error", String(formData.get("consolidation_date") ?? ""));
    return;
  }

  const result = await integrateMatchingMovement({
    secretariaMovementId: parsed.data.secretaria_movement_id,
    tesoreriaMovementId: parsed.data.tesoreria_movement_id,
  });

  redirectToTreasury(
    result.code,
    parsed.data.consolidation_date,
    parsed.data.secretaria_movement_id,
  );
}

export async function updateTransferBeforeConsolidationAction(formData: FormData) {
  const parsed = parseFormData(formData, updateTransferBeforeConsolidationSchema);
  if (!parsed.ok) {
    logger.warn("[treasury-actions.update-transfer] validation failed", {
      error: parsed.firstError,
    });
    redirectToTreasury("validation_error", String(formData.get("consolidation_date") ?? ""));
    return;
  }

  const result = await updateTransferBeforeConsolidation({
    movementId: parsed.data.movement_id,
    sourceAccountId: parsed.data.source_account_id,
    targetAccountId: parsed.data.target_account_id,
    currencyCode: parsed.data.currency_code,
    concept: parsed.data.concept,
    amount: parsed.data.amount,
  });

  redirectToTreasury(result.code, parsed.data.consolidation_date, parsed.data.movement_id);
}

export async function executeDailyConsolidationAction(formData: FormData) {
  const parsed = parseFormData(formData, executeDailyConsolidationSchema);
  if (!parsed.ok) {
    logger.warn("[treasury-actions.execute-consolidation] validation failed", {
      error: parsed.firstError,
    });
    redirectToTreasury("validation_error", "");
    return;
  }

  const result = await executeDailyConsolidation(parsed.data.consolidation_date);
  redirectToTreasury(result.code, parsed.data.consolidation_date);
}
