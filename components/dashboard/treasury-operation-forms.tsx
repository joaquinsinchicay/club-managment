"use client";

import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";

import {
  formatLocalizedAmount,
  formatLocalizedAmountInputOnBlur,
  formatLocalizedAmountInputOnFocus,
  sanitizeLocalizedAmountInput
} from "@/lib/amounts";
import { PendingFieldset, PendingSubmitButton } from "@/components/ui/pending-form";
import type {
  ClubActivity,
  ConsolidationTransferEdit,
  ReceiptFormat,
  TreasuryAccount,
  TreasuryCategory,
  TreasuryCurrencyConfig,
  TreasuryMovementType
} from "@/lib/domain/access";
import { texts } from "@/lib/texts";
import { cn } from "@/lib/utils";

type BaseMovementFormProps = {
  accounts: TreasuryAccount[];
  categories: TreasuryCategory[];
  activities: ClubActivity[];
  currencies: TreasuryCurrencyConfig[];
  movementTypes: TreasuryMovementType[];
  receiptFormats: ReceiptFormat[];
  submitLabel: string;
  pendingLabel: string;
  submitAction: (formData: FormData) => Promise<unknown>;
};

type OperationalFormCopy = {
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

const FORM_GRID_CLASSNAME = "grid gap-4 sm:grid-cols-2";
const FIELD_CLASSNAME = "grid gap-2 text-sm text-foreground";
const FULL_WIDTH_FIELD_CLASSNAME = "sm:col-span-2";
const CONTROL_CLASSNAME = "min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground";
const DISABLED_CONTROL_CLASSNAME = "min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground";

type MovementFormState = {
  movementDate?: string;
  accountId: string;
  movementType: string;
  categoryId: string;
  activityId: string;
  receiptNumber: string;
  concept: string;
  currencyCode: string;
  amount: string;
};

type TransferFormState = {
  sourceAccountId: string;
  targetAccountId: string;
  currencyCode: string;
  concept: string;
  amount: string;
};

type EditableMovement = {
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
};

function FormField({
  children,
  fullWidth = false
}: {
  children: ReactNode;
  fullWidth?: boolean;
}) {
  return <label className={cn(FIELD_CLASSNAME, fullWidth && FULL_WIDTH_FIELD_CLASSNAME)}>{children}</label>;
}


function sanitizeAmountInput(value: string) {
  return sanitizeLocalizedAmountInput(value);
}

function normalizeAmountInputOnBlur(value: string) {
  return formatLocalizedAmountInputOnBlur(value);
}

function normalizeAmountInputOnFocus(value: string) {
  return formatLocalizedAmountInputOnFocus(value);
}

function getDefaultCurrencyCode(account: TreasuryAccount | undefined, currencies: TreasuryCurrencyConfig[]) {
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

function getRequiredLabel(label: string, copy: OperationalFormCopy) {
  return `${label}${copy.required_suffix}`;
}

function MovementFormFields({
  accounts,
  categories,
  activities,
  currencies,
  movementTypes,
  receiptFormats,
  formState,
  onChange,
  showMovementDateInput = false,
  copy = texts.dashboard.treasury
}: {
  accounts: TreasuryAccount[];
  categories: TreasuryCategory[];
  activities: ClubActivity[];
  currencies: TreasuryCurrencyConfig[];
  movementTypes: TreasuryMovementType[];
  receiptFormats: ReceiptFormat[];
  formState: MovementFormState;
  onChange: (patch: Partial<MovementFormState>) => void;
  showMovementDateInput?: boolean;
  copy?: OperationalFormCopy;
}) {
  const availableCurrencies = useMemo(() => {
    const selectedAccount = accounts.find((account) => account.id === formState.accountId);

    if (!selectedAccount) {
      return [];
    }

    return currencies.filter((currency) => selectedAccount.currencies.includes(currency.currencyCode));
  }, [accounts, currencies, formState.accountId]);

  const availableCategories = useMemo(
    () =>
      categories.filter((category) => {
        if (category.isLegacy || category.movementType === "saldo") {
          return false;
        }

        if (!formState.movementType) {
          return true;
        }

        return category.movementType === formState.movementType;
      }),
    [categories, formState.movementType]
  );

  useEffect(() => {
    if (!formState.categoryId) {
      return;
    }

    const isSelectedCategoryAvailable = availableCategories.some(
      (category) => category.id === formState.categoryId
    );

    if (!isSelectedCategoryAvailable) {
      onChange({ categoryId: "" });
    }
  }, [availableCategories, formState.categoryId, onChange]);

  return (
    <>
      {showMovementDateInput ? (
        <FormField>
          <span className="font-medium">{copy.date_label}</span>
          <input
            type="date"
            name="movement_date"
            value={formState.movementDate ?? ""}
            onChange={(event) => onChange({ movementDate: event.target.value })}
            className={CONTROL_CLASSNAME}
          />
        </FormField>
      ) : null}

      <FormField>
        <span className="font-medium">{getRequiredLabel(copy.account_label, copy)}</span>
        <select
          name="account_id"
          value={formState.accountId}
          onChange={(event) => onChange({ accountId: event.target.value })}
          className={CONTROL_CLASSNAME}
        >
          <option value="" disabled>
            {copy.account_placeholder}
          </option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </select>
      </FormField>

      <FormField>
        <span className="font-medium">{getRequiredLabel(copy.movement_type_label, copy)}</span>
        <select
          name="movement_type"
          value={formState.movementType}
          onChange={(event) => onChange({ movementType: event.target.value })}
          className={CONTROL_CLASSNAME}
        >
          <option value="" disabled>
            {copy.movement_type_placeholder}
          </option>
          {movementTypes.map((movementType) => (
            <option key={movementType} value={movementType}>
              {copy.movement_types[movementType]}
            </option>
          ))}
        </select>
      </FormField>

      <FormField>
        <span className="font-medium">{getRequiredLabel(copy.category_label, copy)}</span>
        <select
          name="category_id"
          value={formState.categoryId}
          disabled={!formState.movementType}
          onChange={(event) => onChange({ categoryId: event.target.value })}
          className={formState.movementType ? CONTROL_CLASSNAME : DISABLED_CONTROL_CLASSNAME}
        >
          <option value="" disabled>
            {copy.category_placeholder}
          </option>
          {availableCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.subCategoryName}
            </option>
          ))}
        </select>
      </FormField>

      {formState.categoryId ? (
        <FormField>
          <span className="font-medium">{copy.parent_category_label}</span>
          <input
            type="text"
            value={availableCategories.find((c) => c.id === formState.categoryId)?.parentCategory ?? ""}
            disabled
            readOnly
            className={DISABLED_CONTROL_CLASSNAME}
          />
        </FormField>
      ) : null}

      {activities.length > 0 ? (
        <FormField>
          <span className="font-medium">{copy.activity_label}</span>
          <select
            name="activity_id"
            value={formState.activityId}
            onChange={(event) => onChange({ activityId: event.target.value })}
            className={CONTROL_CLASSNAME}
          >
            <option value="">{copy.activity_placeholder}</option>
            {activities.map((activity) => (
              <option key={activity.id} value={activity.id}>
                {activity.name}
              </option>
            ))}
          </select>
        </FormField>
      ) : null}

      {receiptFormats.length > 0 ? (
        <FormField fullWidth>
          <span className="font-medium">{receiptFormats[0]?.name ?? copy.receipt_label}</span>
          <input
            type="text"
            name="receipt_number"
            value={formState.receiptNumber}
            inputMode={receiptFormats[0]?.validationType === "numeric" ? "numeric" : "text"}
            pattern={receiptFormats[0]?.validationType === "numeric" ? "[0-9]*" : undefined}
            onChange={(event) => {
              const value = event.target.value;
              if (receiptFormats[0]?.validationType === "numeric") {
                if (value === "" || /^[0-9]+$/.test(value)) {
                  onChange({ receiptNumber: value });
                }
              } else {
                if (value === "" || /^[a-zA-Z0-9]*$/.test(value)) {
                  onChange({ receiptNumber: value });
                }
              }
            }}
            className={CONTROL_CLASSNAME}
          />
        </FormField>
      ) : null}

      <FormField fullWidth>
        <span className="font-medium">{getRequiredLabel(copy.concept_label, copy)}</span>
        <input
          type="text"
          name="concept"
          value={formState.concept}
          onChange={(event) => onChange({ concept: event.target.value })}
          className={CONTROL_CLASSNAME}
        />
      </FormField>

      <FormField>
        <span className="font-medium">{getRequiredLabel(copy.currency_label, copy)}</span>
        <select
          name="currency_code"
          value={formState.currencyCode}
          onChange={(event) => onChange({ currencyCode: event.target.value })}
          className={CONTROL_CLASSNAME}
          disabled={availableCurrencies.length === 0}
        >
          <option value="" disabled>
            {copy.currency_placeholder}
          </option>
          {availableCurrencies.map((currency) => (
            <option key={currency.currencyCode} value={currency.currencyCode}>
              {currency.currencyCode}
            </option>
          ))}
        </select>
      </FormField>

      <FormField>
        <span className="font-medium">{getRequiredLabel(copy.amount_label, copy)}</span>
        <input
          type="text"
          name="amount"
          inputMode="decimal"
          value={formState.amount}
          onChange={(event) => onChange({ amount: sanitizeAmountInput(event.target.value) })}
          onBlur={(event) => onChange({ amount: normalizeAmountInputOnBlur(event.target.value) })}
          onFocus={(event) => onChange({ amount: normalizeAmountInputOnFocus(event.target.value) })}
          onKeyDown={(event) => {
            if (event.key === "-") {
              event.preventDefault();
            }
          }}
          className={CONTROL_CLASSNAME}
        />
      </FormField>
    </>
  );
}

function isMovementFormValid(formState: MovementFormState) {
  return Boolean(
    formState.accountId &&
      formState.movementType &&
      formState.categoryId &&
      formState.concept.trim() &&
      formState.currencyCode &&
      formState.amount.trim()
  );
}

function buildEmptySecretariaMovementFormState(): MovementFormState {
  return {
    accountId: "",
    movementType: "",
    categoryId: "",
    activityId: "",
    receiptNumber: "",
    concept: "",
    currencyCode: "",
    amount: ""
  };
}

function buildEditMovementFormState(movement: EditableMovement): MovementFormState {
  return {
    movementDate: movement.movementDate,
    accountId: movement.accountId,
    movementType: movement.movementType,
    categoryId: movement.categoryId,
    activityId: movement.activityId ?? "",
    receiptNumber: movement.receiptNumber ?? "",
    concept: movement.concept,
    currencyCode: movement.currencyCode,
    amount: formatLocalizedAmount(movement.amount)
  };
}

function buildEmptyTransferFormState(): TransferFormState {
  return {
    sourceAccountId: "",
    targetAccountId: "",
    currencyCode: "",
    concept: "",
    amount: ""
  };
}

function buildEditTransferFormState(transfer: ConsolidationTransferEdit): TransferFormState {
  return {
    sourceAccountId: transfer.sourceAccountId,
    targetAccountId: transfer.targetAccountId,
    currencyCode: transfer.currencyCode,
    concept: transfer.concept,
    amount: formatLocalizedAmount(transfer.amount)
  };
}

function isTransferFormValid(formState: TransferFormState, targetAccountCurrencyError: string | null) {
  return Boolean(
    formState.sourceAccountId &&
      formState.targetAccountId &&
      formState.currencyCode &&
      formState.concept.trim() &&
      formState.amount.trim() &&
      !targetAccountCurrencyError
  );
}

function formatSessionDateLong(sessionDate: string): string {
  const date = new Date(`${sessionDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return sessionDate;
  const formatted = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

const FIELD_LABEL_CLASSNAME = "text-eyebrow font-semibold uppercase tracking-[0.1em] text-muted-foreground";

export function SecretariaMovementForm({
  accounts,
  categories,
  activities,
  currencies,
  movementTypes,
  receiptFormats,
  submitLabel,
  pendingLabel,
  submitAction,
  sessionDate,
  onCancel,
  copy = texts.dashboard.treasury
}: BaseMovementFormProps & {
  sessionDate: string;
  onCancel?: () => void;
  copy?: OperationalFormCopy;
}) {
  const [formState, setFormState] = useState<MovementFormState>(buildEmptySecretariaMovementFormState);

  const availableCurrencies = useMemo(() => {
    const selectedAccount = accounts.find((a) => a.id === formState.accountId);
    if (!selectedAccount) return [];
    return currencies.filter((c) => selectedAccount.currencies.includes(c.currencyCode));
  }, [accounts, currencies, formState.accountId]);

  const availableCategories = useMemo(
    () =>
      categories.filter((c) => {
        if (c.isLegacy || c.movementType === "saldo") return false;
        if (!formState.movementType) return true;
        return c.movementType === formState.movementType;
      }),
    [categories, formState.movementType]
  );

  useEffect(() => {
    if (!formState.categoryId) return;
    if (!availableCategories.some((c) => c.id === formState.categoryId)) {
      setFormState((s) => ({ ...s, categoryId: "" }));
    }
  }, [availableCategories, formState.categoryId]);

  useEffect(() => {
    const selectedAccount = accounts.find((a) => a.id === formState.accountId);
    const nextCurrencyCode = getDefaultCurrencyCode(selectedAccount, currencies);
    if (!selectedAccount && formState.currencyCode) {
      setFormState((s) => ({ ...s, currencyCode: "" }));
      return;
    }
    if (selectedAccount && nextCurrencyCode && !selectedAccount.currencies.includes(formState.currencyCode)) {
      setFormState((s) => ({ ...s, currencyCode: nextCurrencyCode }));
    }
  }, [accounts, currencies, formState.accountId, formState.currencyCode]);

  const selectedParentCategory =
    availableCategories.find((c) => c.id === formState.categoryId)?.parentCategory ?? "";

  const hasMultipleCurrencies = availableCurrencies.length > 1;

  const hasActivityAndReceipt = activities.length > 0 && receiptFormats.length > 0;

  return (
    <form
      action={async (formData) => { await submitAction(formData); }}
      className="grid gap-4"
    >
      <PendingFieldset className="grid gap-4">
        {/* FECHA */}
        <div className="grid gap-1.5">
          <p className={FIELD_LABEL_CLASSNAME}>{copy.date_label}</p>
          <div className={cn(DISABLED_CONTROL_CLASSNAME, "font-medium text-foreground")}>
            {formatSessionDateLong(sessionDate)}
          </div>
          <p className="text-meta text-muted-foreground">{texts.dashboard.treasury.date_helper_text}</p>
        </div>

        {/* TIPO DE MOVIMIENTO */}
        <div className="grid gap-2">
          <p className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.movement_type_label, copy)}</p>
          <div className="grid grid-cols-2 gap-2">
            {movementTypes.map((type) => {
              const isSelected = formState.movementType === type;
              const isIngreso = type === "ingreso";
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormState((s) => ({ ...s, movementType: type }))}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-xl border px-3 py-3 transition",
                    isSelected
                      ? isIngreso
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary"
                  )}
                >
                  <span className="text-sm font-semibold">{copy.movement_types[type]}</span>
                  <span className="text-eyebrow font-medium opacity-70">
                    {isIngreso
                      ? texts.dashboard.treasury.movement_type_ingreso_sublabel
                      : texts.dashboard.treasury.movement_type_egreso_sublabel}
                  </span>
                </button>
              );
            })}
          </div>
          <input type="hidden" name="movement_type" value={formState.movementType} />
        </div>

        {/* CUENTA */}
        <label className="grid gap-2">
          <span className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.account_label, copy)}</span>
          <select
            name="account_id"
            value={formState.accountId}
            onChange={(e) => setFormState((s) => ({ ...s, accountId: e.target.value }))}
            className={CONTROL_CLASSNAME}
          >
            <option value="" disabled>{copy.account_placeholder}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </label>

        {/* MONTO */}
        <div className="grid gap-2">
          <p className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.amount_label, copy)}</p>
          <div className="flex gap-2">
            {hasMultipleCurrencies ? (
              <select
                name="currency_code"
                value={formState.currencyCode}
                onChange={(e) => setFormState((s) => ({ ...s, currencyCode: e.target.value }))}
                className={cn(CONTROL_CLASSNAME, "w-24 shrink-0")}
              >
                <option value="" disabled>{copy.currency_placeholder}</option>
                {availableCurrencies.map((c) => (
                  <option key={c.currencyCode} value={c.currencyCode}>{c.currencyCode}</option>
                ))}
              </select>
            ) : (
              <>
                <input type="hidden" name="currency_code" value={formState.currencyCode} />
                <div className={cn(DISABLED_CONTROL_CLASSNAME, "w-24 shrink-0 text-center font-medium text-foreground")}>
                  {formState.currencyCode || "—"}
                </div>
              </>
            )}
            <input
              type="text"
              name="amount"
              inputMode="decimal"
              value={formState.amount}
              onChange={(e) => setFormState((s) => ({ ...s, amount: sanitizeAmountInput(e.target.value) }))}
              onBlur={(e) => setFormState((s) => ({ ...s, amount: normalizeAmountInputOnBlur(e.target.value) }))}
              onFocus={(e) => setFormState((s) => ({ ...s, amount: normalizeAmountInputOnFocus(e.target.value) }))}
              onKeyDown={(e) => { if (e.key === "-") e.preventDefault(); }}
              placeholder="0,00"
              className={cn(CONTROL_CLASSNAME, "flex-1 text-right tabular-nums")}
            />
          </div>
          <p className="text-meta text-muted-foreground">{texts.dashboard.treasury.amount_helper_text}</p>
        </div>

        {/* SUBCATEGORÍA (izq) / CATEGORÍA (der) */}
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-2">
            <span className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.category_label, copy)}</span>
            <select
              name="category_id"
              value={formState.categoryId}
              disabled={!formState.movementType}
              onChange={(e) => setFormState((s) => ({ ...s, categoryId: e.target.value }))}
              className={formState.movementType ? CONTROL_CLASSNAME : DISABLED_CONTROL_CLASSNAME}
            >
              <option value="" disabled>{copy.category_placeholder}</option>
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.subCategoryName}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className={FIELD_LABEL_CLASSNAME}>{copy.parent_category_label}</span>
            <input
              type="text"
              value={selectedParentCategory}
              disabled
              readOnly
              placeholder="—"
              className={DISABLED_CONTROL_CLASSNAME}
            />
          </label>
        </div>
        <p className="-mt-2 text-meta text-muted-foreground">{texts.dashboard.treasury.category_helper_text}</p>

        {/* ACTIVIDAD + RECIBO en la misma fila si ambos existen */}
        {hasActivityAndReceipt ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2">
              <span className={FIELD_LABEL_CLASSNAME}>{copy.activity_label}</span>
              <select
                name="activity_id"
                value={formState.activityId}
                onChange={(e) => setFormState((s) => ({ ...s, activityId: e.target.value }))}
                className={CONTROL_CLASSNAME}
              >
                <option value="">{copy.activity_placeholder}</option>
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className={FIELD_LABEL_CLASSNAME}>{receiptFormats[0]?.name ?? copy.receipt_label}</span>
              <input
                type="text"
                name="receipt_number"
                value={formState.receiptNumber}
                inputMode={receiptFormats[0]?.validationType === "numeric" ? "numeric" : "text"}
                onChange={(e) => {
                  const value = e.target.value;
                  if (receiptFormats[0]?.validationType === "numeric") {
                    if (value === "" || /^[0-9]+$/.test(value)) setFormState((s) => ({ ...s, receiptNumber: value }));
                  } else {
                    if (value === "" || /^[a-zA-Z0-9]*$/.test(value)) setFormState((s) => ({ ...s, receiptNumber: value }));
                  }
                }}
                className={CONTROL_CLASSNAME}
              />
            </label>
          </div>
        ) : (
          <>
            {activities.length > 0 ? (
              <label className="grid gap-2">
                <span className={FIELD_LABEL_CLASSNAME}>{copy.activity_label}</span>
                <select
                  name="activity_id"
                  value={formState.activityId}
                  onChange={(e) => setFormState((s) => ({ ...s, activityId: e.target.value }))}
                  className={CONTROL_CLASSNAME}
                >
                  <option value="">{copy.activity_placeholder}</option>
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </label>
            ) : null}
            {receiptFormats.length > 0 ? (
              <label className="grid gap-2">
                <span className={FIELD_LABEL_CLASSNAME}>{receiptFormats[0]?.name ?? copy.receipt_label}</span>
                <input
                  type="text"
                  name="receipt_number"
                  value={formState.receiptNumber}
                  inputMode={receiptFormats[0]?.validationType === "numeric" ? "numeric" : "text"}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (receiptFormats[0]?.validationType === "numeric") {
                      if (value === "" || /^[0-9]+$/.test(value)) setFormState((s) => ({ ...s, receiptNumber: value }));
                    } else {
                      if (value === "" || /^[a-zA-Z0-9]*$/.test(value)) setFormState((s) => ({ ...s, receiptNumber: value }));
                    }
                  }}
                  className={CONTROL_CLASSNAME}
                />
              </label>
            ) : null}
          </>
        )}

        {/* CONCEPTO */}
        <label className="grid gap-2">
          <span className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.concept_label, copy)}</span>
          <input
            type="text"
            name="concept"
            value={formState.concept}
            onChange={(e) => setFormState((s) => ({ ...s, concept: e.target.value }))}
            placeholder={texts.dashboard.treasury.concept_placeholder}
            className={CONTROL_CLASSNAME}
          />
        </label>

        {/* BUTTONS */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
          >
            {copy.reset_cta}
          </button>
          <PendingSubmitButton
            idleLabel={submitLabel}
            pendingLabel={pendingLabel}
            disabled={!isMovementFormValid(formState)}
            className="min-h-11 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
          />
        </div>
      </PendingFieldset>
    </form>
  );
}

export function SecretariaMovementEditForm({
  accounts,
  categories,
  activities,
  currencies,
  movementTypes,
  receiptFormats,
  submitLabel,
  pendingLabel,
  submitAction,
  movement,
  copy = texts.dashboard.treasury,
  extraHiddenFields,
  editableMovementDate = false,
  onCancel
}: BaseMovementFormProps & {
  movement: EditableMovement;
  copy?: OperationalFormCopy;
  extraHiddenFields?: ReactNode;
  editableMovementDate?: boolean;
  onCancel?: () => void;
}) {
  const [formState, setFormState] = useState<MovementFormState>(() => buildEditMovementFormState(movement));

  useEffect(() => {
    setFormState(buildEditMovementFormState(movement));
  }, [movement]);

  const availableCurrencies = useMemo(() => {
    const selectedAccount = accounts.find((a) => a.id === formState.accountId);
    if (!selectedAccount) return [];
    return currencies.filter((c) => selectedAccount.currencies.includes(c.currencyCode));
  }, [accounts, currencies, formState.accountId]);

  const availableCategories = useMemo(
    () =>
      categories.filter((c) => {
        if (c.isLegacy || c.movementType === "saldo") return false;
        if (!formState.movementType) return true;
        return c.movementType === formState.movementType;
      }),
    [categories, formState.movementType]
  );

  useEffect(() => {
    if (!formState.categoryId) return;
    if (!availableCategories.some((c) => c.id === formState.categoryId)) {
      setFormState((s) => ({ ...s, categoryId: "" }));
    }
  }, [availableCategories, formState.categoryId]);

  useEffect(() => {
    const selectedAccount = accounts.find((a) => a.id === formState.accountId);
    const nextCurrencyCode = getDefaultCurrencyCode(selectedAccount, currencies);
    if (!selectedAccount && formState.currencyCode) {
      setFormState((s) => ({ ...s, currencyCode: "" }));
      return;
    }
    if (selectedAccount && nextCurrencyCode && !selectedAccount.currencies.includes(formState.currencyCode)) {
      setFormState((s) => ({ ...s, currencyCode: nextCurrencyCode }));
    }
  }, [accounts, currencies, formState.accountId, formState.currencyCode]);

  const selectedParentCategory =
    availableCategories.find((c) => c.id === formState.categoryId)?.parentCategory ?? "";

  const hasMultipleCurrencies = availableCurrencies.length > 1;
  const hasActivityAndReceipt = activities.length > 0 && receiptFormats.length > 0;

  return (
    <form
      action={async (formData) => { await submitAction(formData); }}
      className="grid gap-4"
    >
      <input type="hidden" name="movement_id" value={movement.movementId} />
      {extraHiddenFields}

      <PendingFieldset className="grid gap-4">
        {/* ID chip */}
        <div className="flex items-center gap-2">
          <span className="text-eyebrow font-semibold uppercase tracking-[0.1em] text-muted-foreground">
            {copy.movement_id_label}
          </span>
          <span className="rounded-md bg-secondary px-2 py-0.5 text-meta font-semibold tabular-nums text-foreground">
            {movement.movementDisplayId}
          </span>
        </div>

        {/* FECHA */}
        <div className="grid gap-1.5">
          <p className={FIELD_LABEL_CLASSNAME}>{copy.date_label}</p>
          {editableMovementDate ? (
            <input
              type="date"
              name="movement_date"
              value={formState.movementDate ?? ""}
              onChange={(e) => setFormState((s) => ({ ...s, movementDate: e.target.value }))}
              className={CONTROL_CLASSNAME}
            />
          ) : (
            <div className={cn(DISABLED_CONTROL_CLASSNAME, "font-medium text-foreground")}>
              {formatSessionDateLong(movement.movementDate)}
            </div>
          )}
        </div>

        {/* TIPO DE MOVIMIENTO */}
        <div className="grid gap-2">
          <p className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.movement_type_label, copy)}</p>
          <div className="grid grid-cols-2 gap-2">
            {movementTypes.map((type) => {
              const isSelected = formState.movementType === type;
              const isIngreso = type === "ingreso";
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormState((s) => ({ ...s, movementType: type }))}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-xl border px-3 py-3 transition",
                    isSelected
                      ? isIngreso
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-red-200 bg-red-50 text-red-700"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary"
                  )}
                >
                  <span className="text-sm font-semibold">{copy.movement_types[type]}</span>
                  <span className="text-eyebrow font-medium opacity-70">
                    {isIngreso
                      ? texts.dashboard.treasury.movement_type_ingreso_sublabel
                      : texts.dashboard.treasury.movement_type_egreso_sublabel}
                  </span>
                </button>
              );
            })}
          </div>
          <input type="hidden" name="movement_type" value={formState.movementType} />
        </div>

        {/* CUENTA */}
        <label className="grid gap-2">
          <span className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.account_label, copy)}</span>
          <select
            name="account_id"
            value={formState.accountId}
            onChange={(e) => setFormState((s) => ({ ...s, accountId: e.target.value }))}
            className={CONTROL_CLASSNAME}
          >
            <option value="" disabled>{copy.account_placeholder}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
        </label>

        {/* MONTO */}
        <div className="grid gap-2">
          <p className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.amount_label, copy)}</p>
          <div className="flex gap-2">
            {hasMultipleCurrencies ? (
              <select
                name="currency_code"
                value={formState.currencyCode}
                onChange={(e) => setFormState((s) => ({ ...s, currencyCode: e.target.value }))}
                className={cn(CONTROL_CLASSNAME, "w-24 shrink-0")}
              >
                <option value="" disabled>{copy.currency_placeholder}</option>
                {availableCurrencies.map((c) => (
                  <option key={c.currencyCode} value={c.currencyCode}>{c.currencyCode}</option>
                ))}
              </select>
            ) : (
              <>
                <input type="hidden" name="currency_code" value={formState.currencyCode} />
                <div className={cn(DISABLED_CONTROL_CLASSNAME, "w-24 shrink-0 text-center font-medium text-foreground")}>
                  {formState.currencyCode || "—"}
                </div>
              </>
            )}
            <input
              type="text"
              name="amount"
              inputMode="decimal"
              value={formState.amount}
              onChange={(e) => setFormState((s) => ({ ...s, amount: sanitizeAmountInput(e.target.value) }))}
              onBlur={(e) => setFormState((s) => ({ ...s, amount: normalizeAmountInputOnBlur(e.target.value) }))}
              onFocus={(e) => setFormState((s) => ({ ...s, amount: normalizeAmountInputOnFocus(e.target.value) }))}
              onKeyDown={(e) => { if (e.key === "-") e.preventDefault(); }}
              className={cn(CONTROL_CLASSNAME, "flex-1 text-right tabular-nums")}
            />
          </div>
        </div>

        {/* SUBCATEGORÍA (izq) / CATEGORÍA (der) */}
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-2">
            <span className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.category_label, copy)}</span>
            <select
              name="category_id"
              value={formState.categoryId}
              disabled={!formState.movementType}
              onChange={(e) => setFormState((s) => ({ ...s, categoryId: e.target.value }))}
              className={formState.movementType ? CONTROL_CLASSNAME : DISABLED_CONTROL_CLASSNAME}
            >
              <option value="" disabled>{copy.category_placeholder}</option>
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.subCategoryName}</option>
              ))}
            </select>
          </label>
          <label className="grid gap-2">
            <span className={FIELD_LABEL_CLASSNAME}>{copy.parent_category_label}</span>
            <input
              type="text"
              value={selectedParentCategory}
              disabled
              readOnly
              placeholder="—"
              className={DISABLED_CONTROL_CLASSNAME}
            />
          </label>
        </div>
        <p className="-mt-2 text-meta text-muted-foreground">{texts.dashboard.treasury.category_helper_text}</p>

        {/* ACTIVIDAD + RECIBO */}
        {hasActivityAndReceipt ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2">
              <span className={FIELD_LABEL_CLASSNAME}>{copy.activity_label}</span>
              <select
                name="activity_id"
                value={formState.activityId}
                onChange={(e) => setFormState((s) => ({ ...s, activityId: e.target.value }))}
                className={CONTROL_CLASSNAME}
              >
                <option value="">{copy.activity_placeholder}</option>
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </label>
            <label className="grid gap-2">
              <span className={FIELD_LABEL_CLASSNAME}>{receiptFormats[0]?.name ?? copy.receipt_label}</span>
              <input
                type="text"
                name="receipt_number"
                value={formState.receiptNumber}
                inputMode={receiptFormats[0]?.validationType === "numeric" ? "numeric" : "text"}
                onChange={(e) => {
                  const value = e.target.value;
                  if (receiptFormats[0]?.validationType === "numeric") {
                    if (value === "" || /^[0-9]+$/.test(value)) setFormState((s) => ({ ...s, receiptNumber: value }));
                  } else {
                    if (value === "" || /^[a-zA-Z0-9]*$/.test(value)) setFormState((s) => ({ ...s, receiptNumber: value }));
                  }
                }}
                className={CONTROL_CLASSNAME}
              />
            </label>
          </div>
        ) : (
          <>
            {activities.length > 0 ? (
              <label className="grid gap-2">
                <span className={FIELD_LABEL_CLASSNAME}>{copy.activity_label}</span>
                <select
                  name="activity_id"
                  value={formState.activityId}
                  onChange={(e) => setFormState((s) => ({ ...s, activityId: e.target.value }))}
                  className={CONTROL_CLASSNAME}
                >
                  <option value="">{copy.activity_placeholder}</option>
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </select>
              </label>
            ) : null}
            {receiptFormats.length > 0 ? (
              <label className="grid gap-2">
                <span className={FIELD_LABEL_CLASSNAME}>{receiptFormats[0]?.name ?? copy.receipt_label}</span>
                <input
                  type="text"
                  name="receipt_number"
                  value={formState.receiptNumber}
                  inputMode={receiptFormats[0]?.validationType === "numeric" ? "numeric" : "text"}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (receiptFormats[0]?.validationType === "numeric") {
                      if (value === "" || /^[0-9]+$/.test(value)) setFormState((s) => ({ ...s, receiptNumber: value }));
                    } else {
                      if (value === "" || /^[a-zA-Z0-9]*$/.test(value)) setFormState((s) => ({ ...s, receiptNumber: value }));
                    }
                  }}
                  className={CONTROL_CLASSNAME}
                />
              </label>
            ) : null}
          </>
        )}

        {/* CONCEPTO */}
        <label className="grid gap-2">
          <span className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.concept_label, copy)}</span>
          <input
            type="text"
            name="concept"
            value={formState.concept}
            onChange={(e) => setFormState((s) => ({ ...s, concept: e.target.value }))}
            className={CONTROL_CLASSNAME}
          />
        </label>

        {/* REFERENCIAS (solo lectura si existen) */}
        {movement.transferReference ? (
          <div className="grid gap-1.5">
            <p className={FIELD_LABEL_CLASSNAME}>{copy.detail_transfer_label}</p>
            <div className={cn(DISABLED_CONTROL_CLASSNAME, "truncate text-small tabular-nums")}>
              {movement.transferReference}
            </div>
          </div>
        ) : null}
        {movement.fxOperationReference ? (
          <div className="grid gap-1.5">
            <p className={FIELD_LABEL_CLASSNAME}>{copy.detail_fx_label}</p>
            <div className={cn(DISABLED_CONTROL_CLASSNAME, "truncate text-small tabular-nums")}>
              {movement.fxOperationReference}
            </div>
          </div>
        ) : null}

        {/* BUTTONS */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
          >
            {copy.reset_cta}
          </button>
          <PendingSubmitButton
            idleLabel={submitLabel}
            pendingLabel={pendingLabel}
            disabled={!isMovementFormValid(formState)}
            className="min-h-11 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
          />
        </div>
      </PendingFieldset>
    </form>
  );
}

export function AccountTransferEditForm({
  movementId,
  initialValues,
  sourceAccounts,
  targetAccounts,
  currencies,
  submitAction,
  sessionDate,
  onCancel
}: {
  movementId: string;
  initialValues: TransferFormState;
  sourceAccounts: TreasuryAccount[];
  targetAccounts: TreasuryAccount[];
  currencies: TreasuryCurrencyConfig[];
  submitAction: (formData: FormData) => Promise<unknown>;
  sessionDate: string;
  onCancel?: () => void;
}) {
  const [formState, setFormState] = useState<TransferFormState>(() => initialValues);

  useEffect(() => {
    setFormState(initialValues);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movementId]);

  const selectedSourceAccount = useMemo(
    () => sourceAccounts.find((account) => account.id === formState.sourceAccountId),
    [formState.sourceAccountId, sourceAccounts]
  );
  const selectedTargetAccount = useMemo(
    () => targetAccounts.find((account) => account.id === formState.targetAccountId),
    [formState.targetAccountId, targetAccounts]
  );
  const availableCurrencies = useMemo(() => {
    if (!selectedSourceAccount) return [];
    return currencies.filter((currency) => selectedSourceAccount.currencies.includes(currency.currencyCode));
  }, [currencies, selectedSourceAccount]);

  const hasMultipleCurrencies = availableCurrencies.length > 1;

  const targetAccountCurrencyError =
    selectedTargetAccount &&
    formState.currencyCode &&
    !selectedTargetAccount.currencies.includes(formState.currencyCode)
      ? texts.dashboard.treasury.transfer_target_account_currency_error
      : null;

  useEffect(() => {
    const nextCurrencyCode = getDefaultCurrencyCode(selectedSourceAccount, currencies);
    if (!selectedSourceAccount && formState.currencyCode) {
      setFormState((s) => ({ ...s, currencyCode: "" }));
      return;
    }
    if (selectedSourceAccount && nextCurrencyCode && !selectedSourceAccount.currencies.includes(formState.currencyCode)) {
      setFormState((s) => ({ ...s, currencyCode: nextCurrencyCode }));
    }
  }, [currencies, formState.currencyCode, selectedSourceAccount]);

  return (
    <form
      action={async (formData) => { await submitAction(formData); }}
      className="grid gap-4"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        if (!isTransferFormValid(formState, targetAccountCurrencyError)) {
          event.preventDefault();
        }
      }}
    >
      <PendingFieldset className="grid gap-4">
        <input type="hidden" name="movement_id" value={movementId} />

        {/* FECHA */}
        <div className="grid gap-1.5">
          <p className={FIELD_LABEL_CLASSNAME}>{texts.dashboard.treasury.date_label}</p>
          <div className={cn(DISABLED_CONTROL_CLASSNAME, "font-medium text-foreground")}>
            {formatSessionDateLong(sessionDate)}
          </div>
          <p className="text-meta text-muted-foreground">{texts.dashboard.treasury.date_helper_text}</p>
        </div>

        {/* CUENTA ORIGEN */}
        <label className="grid gap-2">
          <span className={FIELD_LABEL_CLASSNAME}>
            {getRequiredLabel(texts.dashboard.treasury.transfer_source_account_label, texts.dashboard.treasury)}
          </span>
          <select
            name="source_account_id"
            value={formState.sourceAccountId}
            onChange={(e) => setFormState((s) => ({ ...s, sourceAccountId: e.target.value }))}
            className={CONTROL_CLASSNAME}
          >
            <option value="" disabled>{texts.dashboard.treasury.transfer_source_account_placeholder}</option>
            {sourceAccounts.map((account) => (
              <option key={`source-${account.id}`} value={account.id}>{account.name}</option>
            ))}
          </select>
        </label>

        {/* MONEDA + IMPORTE */}
        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2">
              <span className={FIELD_LABEL_CLASSNAME}>
                {getRequiredLabel(texts.dashboard.treasury.currency_label, texts.dashboard.treasury)}
              </span>
              {hasMultipleCurrencies ? (
                <select
                  name="currency_code"
                  value={formState.currencyCode}
                  onChange={(e) => setFormState((s) => ({ ...s, currencyCode: e.target.value }))}
                  className={CONTROL_CLASSNAME}
                >
                  <option value="" disabled>{texts.dashboard.treasury.currency_placeholder}</option>
                  {availableCurrencies.map((c) => (
                    <option key={`transfer-${c.currencyCode}`} value={c.currencyCode}>{c.currencyCode}</option>
                  ))}
                </select>
              ) : (
                <>
                  <input type="hidden" name="currency_code" value={formState.currencyCode} />
                  <div className={cn(DISABLED_CONTROL_CLASSNAME, "font-medium text-foreground")}>
                    {formState.currencyCode || "—"}
                  </div>
                </>
              )}
            </label>
            <label className="grid gap-2">
              <span className={FIELD_LABEL_CLASSNAME}>
                {getRequiredLabel(texts.dashboard.treasury.amount_label, texts.dashboard.treasury)}
              </span>
              <input
                type="text"
                name="amount"
                inputMode="decimal"
                value={formState.amount}
                onChange={(e) => setFormState((s) => ({ ...s, amount: sanitizeAmountInput(e.target.value) }))}
                onBlur={(e) => setFormState((s) => ({ ...s, amount: normalizeAmountInputOnBlur(e.target.value) }))}
                onFocus={(e) => setFormState((s) => ({ ...s, amount: normalizeAmountInputOnFocus(e.target.value) }))}
                onKeyDown={(e) => { if (e.key === "-") e.preventDefault(); }}
                placeholder="0,00"
                className={cn(CONTROL_CLASSNAME, "text-right tabular-nums")}
              />
            </label>
          </div>
        </div>

        {/* CUENTA DESTINO */}
        <div className="grid gap-1.5">
          <label className="grid gap-2">
            <span className={FIELD_LABEL_CLASSNAME}>
              {getRequiredLabel(texts.dashboard.treasury.transfer_target_account_label, texts.dashboard.treasury)}
            </span>
            <select
              name="target_account_id"
              value={formState.targetAccountId}
              onChange={(e) => setFormState((s) => ({ ...s, targetAccountId: e.target.value }))}
              aria-describedby="edit-transfer-target-account-error"
              aria-invalid={targetAccountCurrencyError ? "true" : undefined}
              className={cn(CONTROL_CLASSNAME, targetAccountCurrencyError && "border-destructive/25")}
            >
              <option value="" disabled>{texts.dashboard.treasury.transfer_target_account_placeholder}</option>
              {targetAccounts.map((account) => (
                <option key={`target-${account.id}`} value={account.id}>{account.name}</option>
              ))}
            </select>
          </label>
          {targetAccountCurrencyError ? (
            <span id="edit-transfer-target-account-error" aria-live="polite" className="text-meta text-destructive">
              {targetAccountCurrencyError}
            </span>
          ) : (
            <p className="text-meta text-muted-foreground">{texts.dashboard.treasury.transfer_target_account_helper}</p>
          )}
        </div>

        {/* CONCEPTO */}
        <label className="grid gap-2">
          <span className={FIELD_LABEL_CLASSNAME}>
            {getRequiredLabel(texts.dashboard.treasury.concept_label, texts.dashboard.treasury)}
          </span>
          <input
            type="text"
            name="concept"
            value={formState.concept}
            onChange={(e) => setFormState((s) => ({ ...s, concept: e.target.value }))}
            placeholder={texts.dashboard.treasury.transfer_concept_placeholder}
            className={CONTROL_CLASSNAME}
          />
        </label>

        {/* BUTTONS */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
          >
            {texts.dashboard.treasury.reset_cta}
          </button>
          <PendingSubmitButton
            idleLabel={texts.dashboard.treasury.update_cta}
            pendingLabel={texts.dashboard.treasury.update_loading}
            disabled={!isTransferFormValid(formState, targetAccountCurrencyError)}
            className="min-h-11 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
          />
        </div>
      </PendingFieldset>
    </form>
  );
}

export function AccountTransferForm({
  sourceAccounts,
  targetAccounts,
  currencies,
  submitAction,
  sessionDate,
  onCancel
}: {
  sourceAccounts: TreasuryAccount[];
  targetAccounts: TreasuryAccount[];
  currencies: TreasuryCurrencyConfig[];
  submitAction: (formData: FormData) => Promise<void>;
  sessionDate: string;
  onCancel?: () => void;
}) {
  const [formState, setFormState] = useState<TransferFormState>(buildEmptyTransferFormState);

  const selectedSourceAccount = useMemo(
    () => sourceAccounts.find((account) => account.id === formState.sourceAccountId),
    [formState.sourceAccountId, sourceAccounts]
  );
  const selectedTargetAccount = useMemo(
    () => targetAccounts.find((account) => account.id === formState.targetAccountId),
    [formState.targetAccountId, targetAccounts]
  );
  const availableCurrencies = useMemo(() => {
    if (!selectedSourceAccount) return [];
    return currencies.filter((currency) => selectedSourceAccount.currencies.includes(currency.currencyCode));
  }, [currencies, selectedSourceAccount]);

  const hasMultipleCurrencies = availableCurrencies.length > 1;

  const targetAccountCurrencyError =
    selectedTargetAccount &&
    formState.currencyCode &&
    !selectedTargetAccount.currencies.includes(formState.currencyCode)
      ? texts.dashboard.treasury.transfer_target_account_currency_error
      : null;

  useEffect(() => {
    const nextCurrencyCode = getDefaultCurrencyCode(selectedSourceAccount, currencies);
    if (!selectedSourceAccount && formState.currencyCode) {
      setFormState((s) => ({ ...s, currencyCode: "" }));
      return;
    }
    if (selectedSourceAccount && nextCurrencyCode && !selectedSourceAccount.currencies.includes(formState.currencyCode)) {
      setFormState((s) => ({ ...s, currencyCode: nextCurrencyCode }));
    }
  }, [currencies, formState.currencyCode, selectedSourceAccount]);

  return (
    <form
      action={async (formData) => { await submitAction(formData); }}
      className="grid gap-4"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        if (!isTransferFormValid(formState, targetAccountCurrencyError)) {
          event.preventDefault();
        }
      }}
    >
      <PendingFieldset className="grid gap-4">
        {/* FECHA */}
        <div className="grid gap-1.5">
          <p className={FIELD_LABEL_CLASSNAME}>{texts.dashboard.treasury.date_label}</p>
          <div className={cn(DISABLED_CONTROL_CLASSNAME, "font-medium text-foreground")}>
            {formatSessionDateLong(sessionDate)}
          </div>
          <p className="text-meta text-muted-foreground">{texts.dashboard.treasury.date_helper_text}</p>
        </div>

        {/* CUENTA ORIGEN */}
        <label className="grid gap-2">
          <span className={FIELD_LABEL_CLASSNAME}>
            {getRequiredLabel(texts.dashboard.treasury.transfer_source_account_label, texts.dashboard.treasury)}
          </span>
          <select
            name="source_account_id"
            value={formState.sourceAccountId}
            onChange={(e) => setFormState((s) => ({ ...s, sourceAccountId: e.target.value }))}
            className={CONTROL_CLASSNAME}
          >
            <option value="" disabled>{texts.dashboard.treasury.transfer_source_account_placeholder}</option>
            {sourceAccounts.map((account) => (
              <option key={`source-${account.id}`} value={account.id}>{account.name}</option>
            ))}
          </select>
        </label>

        {/* MONEDA + IMPORTE */}
        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2">
              <span className={FIELD_LABEL_CLASSNAME}>
                {getRequiredLabel(texts.dashboard.treasury.currency_label, texts.dashboard.treasury)}
              </span>
              {hasMultipleCurrencies ? (
                <select
                  name="currency_code"
                  value={formState.currencyCode}
                  onChange={(e) => setFormState((s) => ({ ...s, currencyCode: e.target.value }))}
                  className={CONTROL_CLASSNAME}
                >
                  <option value="" disabled>{texts.dashboard.treasury.currency_placeholder}</option>
                  {availableCurrencies.map((c) => (
                    <option key={`transfer-${c.currencyCode}`} value={c.currencyCode}>{c.currencyCode}</option>
                  ))}
                </select>
              ) : (
                <>
                  <input type="hidden" name="currency_code" value={formState.currencyCode} />
                  <div className={cn(DISABLED_CONTROL_CLASSNAME, "font-medium text-foreground")}>
                    {formState.currencyCode || "—"}
                  </div>
                </>
              )}
            </label>
            <label className="grid gap-2">
              <span className={FIELD_LABEL_CLASSNAME}>
                {getRequiredLabel(texts.dashboard.treasury.amount_label, texts.dashboard.treasury)}
              </span>
              <input
                type="text"
                name="amount"
                inputMode="decimal"
                value={formState.amount}
                onChange={(e) => setFormState((s) => ({ ...s, amount: sanitizeAmountInput(e.target.value) }))}
                onBlur={(e) => setFormState((s) => ({ ...s, amount: normalizeAmountInputOnBlur(e.target.value) }))}
                onFocus={(e) => setFormState((s) => ({ ...s, amount: normalizeAmountInputOnFocus(e.target.value) }))}
                onKeyDown={(e) => { if (e.key === "-") e.preventDefault(); }}
                placeholder="0,00"
                className={cn(CONTROL_CLASSNAME, "text-right tabular-nums")}
              />
            </label>
          </div>
        </div>

        {/* CUENTA DESTINO */}
        <div className="grid gap-1.5">
          <label className="grid gap-2">
            <span className={FIELD_LABEL_CLASSNAME}>
              {getRequiredLabel(texts.dashboard.treasury.transfer_target_account_label, texts.dashboard.treasury)}
            </span>
            <select
              name="target_account_id"
              value={formState.targetAccountId}
              onChange={(e) => setFormState((s) => ({ ...s, targetAccountId: e.target.value }))}
              aria-describedby="transfer-target-account-error"
              aria-invalid={targetAccountCurrencyError ? "true" : undefined}
              className={cn(CONTROL_CLASSNAME, targetAccountCurrencyError && "border-destructive/25")}
            >
              <option value="" disabled>{texts.dashboard.treasury.transfer_target_account_placeholder}</option>
              {targetAccounts.map((account) => (
                <option key={`target-${account.id}`} value={account.id}>{account.name}</option>
              ))}
            </select>
          </label>
          {targetAccountCurrencyError ? (
            <span id="transfer-target-account-error" aria-live="polite" className="text-meta text-destructive">
              {targetAccountCurrencyError}
            </span>
          ) : (
            <p className="text-meta text-muted-foreground">{texts.dashboard.treasury.transfer_target_account_helper}</p>
          )}
        </div>

        {/* CONCEPTO */}
        <label className="grid gap-2">
          <span className={FIELD_LABEL_CLASSNAME}>
            {getRequiredLabel(texts.dashboard.treasury.concept_label, texts.dashboard.treasury)}
          </span>
          <input
            type="text"
            name="concept"
            value={formState.concept}
            onChange={(e) => setFormState((s) => ({ ...s, concept: e.target.value }))}
            placeholder={texts.dashboard.treasury.transfer_concept_placeholder}
            className={CONTROL_CLASSNAME}
          />
        </label>

        {/* BUTTONS */}
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
          >
            {texts.dashboard.treasury.reset_cta}
          </button>
          <PendingSubmitButton
            idleLabel={texts.dashboard.treasury.transfer_create_cta}
            pendingLabel={texts.dashboard.treasury.transfer_create_loading}
            disabled={!isTransferFormValid(formState, targetAccountCurrencyError)}
            className="min-h-11 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
          />
        </div>
      </PendingFieldset>
    </form>
  );
}

export function ConsolidationTransferEditForm({
  sourceAccounts,
  targetAccounts,
  currencies,
  submitAction,
  submitLabel,
  pendingLabel,
  transfer,
  extraHiddenFields
}: {
  sourceAccounts: TreasuryAccount[];
  targetAccounts: TreasuryAccount[];
  currencies: TreasuryCurrencyConfig[];
  submitAction: (formData: FormData) => Promise<unknown>;
  submitLabel: string;
  pendingLabel: string;
  transfer: ConsolidationTransferEdit;
  extraHiddenFields?: ReactNode;
}) {
  const [formState, setFormState] = useState<TransferFormState>(() => buildEditTransferFormState(transfer));

  useEffect(() => {
    setFormState(buildEditTransferFormState(transfer));
  }, [transfer]);

  const selectedSourceAccount = useMemo(
    () => sourceAccounts.find((account) => account.id === formState.sourceAccountId),
    [formState.sourceAccountId, sourceAccounts]
  );
  const selectedTargetAccount = useMemo(
    () => targetAccounts.find((account) => account.id === formState.targetAccountId),
    [formState.targetAccountId, targetAccounts]
  );
  const availableCurrencies = useMemo(() => {
    if (!selectedSourceAccount) {
      return [];
    }

    return currencies.filter((currency) => selectedSourceAccount.currencies.includes(currency.currencyCode));
  }, [currencies, selectedSourceAccount]);
  const targetAccountCurrencyError =
    selectedTargetAccount &&
    formState.currencyCode &&
    !selectedTargetAccount.currencies.includes(formState.currencyCode)
      ? texts.dashboard.treasury.transfer_target_account_currency_error
      : null;

  useEffect(() => {
    const nextCurrencyCode = getDefaultCurrencyCode(selectedSourceAccount, currencies);

    if (!selectedSourceAccount && formState.currencyCode) {
      setFormState((current) => ({ ...current, currencyCode: "" }));
      return;
    }

    if (
      selectedSourceAccount &&
      nextCurrencyCode &&
      !selectedSourceAccount.currencies.includes(formState.currencyCode)
    ) {
      setFormState((current) => ({ ...current, currencyCode: nextCurrencyCode }));
    }
  }, [currencies, formState.currencyCode, selectedSourceAccount]);

  return (
    <form
      action={async (formData) => {
        await submitAction(formData);
      }}
      className="grid gap-4"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        if (!isTransferFormValid(formState, targetAccountCurrencyError)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="movement_id" value={transfer.movementId} />
      {extraHiddenFields}

      <PendingFieldset className={FORM_GRID_CLASSNAME}>
        <FormField>
          <span className="font-medium">{texts.dashboard.treasury.date_label}</span>
          <input type="text" value={transfer.movementDate} disabled className={DISABLED_CONTROL_CLASSNAME} />
        </FormField>

        <FormField fullWidth>
          <span className="font-medium">{texts.dashboard.treasury.detail_transfer_label}</span>
          <input type="text" value={transfer.transferReference} disabled className={DISABLED_CONTROL_CLASSNAME} />
        </FormField>

        <FormField>
          <span className="font-medium">
            {getRequiredLabel(texts.dashboard.treasury.transfer_source_account_label, texts.dashboard.treasury)}
          </span>
          <select
            name="source_account_id"
            value={formState.sourceAccountId}
            onChange={(event) => setFormState((current) => ({ ...current, sourceAccountId: event.target.value }))}
            className={CONTROL_CLASSNAME}
          >
            <option value="" disabled>
              {texts.dashboard.treasury.transfer_source_account_placeholder}
            </option>
            {sourceAccounts.map((account) => (
              <option key={`edit-source-${account.id}`} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField>
          <span className="font-medium">
            {getRequiredLabel(texts.dashboard.treasury.transfer_target_account_label, texts.dashboard.treasury)}
          </span>
          <select
            name="target_account_id"
            value={formState.targetAccountId}
            onChange={(event) => setFormState((current) => ({ ...current, targetAccountId: event.target.value }))}
            aria-describedby={targetAccountCurrencyError ? "edit-transfer-target-account-error" : undefined}
            aria-invalid={targetAccountCurrencyError ? "true" : undefined}
            className={cn(CONTROL_CLASSNAME, targetAccountCurrencyError && "border-destructive/25")}
          >
            <option value="" disabled>
              {texts.dashboard.treasury.transfer_target_account_placeholder}
            </option>
            {targetAccounts.map((account) => (
              <option key={`edit-target-${account.id}`} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          {targetAccountCurrencyError ? (
            <span
              id="edit-transfer-target-account-error"
              aria-live="polite"
              className="text-xs leading-5 text-destructive"
            >
              {targetAccountCurrencyError}
            </span>
          ) : null}
        </FormField>

        <FormField>
          <span className="font-medium">
            {getRequiredLabel(texts.dashboard.treasury.currency_label, texts.dashboard.treasury)}
          </span>
          <select
            name="currency_code"
            value={formState.currencyCode}
            onChange={(event) => setFormState((current) => ({ ...current, currencyCode: event.target.value }))}
            disabled={availableCurrencies.length === 0}
            className={cn(CONTROL_CLASSNAME, "disabled:text-muted-foreground")}
          >
            <option value="" disabled>
              {texts.dashboard.treasury.currency_placeholder}
            </option>
            {availableCurrencies.map((currency) => (
              <option key={`edit-transfer-currency-${currency.currencyCode}`} value={currency.currencyCode}>
                {currency.currencyCode}
              </option>
            ))}
          </select>
        </FormField>

        <FormField fullWidth>
          <span className="font-medium">
            {getRequiredLabel(texts.dashboard.treasury.concept_label, texts.dashboard.treasury)}
          </span>
          <input
            type="text"
            name="concept"
            value={formState.concept}
            onChange={(event) => setFormState((current) => ({ ...current, concept: event.target.value }))}
            className={CONTROL_CLASSNAME}
          />
        </FormField>

        <FormField>
          <span className="font-medium">
            {getRequiredLabel(texts.dashboard.treasury.amount_label, texts.dashboard.treasury)}
          </span>
          <input
            type="text"
            name="amount"
            inputMode="decimal"
            value={formState.amount}
            onChange={(event) => setFormState((current) => ({ ...current, amount: sanitizeAmountInput(event.target.value) }))}
            onBlur={(event) => setFormState((current) => ({ ...current, amount: normalizeAmountInputOnBlur(event.target.value) }))}
            onFocus={(event) =>
              setFormState((current) => ({ ...current, amount: normalizeAmountInputOnFocus(event.target.value) }))
            }
            onKeyDown={(event) => {
              if (event.key === "-") {
                event.preventDefault();
              }
            }}
            className={CONTROL_CLASSNAME}
          />
        </FormField>

        <div className="sm:col-span-2">
          <PendingSubmitButton
            idleLabel={submitLabel}
            pendingLabel={pendingLabel}
            disabled={!isTransferFormValid(formState, targetAccountCurrencyError)}
            className="min-h-11 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
          />
        </div>
      </PendingFieldset>
    </form>
  );
}

export function TreasuryRoleMovementForm({
  accounts,
  categories,
  activities,
  currencies,
  movementTypes,
  receiptFormats,
  submitLabel,
  pendingLabel,
  submitAction,
  sessionDate
}: BaseMovementFormProps & { sessionDate: string }) {
  const [formState, setFormState] = useState<MovementFormState>({
    movementDate: sessionDate,
    accountId: "",
    movementType: "",
    categoryId: "",
    activityId: "",
    receiptNumber: "",
    concept: "",
    currencyCode: "",
    amount: ""
  });

  useEffect(() => {
    const selectedAccount = accounts.find((account) => account.id === formState.accountId);
    const nextCurrencyCode = getDefaultCurrencyCode(selectedAccount, currencies);

    if (!selectedAccount && formState.currencyCode) {
      setFormState((current) => ({ ...current, currencyCode: "" }));
      return;
    }

    if (selectedAccount && nextCurrencyCode && !selectedAccount.currencies.includes(formState.currencyCode)) {
      setFormState((current) => ({ ...current, currencyCode: nextCurrencyCode }));
    }
  }, [accounts, currencies, formState.accountId, formState.currencyCode]);

  const handleReset = () =>
    setFormState({
      movementDate: sessionDate,
      accountId: "",
      movementType: "",
      categoryId: "",
      activityId: "",
      receiptNumber: "",
      concept: "",
      currencyCode: "",
      amount: ""
    });

  return (
    <form
      action={async (formData) => {
        await submitAction(formData);
      }}
      className="grid gap-4"
      onReset={handleReset}
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        if (!isMovementFormValid(formState)) {
          event.preventDefault();
          return;
        }

        window.setTimeout(handleReset, 0);
      }}
    >
      <PendingFieldset className={FORM_GRID_CLASSNAME}>
        <MovementFormFields
          accounts={accounts}
          categories={categories}
          activities={activities}
          currencies={currencies}
          movementTypes={movementTypes}
          receiptFormats={receiptFormats}
          formState={formState}
          onChange={(patch) => setFormState((current) => ({ ...current, ...patch }))}
          showMovementDateInput
          copy={texts.dashboard.treasury_role}
        />

        <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
          <PendingSubmitButton
            idleLabel={submitLabel}
            pendingLabel={pendingLabel}
            disabled={!isMovementFormValid(formState)}
            className="min-h-11 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
          />
          <button
            type="reset"
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
          >
            {texts.dashboard.treasury_role.reset_cta}
          </button>
        </div>
      </PendingFieldset>
    </form>
  );
}

type FxFormState = {
  sourceAccountId: string;
  sourceCurrencyCode: string;
  sourceAmount: string;
  targetAccountId: string;
  targetCurrencyCode: string;
  targetAmount: string;
  concept: string;
};

function buildEmptyFxFormState(): FxFormState {
  return {
    sourceAccountId: "",
    sourceCurrencyCode: "",
    sourceAmount: "",
    targetAccountId: "",
    targetCurrencyCode: "",
    targetAmount: "",
    concept: ""
  };
}

function isPositiveAmount(value: string) {
  const normalizedValue = sanitizeAmountInput(value).trim();

  if (!normalizedValue) {
    return false;
  }

  const parsedValue = Number(normalizedValue.replace(",", "."));

  return !Number.isNaN(parsedValue) && parsedValue > 0;
}

function isFxFormValid(formState: FxFormState) {
  return Boolean(
    formState.sourceAccountId &&
      formState.sourceCurrencyCode &&
      isPositiveAmount(formState.sourceAmount) &&
      formState.targetAccountId &&
      formState.targetCurrencyCode &&
      isPositiveAmount(formState.targetAmount) &&
      formState.sourceCurrencyCode !== formState.targetCurrencyCode
  );
}

export function TreasuryRoleFxForm({
  accounts,
  currencies,
  submitAction,
  sessionDate
}: {
  accounts: TreasuryAccount[];
  currencies: TreasuryCurrencyConfig[];
  submitAction: (formData: FormData) => Promise<unknown>;
  sessionDate: string;
}) {
  const [formState, setFormState] = useState<FxFormState>(buildEmptyFxFormState);

  const selectedSourceAccount = useMemo(
    () => accounts.find((account) => account.id === formState.sourceAccountId),
    [accounts, formState.sourceAccountId]
  );
  const selectedTargetAccount = useMemo(
    () => accounts.find((account) => account.id === formState.targetAccountId),
    [accounts, formState.targetAccountId]
  );

  const availableSourceCurrencies = useMemo(() => {
    if (!selectedSourceAccount) {
      return [];
    }

    return currencies.filter((currency) => selectedSourceAccount.currencies.includes(currency.currencyCode));
  }, [currencies, selectedSourceAccount]);

  const availableTargetCurrencies = useMemo(() => {
    if (!selectedTargetAccount) {
      return [];
    }

    return currencies.filter((currency) => selectedTargetAccount.currencies.includes(currency.currencyCode));
  }, [currencies, selectedTargetAccount]);

  useEffect(() => {
    const nextCurrencyCode = getDefaultCurrencyCode(selectedSourceAccount, currencies);

    if (!selectedSourceAccount && formState.sourceCurrencyCode) {
      setFormState((current) => ({ ...current, sourceCurrencyCode: "" }));
      return;
    }

    if (
      selectedSourceAccount &&
      nextCurrencyCode &&
      !selectedSourceAccount.currencies.includes(formState.sourceCurrencyCode)
    ) {
      setFormState((current) => ({ ...current, sourceCurrencyCode: nextCurrencyCode }));
    }
  }, [currencies, formState.sourceCurrencyCode, selectedSourceAccount]);

  useEffect(() => {
    const nextCurrencyCode = getDefaultCurrencyCode(selectedTargetAccount, currencies);

    if (!selectedTargetAccount && formState.targetCurrencyCode) {
      setFormState((current) => ({ ...current, targetCurrencyCode: "" }));
      return;
    }

    if (
      selectedTargetAccount &&
      nextCurrencyCode &&
      !selectedTargetAccount.currencies.includes(formState.targetCurrencyCode)
    ) {
      setFormState((current) => ({ ...current, targetCurrencyCode: nextCurrencyCode }));
    }
  }, [currencies, formState.targetCurrencyCode, selectedTargetAccount]);

  const currenciesMustBeDistinct =
    formState.sourceCurrencyCode.length > 0 &&
    formState.targetCurrencyCode.length > 0 &&
    formState.sourceCurrencyCode === formState.targetCurrencyCode;

  const handleReset = () => setFormState(buildEmptyFxFormState());

  return (
    <form
      action={async (formData) => {
        await submitAction(formData);
      }}
      className="grid gap-4"
      onReset={handleReset}
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        if (!isFxFormValid(formState)) {
          event.preventDefault();
          return;
        }

        window.setTimeout(handleReset, 0);
      }}
    >
      <PendingFieldset className={FORM_GRID_CLASSNAME}>
        <FormField>
          <span className="font-medium">{texts.dashboard.treasury_role.date_label}</span>
          <input
            type="text"
            value={sessionDate}
            disabled
            className={DISABLED_CONTROL_CLASSNAME}
          />
        </FormField>

        <FormField>
          <span className="font-medium">{getRequiredLabel(texts.dashboard.treasury_role.fx_source_account_label, texts.dashboard.treasury_role)}</span>
          <select
            name="source_account_id"
            value={formState.sourceAccountId}
            onChange={(event) => setFormState((current) => ({ ...current, sourceAccountId: event.target.value }))}
            className={CONTROL_CLASSNAME}
          >
            <option value="" disabled>
              {texts.dashboard.treasury_role.fx_source_account_placeholder}
            </option>
            {accounts.map((account) => (
              <option key={`fx-source-${account.id}`} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField>
          <span className="font-medium">{getRequiredLabel(texts.dashboard.treasury_role.fx_source_currency_label, texts.dashboard.treasury_role)}</span>
          <select
            name="source_currency_code"
            value={formState.sourceCurrencyCode}
            onChange={(event) => setFormState((current) => ({ ...current, sourceCurrencyCode: event.target.value }))}
            disabled={availableSourceCurrencies.length === 0}
            aria-invalid={currenciesMustBeDistinct ? "true" : undefined}
            className={cn(CONTROL_CLASSNAME, "disabled:text-muted-foreground", currenciesMustBeDistinct && "border-destructive/25")}
          >
            <option value="" disabled>
              {texts.dashboard.treasury_role.fx_source_currency_placeholder}
            </option>
            {availableSourceCurrencies.map((currency) => (
              <option key={`fx-source-currency-${currency.currencyCode}`} value={currency.currencyCode}>
                {currency.currencyCode}
              </option>
            ))}
          </select>
        </FormField>

        <FormField>
          <span className="font-medium">{getRequiredLabel(texts.dashboard.treasury_role.fx_source_amount_label, texts.dashboard.treasury_role)}</span>
          <input
            type="text"
            name="source_amount"
            inputMode="decimal"
            value={formState.sourceAmount}
            onChange={(event) => setFormState((current) => ({ ...current, sourceAmount: sanitizeAmountInput(event.target.value) }))}
            onBlur={(event) =>
              setFormState((current) => ({ ...current, sourceAmount: normalizeAmountInputOnBlur(event.target.value) }))
            }
            onFocus={(event) =>
              setFormState((current) => ({ ...current, sourceAmount: normalizeAmountInputOnFocus(event.target.value) }))
            }
            onKeyDown={(event) => {
              if (event.key === "-") {
                event.preventDefault();
              }
            }}
            className={CONTROL_CLASSNAME}
          />
        </FormField>

        <FormField>
          <span className="font-medium">{getRequiredLabel(texts.dashboard.treasury_role.fx_target_account_label, texts.dashboard.treasury_role)}</span>
          <select
            name="target_account_id"
            value={formState.targetAccountId}
            onChange={(event) => setFormState((current) => ({ ...current, targetAccountId: event.target.value }))}
            className={CONTROL_CLASSNAME}
          >
            <option value="" disabled>
              {texts.dashboard.treasury_role.fx_target_account_placeholder}
            </option>
            {accounts.map((account) => (
              <option key={`fx-target-${account.id}`} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField>
          <span className="font-medium">{getRequiredLabel(texts.dashboard.treasury_role.fx_target_currency_label, texts.dashboard.treasury_role)}</span>
          <select
            name="target_currency_code"
            value={formState.targetCurrencyCode}
            onChange={(event) => setFormState((current) => ({ ...current, targetCurrencyCode: event.target.value }))}
            disabled={availableTargetCurrencies.length === 0}
            aria-invalid={currenciesMustBeDistinct ? "true" : undefined}
            className={cn(CONTROL_CLASSNAME, "disabled:text-muted-foreground", currenciesMustBeDistinct && "border-destructive/25")}
          >
            <option value="" disabled>
              {texts.dashboard.treasury_role.fx_target_currency_placeholder}
            </option>
            {availableTargetCurrencies.map((currency) => (
              <option key={`fx-target-currency-${currency.currencyCode}`} value={currency.currencyCode}>
                {currency.currencyCode}
              </option>
            ))}
          </select>
        </FormField>

        <FormField>
          <span className="font-medium">{getRequiredLabel(texts.dashboard.treasury_role.fx_target_amount_label, texts.dashboard.treasury_role)}</span>
          <input
            type="text"
            name="target_amount"
            inputMode="decimal"
            value={formState.targetAmount}
            onChange={(event) => setFormState((current) => ({ ...current, targetAmount: sanitizeAmountInput(event.target.value) }))}
            onBlur={(event) =>
              setFormState((current) => ({ ...current, targetAmount: normalizeAmountInputOnBlur(event.target.value) }))
            }
            onFocus={(event) =>
              setFormState((current) => ({ ...current, targetAmount: normalizeAmountInputOnFocus(event.target.value) }))
            }
            onKeyDown={(event) => {
              if (event.key === "-") {
                event.preventDefault();
              }
            }}
            className={CONTROL_CLASSNAME}
          />
        </FormField>

        <FormField fullWidth>
          <span className="font-medium">{texts.dashboard.treasury_role.concept_label}</span>
          <input
            type="text"
            name="concept"
            value={formState.concept}
            onChange={(event) => setFormState((current) => ({ ...current, concept: event.target.value }))}
            className={CONTROL_CLASSNAME}
          />
          {currenciesMustBeDistinct ? (
            <span aria-live="polite" className="text-xs leading-5 text-destructive">
              {texts.dashboard.treasury_role.fx_distinct_currencies_error}
            </span>
          ) : null}
        </FormField>

        <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
          <PendingSubmitButton
            idleLabel={texts.dashboard.treasury_role.fx_create_cta}
            pendingLabel={texts.dashboard.treasury_role.fx_create_loading}
            disabled={!isFxFormValid(formState)}
            className="min-h-11 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
          />
          <button
            type="reset"
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
          >
            {texts.dashboard.treasury_role.reset_cta}
          </button>
        </div>
      </PendingFieldset>
    </form>
  );
}
