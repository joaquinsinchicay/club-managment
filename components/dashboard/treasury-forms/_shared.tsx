"use client";

import { type ReactNode } from "react";

import {
  formatLocalizedAmount,
  formatLocalizedAmountInputOnBlur,
  formatLocalizedAmountInputOnFocus,
  sanitizeLocalizedAmountInput
} from "@/lib/amounts";
import {
  FIELD_CLASSNAME,
  FULL_WIDTH_FIELD_CLASSNAME,
} from "@/components/ui/modal-form";
import type {
  ConsolidationTransferEdit,
  TreasuryAccount,
  TreasuryCurrencyConfig,
  TreasuryMovementType,
} from "@/lib/domain/access";
import { cn } from "@/lib/utils";

/**
 * Fase 4 · T3.2 — Los datos de dominio (accounts, categories, activities,
 * currencies, movementTypes, receiptFormats, staffContracts) ahora se
 * consumen via `useTreasuryData()` desde cada form. La prop "shape" base
 * solo contiene las labels, el action y los datos no-de-dominio (cost
 * centers todavia se pasan como prop porque son lazy / opcionales segun
 * rol y se computan separadamente del context).
 */
export type BaseMovementFormProps = {
  submitLabel: string;
  pendingLabel: string;
  submitAction: (formData: FormData) => Promise<unknown>;
  // US-53: optional multiselect of active cost centers. Only passed from
  // contexts where the user has role `tesoreria`; Secretaría never receives
  // these options. When present, the form submits `cost_center_ids[]` and
  // a `cost_centers_present` flag so the action knows to sync links.
  costCenters?: Array<{
    id: string;
    name: string;
    type: string;
    currencyCode: string;
    status: "activo" | "inactivo";
  }>;
  initialCostCenterIds?: string[];
};

export type OperationalFormCopy = {
  receipt_helper_example: string;
  receipt_helper_available_from: string;
  required_suffix: string;
  date_label: string;
  account_label: string;
  account_placeholder: string;
  movement_type_label: string;
  movement_type_placeholder: string;
  category_label: string;
  category_placeholder: string;
  parent_category_label: string;
  activity_label: string;
  activity_placeholder: string;
  receipt_label: string;
  concept_label: string;
  currency_label: string;
  currency_placeholder: string;
  amount_label: string;
  reset_cta: string;
  movement_id_label: string;
  detail_transfer_label: string;
  detail_fx_label: string;
  transfer_source_account_label?: string;
  transfer_source_account_placeholder?: string;
  transfer_target_account_label?: string;
  transfer_target_account_placeholder?: string;
  transfer_target_account_currency_error?: string;
  transfer_create_cta?: string;
  transfer_create_loading?: string;
  fx_source_account_label: string;
  fx_source_account_placeholder: string;
  fx_source_currency_label: string;
  fx_source_currency_placeholder: string;
  fx_source_amount_label: string;
  fx_target_account_label: string;
  fx_target_account_placeholder: string;
  fx_target_currency_label: string;
  fx_target_currency_placeholder: string;
  fx_target_amount_label: string;
  fx_create_cta: string;
  fx_create_loading: string;
  movement_types: Record<string, string>;
};

// Variante de CONTROL_CLASSNAME para inputs/selects deshabilitados.
// No coincide con FORM_READONLY_CLASSNAME (que es inline-flex para <div>),
// porque acá se aplica directamente a controles de form.
export const DISABLED_CONTROL_CLASSNAME = "min-h-11 w-full rounded-card border border-border bg-secondary-readonly px-4 py-3 text-sm text-muted-foreground";

export type MovementFormState = {
  movementDate?: string;
  accountId: string;
  movementType: string;
  categoryId: string;
  activityId: string;
  receiptNumber: string;
  concept: string;
  currencyCode: string;
  amount: string;
  /** FK opcional a staff_contracts(id). Vacio = "Sin asignar". */
  staffContractId: string;
};

export type TransferFormState = {
  sourceAccountId: string;
  targetAccountId: string;
  currencyCode: string;
  concept: string;
  amount: string;
};

export type EditableMovement = {
  movementId: string;
  movementDisplayId: string;
  movementDate: string;
  accountId: string;
  movementType: TreasuryMovementType;
  categoryId: string;
  activityId: string | null;
  receiptNumber: string | null;
  transferReference?: string | null;
  fxOperationReference?: string | null;
  concept: string;
  currencyCode: string;
  amount: number;
  staffContractId?: string | null;
};

/**
 * Wrapper local para campos de form. Funcionalmente equivalente a
 * `<FormField>` de `@/components/ui/modal-form` (mismo classname), pero se
 * preserva con otro nombre para evitar shadowing del primitivo en el
 * proceso de extraccion. Solo se usa internamente por los forms de este
 * directorio.
 */
export function LocalFormField({
  children,
  fullWidth = false
}: {
  children: ReactNode;
  fullWidth?: boolean;
}) {
  return <label className={cn(FIELD_CLASSNAME, fullWidth && FULL_WIDTH_FIELD_CLASSNAME)}>{children}</label>;
}

export function sanitizeAmountInput(value: string) {
  return sanitizeLocalizedAmountInput(value);
}

export function normalizeAmountInputOnBlur(value: string) {
  return formatLocalizedAmountInputOnBlur(value);
}

export function normalizeAmountInputOnFocus(value: string) {
  return formatLocalizedAmountInputOnFocus(value);
}

export function getDefaultCurrencyCode(account: TreasuryAccount | undefined, currencies: TreasuryCurrencyConfig[]) {
  if (!account) {
    return "";
  }

  const availableCurrencyCodes = currencies
    .map((currency) => currency.currencyCode)
    .filter((currencyCode) => account.currencies.includes(currencyCode));

  if (availableCurrencyCodes.length === 0) {
    return "";
  }

  if (availableCurrencyCodes.length > 1 && availableCurrencyCodes.includes("ARS")) {
    return "ARS";
  }

  return availableCurrencyCodes[0] ?? "";
}

export function getRequiredLabel(label: string, copy: OperationalFormCopy) {
  return `${label}${copy.required_suffix}`;
}

export function isMovementFormValid(formState: MovementFormState) {
  return Boolean(
    formState.accountId &&
      formState.movementType &&
      formState.categoryId &&
      formState.concept.trim() &&
      formState.currencyCode &&
      formState.amount.trim()
  );
}

export function buildEmptySecretariaMovementFormState(): MovementFormState {
  return {
    accountId: "",
    movementType: "",
    categoryId: "",
    activityId: "",
    receiptNumber: "",
    concept: "",
    currencyCode: "",
    amount: "",
    staffContractId: ""
  };
}

export function buildEditMovementFormState(movement: EditableMovement): MovementFormState {
  return {
    movementDate: movement.movementDate,
    accountId: movement.accountId,
    movementType: movement.movementType,
    categoryId: movement.categoryId,
    activityId: movement.activityId ?? "",
    receiptNumber: movement.receiptNumber ?? "",
    concept: movement.concept,
    currencyCode: movement.currencyCode,
    amount: formatLocalizedAmount(movement.amount),
    staffContractId: movement.staffContractId ?? ""
  };
}

export function buildEmptyTransferFormState(): TransferFormState {
  return {
    sourceAccountId: "",
    targetAccountId: "",
    currencyCode: "",
    concept: "",
    amount: ""
  };
}

export function buildEditTransferFormState(transfer: ConsolidationTransferEdit): TransferFormState {
  return {
    sourceAccountId: transfer.sourceAccountId,
    targetAccountId: transfer.targetAccountId,
    currencyCode: transfer.currencyCode,
    concept: transfer.concept,
    amount: formatLocalizedAmount(transfer.amount)
  };
}

export function isTransferFormValid(formState: TransferFormState, targetAccountCurrencyError: string | null) {
  return Boolean(
    formState.sourceAccountId &&
      formState.targetAccountId &&
      formState.currencyCode &&
      formState.concept.trim() &&
      formState.amount.trim() &&
      !targetAccountCurrencyError
  );
}
