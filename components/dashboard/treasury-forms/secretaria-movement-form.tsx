"use client";

import { useEffect, useMemo, useState } from "react";

import { formatSessionDateLong } from "@/lib/dates";
import { ModalFooter } from "@/components/ui/modal-footer";
import {
  FIELD_LABEL_CLASSNAME,
  FormInput,
  FormSelect,
} from "@/components/ui/modal-form";
import { PendingFieldset } from "@/components/ui/pending-form";
import { useTreasuryData } from "@/lib/contexts/treasury-data-context";
import { texts } from "@/lib/texts";
import { cn } from "@/lib/utils";

import {
  type BaseMovementFormProps,
  DISABLED_CONTROL_CLASSNAME,
  type MovementFormState,
  type OperationalFormCopy,
  buildEmptySecretariaMovementFormState,
  getDefaultCurrencyCode,
  getRequiredLabel,
  isMovementFormValid,
  normalizeAmountInputOnBlur,
  normalizeAmountInputOnFocus,
  sanitizeAmountInput,
} from "./_shared";
import { StaffContractField } from "./staff-contract-field";

export function SecretariaMovementForm({
  submitLabel,
  pendingLabel,
  submitAction,
  sessionDate,
  onCancel,
  copy = texts.dashboard.treasury,
}: BaseMovementFormProps & {
  sessionDate: string;
  onCancel: () => void;
  copy?: OperationalFormCopy;
}) {
  // Fase 4 · T3.2 — datos de dominio desde context (antes 7 props).
  const { accounts, categories, activities, currencies, movementTypes, receiptFormats, staffContracts } =
    useTreasuryData();
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
                    "flex flex-col items-center gap-0.5 rounded-card border px-3 py-3 transition",
                    isSelected
                      ? isIngreso
                        ? "border-success/30 bg-success/10 text-success"
                        : "border-ds-red-200 bg-ds-red-050 text-ds-red-700"
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
          <FormSelect
            name="account_id"
            value={formState.accountId}
            onChange={(e) => setFormState((s) => ({ ...s, accountId: e.target.value }))}
          >
            <option value="" disabled>{copy.account_placeholder}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </FormSelect>
        </label>

        {/* MONTO */}
        <div className="grid gap-2">
          <p className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.amount_label, copy)}</p>
          <div className="flex gap-2">
            {hasMultipleCurrencies ? (
              <FormSelect
                name="currency_code"
                value={formState.currencyCode}
                onChange={(e) => setFormState((s) => ({ ...s, currencyCode: e.target.value }))} className="w-24 shrink-0"
              >
                <option value="" disabled>{copy.currency_placeholder}</option>
                {availableCurrencies.map((c) => (
                  <option key={c.currencyCode} value={c.currencyCode}>{c.currencyCode}</option>
                ))}
              </FormSelect>
            ) : (
              <>
                <input type="hidden" name="currency_code" value={formState.currencyCode} />
                <div className={cn(DISABLED_CONTROL_CLASSNAME, "w-24 shrink-0 text-center font-medium text-foreground")}>
                  {formState.currencyCode || "—"}
                </div>
              </>
            )}
            <FormInput
              type="text"
              name="amount"
              inputMode="decimal"
              value={formState.amount}
              onChange={(e) => setFormState((s) => ({ ...s, amount: sanitizeAmountInput(e.target.value) }))}
              onBlur={(e) => setFormState((s) => ({ ...s, amount: normalizeAmountInputOnBlur(e.target.value) }))}
              onFocus={(e) => setFormState((s) => ({ ...s, amount: normalizeAmountInputOnFocus(e.target.value) }))}
              onKeyDown={(e) => { if (e.key === "-") e.preventDefault(); }}
              placeholder="0,00" className="flex-1 text-right tabular-nums"
            />
          </div>
          <p className="text-meta text-muted-foreground">{texts.dashboard.treasury.amount_helper_text}</p>
        </div>

        {/* SUBCATEGORÍA (izq) / CATEGORÍA (der) */}
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-2">
            <span className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.category_label, copy)}</span>
            <FormSelect
              name="category_id"
              value={formState.categoryId}
              disabled={!formState.movementType}
              onChange={(e) => setFormState((s) => ({ ...s, categoryId: e.target.value }))}
            >
              <option value="" disabled>{copy.category_placeholder}</option>
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.subCategoryName}</option>
              ))}
            </FormSelect>
          </label>
          <label className="grid gap-2">
            <span className={FIELD_LABEL_CLASSNAME}>{copy.parent_category_label}</span>
            <FormInput
              type="text"
              value={selectedParentCategory}
              disabled
              readOnly
              placeholder="—"
            />
          </label>
        </div>
        <p className="-mt-2 text-meta text-muted-foreground">{texts.dashboard.treasury.category_helper_text}</p>

        {/* ACTIVIDAD + RECIBO en la misma fila si ambos existen */}
        {hasActivityAndReceipt ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2">
              <span className={FIELD_LABEL_CLASSNAME}>{copy.activity_label}</span>
              <FormSelect
                name="activity_id"
                value={formState.activityId}
                onChange={(e) => setFormState((s) => ({ ...s, activityId: e.target.value }))}
              >
                <option value="">{copy.activity_placeholder}</option>
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </FormSelect>
            </label>
            <label className="grid gap-2">
              <span className={FIELD_LABEL_CLASSNAME}>{receiptFormats[0]?.name ?? copy.receipt_label}</span>
              <FormInput
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
              />
            </label>
          </div>
        ) : (
          <>
            {activities.length > 0 ? (
              <label className="grid gap-2">
                <span className={FIELD_LABEL_CLASSNAME}>{copy.activity_label}</span>
                <FormSelect
                  name="activity_id"
                  value={formState.activityId}
                  onChange={(e) => setFormState((s) => ({ ...s, activityId: e.target.value }))}
                >
                  <option value="">{copy.activity_placeholder}</option>
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </FormSelect>
              </label>
            ) : null}
            {receiptFormats.length > 0 ? (
              <label className="grid gap-2">
                <span className={FIELD_LABEL_CLASSNAME}>{receiptFormats[0]?.name ?? copy.receipt_label}</span>
                <FormInput
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
                />
              </label>
            ) : null}
          </>
        )}

        {/* CONCEPTO */}
        <label className="grid gap-2">
          <span className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.concept_label, copy)}</span>
          <FormInput
            type="text"
            name="concept"
            value={formState.concept}
            onChange={(e) => setFormState((s) => ({ ...s, concept: e.target.value }))}
            placeholder={texts.dashboard.treasury.concept_placeholder}
          />
        </label>

        {/* CONTRATO RRHH (opcional) */}
        {staffContracts !== undefined && (
          <StaffContractField
            options={staffContracts}
            value={formState.staffContractId}
            onChange={(next) => setFormState((s) => ({ ...s, staffContractId: next }))}
            label={texts.dashboard.treasury_role.staff_contract_label}
            placeholder={texts.dashboard.treasury_role.staff_contract_placeholder}
            emptyOptionsLabel={texts.dashboard.treasury_role.staff_contract_empty}
          />
        )}

        {/* BUTTONS */}
        <ModalFooter
          onCancel={onCancel}
          cancelLabel={copy.reset_cta}
          submitLabel={submitLabel}
          pendingLabel={pendingLabel}
          submitDisabled={!isMovementFormValid(formState)}
        />
      </PendingFieldset>
    </form>
  );
}
