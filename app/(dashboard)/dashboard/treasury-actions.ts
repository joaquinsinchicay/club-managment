"use server";

import { revalidatePath } from "next/cache";

import {
  closeDailyCashSessionWithDeclaredBalances,
  openDailyCashSessionWithDeclaredBalances,
  createAccountTransfer,
  createFxOperation,
  createTreasuryMovement,
  createTreasuryRoleMovement,
  type TreasuryMovementOptimisticUpdate,
  updateTreasuryRoleMovement,
  updateSecretariaMovementInOpenSession,
  updateSecretariaTransferInOpenSession
} from "@/lib/services/treasury-service";
import {
  createTreasuryAccountForActiveClub,
  updateTreasuryAccountForActiveClub
} from "@/lib/services/treasury-settings-service";
import { syncMovementCostCenterLinks } from "@/lib/services/cost-center-service";

export type TreasuryActionResponse = {
  ok: boolean;
  code: string;
  movementDisplayId?: string;
  movementId?: string;
  optimisticUpdate?: TreasuryMovementOptimisticUpdate;
};

export async function openDailyCashSessionModalAction(formData: FormData) {
  const accountIds = formData.getAll("account_id");
  const currencyCodes = formData.getAll("currency_code");
  const declaredBalances = formData.getAll("declared_balance");

  const result = await openDailyCashSessionWithDeclaredBalances(
    accountIds.map((id, i) => ({
      accountId: String(id ?? ""),
      currencyCode: String(currencyCodes[i] ?? ""),
      declaredBalance: String(declaredBalances[i] ?? "")
    }))
  );

  revalidatePath("/dashboard");
  revalidatePath("/secretary");

  return {
    ok: result.ok,
    code: result.code
  } satisfies TreasuryActionResponse;
}

export async function closeDailyCashSessionModalAction(formData: FormData) {
  const accountIds = formData.getAll("account_id");
  const currencyCodes = formData.getAll("currency_code");
  const declaredBalances = formData.getAll("declared_balance");
  const diffNotes = String(formData.get("diff_notes") ?? "");
  const notes = String(formData.get("notes") ?? "");

  const result = await closeDailyCashSessionWithDeclaredBalances(
    accountIds.map((accountId, index) => ({
      accountId: String(accountId ?? ""),
      currencyCode: String(currencyCodes[index] ?? ""),
      declaredBalance: String(declaredBalances[index] ?? "")
    })),
    { diffNotes: diffNotes || undefined, notes: notes || undefined }
  );

  revalidatePath("/dashboard");
  revalidatePath("/secretary");

  return {
    ok: result.ok,
    code: result.code
  } satisfies TreasuryActionResponse;
}

export async function createTreasuryMovementAction(formData: FormData) {
  const result = await createTreasuryMovement({
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

  revalidatePath("/dashboard");
  revalidatePath("/secretary");

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
    calendarEventId: "",
    concept: String(formData.get("concept") ?? ""),
    currencyCode: String(formData.get("currency_code") ?? ""),
    amount: String(formData.get("amount") ?? "")
  });

  // US-53: if the form carries cost_center_ids (only Tesorería sees that
  // field), sync the movement <-> cost center links right after the movement
  // is persisted. Errors are best-effort: the movement itself is already
  // committed, so we only log the sync failure for observability.
  if (result.ok && result.movementId) {
    const costCenterIds = formData.getAll("cost_center_ids").map(String).filter(Boolean);
    if (costCenterIds.length > 0) {
      const linkResult = await syncMovementCostCenterLinks({
        movementId: result.movementId,
        costCenterIds
      });
      if (!linkResult.ok) {
        console.error("[create-movement.sync_cost_centers]", {
          movementId: result.movementId,
          code: linkResult.code
        });
      }
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/treasury");

  return {
    ok: result.ok,
    code: result.code,
    movementDisplayId: result.movementDisplayId,
    movementId: result.movementId
  } satisfies TreasuryActionResponse;
}

export async function updateTreasuryRoleMovementAction(formData: FormData) {
  const movementId = String(formData.get("movement_id") ?? "");
  const result = await updateTreasuryRoleMovement({
    movementId,
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

  // US-53: sync cost-center links on edit. The form always submits the full
  // new selection (possibly empty), so the service handles diff + audit.
  if (result.ok && movementId) {
    const costCenterIds = formData.getAll("cost_center_ids").map(String).filter(Boolean);
    // The presence of the `cost_centers_present` hidden flag tells us the
    // form rendered the multiselect; otherwise we leave links untouched
    // (e.g. Secretaría editing, where the field is not visible).
    const syncRequested = formData.get("cost_centers_present") === "1";
    if (syncRequested) {
      const linkResult = await syncMovementCostCenterLinks({
        movementId,
        costCenterIds
      });
      if (!linkResult.ok) {
        console.error("[update-movement.sync_cost_centers]", {
          movementId,
          code: linkResult.code
        });
      }
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/treasury");

  return {
    ok: result.ok,
    code: result.code,
    movementDisplayId: result.movementDisplayId
  } satisfies TreasuryActionResponse;
}

export async function updateSecretariaMovementAction(formData: FormData) {
  const result = await updateSecretariaMovementInOpenSession({
    movementId: String(formData.get("movement_id") ?? ""),
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

  revalidatePath("/dashboard");
  revalidatePath("/secretary");

  return {
    ok: result.ok,
    code: result.code
  } satisfies TreasuryActionResponse;
}

export async function updateSecretariaTransferAction(formData: FormData) {
  const result = await updateSecretariaTransferInOpenSession({
    movementId: String(formData.get("movement_id") ?? ""),
    sourceAccountId: String(formData.get("source_account_id") ?? ""),
    targetAccountId: String(formData.get("target_account_id") ?? ""),
    currencyCode: String(formData.get("currency_code") ?? ""),
    concept: String(formData.get("concept") ?? ""),
    amount: String(formData.get("amount") ?? "")
  });

  revalidatePath("/dashboard");
  revalidatePath("/secretary");

  return {
    ok: result.ok,
    code: result.code
  } satisfies TreasuryActionResponse;
}

export async function createAccountTransferAction(formData: FormData) {
  const rawOriginRole = String(formData.get("origin_role") ?? "secretaria");
  const originRole: "secretaria" | "tesoreria" =
    rawOriginRole === "tesoreria" ? "tesoreria" : "secretaria";

  const result = await createAccountTransfer({
    sourceAccountId: String(formData.get("source_account_id") ?? ""),
    targetAccountId: String(formData.get("target_account_id") ?? ""),
    currencyCode: String(formData.get("currency_code") ?? ""),
    amount: String(formData.get("amount") ?? ""),
    concept: String(formData.get("concept") ?? ""),
    originRole
  });

  revalidatePath("/dashboard");
  revalidatePath("/secretary");
  revalidatePath("/treasury");

  return {
    ok: result.ok,
    code: result.code,
    movementDisplayId: result.movementDisplayId
  } satisfies TreasuryActionResponse;
}

function extractInitialBalancesFromFormData(formData: FormData): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    const match = key.match(/^initial_balance\[(.+)\]$/);
    if (match) {
      result[match[1]] = String(value);
    }
  }
  return result;
}

export async function createTreasuryAccountFromTreasuryAction(formData: FormData) {
  const result = await createTreasuryAccountForActiveClub({
    name: String(formData.get("name") ?? ""),
    accountType: String(formData.get("account_type") ?? ""),
    availableForSecretaria: formData.get("available_for_secretaria") === "on",
    currencies: formData.getAll("currencies").map((value) => String(value)),
    emoji: String(formData.get("emoji") ?? ""),
    bankEntity: String(formData.get("bank_entity") ?? ""),
    walletProvider: String(formData.get("wallet_provider") ?? ""),
    bankAccountSubtype: String(formData.get("bank_account_subtype") ?? ""),
    accountNumber: String(formData.get("account_number") ?? ""),
    cbuCvu: String(formData.get("cbu_cvu") ?? ""),
    alias: String(formData.get("alias") ?? ""),
    initialBalances: extractInitialBalancesFromFormData(formData)
  });

  revalidatePath("/treasury");

  return {
    ok: result.ok,
    code: result.code
  } satisfies TreasuryActionResponse;
}

export async function updateTreasuryAccountFromTreasuryAction(formData: FormData) {
  const result = await updateTreasuryAccountForActiveClub({
    accountId: String(formData.get("account_id") ?? ""),
    name: String(formData.get("name") ?? ""),
    accountType: String(formData.get("account_type") ?? ""),
    availableForSecretaria: formData.get("available_for_secretaria") === "on",
    currencies: formData.getAll("currencies").map((value) => String(value)),
    emoji: String(formData.get("emoji") ?? ""),
    bankEntity: String(formData.get("bank_entity") ?? ""),
    walletProvider: String(formData.get("wallet_provider") ?? ""),
    bankAccountSubtype: String(formData.get("bank_account_subtype") ?? ""),
    accountNumber: String(formData.get("account_number") ?? ""),
    cbuCvu: String(formData.get("cbu_cvu") ?? ""),
    alias: String(formData.get("alias") ?? ""),
    initialBalances: extractInitialBalancesFromFormData(formData)
  });

  revalidatePath("/treasury");

  return {
    ok: result.ok,
    code: result.code
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

  revalidatePath("/dashboard");
  revalidatePath("/treasury");

  return {
    ok: result.ok,
    code: result.code
  } satisfies TreasuryActionResponse;
}
