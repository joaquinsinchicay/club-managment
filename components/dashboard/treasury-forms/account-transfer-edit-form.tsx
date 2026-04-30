"use client";

import { type FormEvent, useEffect, useMemo, useState } from "react";

import { formatSessionDateLong } from "@/lib/dates";
import { ModalFooter } from "@/components/ui/modal-footer";
import {
  FIELD_LABEL_CLASSNAME,
  FormInput,
  FormSelect,
} from "@/components/ui/modal-form";
import { PendingFieldset } from "@/components/ui/pending-form";
import { useTreasuryData } from "@/lib/contexts/treasury-data-context";
import type { TreasuryAccount } from "@/lib/domain/access";
import { texts } from "@/lib/texts";
import { cn } from "@/lib/utils";

import {
  DISABLED_CONTROL_CLASSNAME,
  type TransferFormState,
  getDefaultCurrencyCode,
  getRequiredLabel,
  isTransferFormValid,
  normalizeAmountInputOnBlur,
  normalizeAmountInputOnFocus,
  sanitizeAmountInput,
} from "./_shared";

export function AccountTransferEditForm({
  movementId,
  initialValues,
  sourceAccounts,
  targetAccounts,
  submitAction,
  sessionDate,
  onCancel
}: {
  movementId: string;
  initialValues: TransferFormState;
  /**
   * Igual que `AccountTransferForm`, los account sets dependen del rol y
   * NO se toman del context (ver nota en account-transfer-form.tsx).
   */
  sourceAccounts: TreasuryAccount[];
  targetAccounts: TreasuryAccount[];
  submitAction: (formData: FormData) => Promise<unknown>;
  sessionDate: string;
  onCancel: () => void;
}) {
  // Fase 4 · T3.2 — `currencies` desde context. `sourceAccounts` /
  // `targetAccounts` continúan como props.
  const { currencies } = useTreasuryData();
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
          <FormSelect
            name="source_account_id"
            value={formState.sourceAccountId}
            onChange={(e) => setFormState((s) => ({ ...s, sourceAccountId: e.target.value }))}
          >
            <option value="" disabled>{texts.dashboard.treasury.transfer_source_account_placeholder}</option>
            {sourceAccounts.map((account) => (
              <option key={`source-${account.id}`} value={account.id}>{account.name}</option>
            ))}
          </FormSelect>
        </label>

        {/* MONEDA + IMPORTE */}
        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2">
              <span className={FIELD_LABEL_CLASSNAME}>
                {getRequiredLabel(texts.dashboard.treasury.currency_label, texts.dashboard.treasury)}
              </span>
              {hasMultipleCurrencies ? (
                <FormSelect
                  name="currency_code"
                  value={formState.currencyCode}
                  onChange={(e) => setFormState((s) => ({ ...s, currencyCode: e.target.value }))}
                >
                  <option value="" disabled>{texts.dashboard.treasury.currency_placeholder}</option>
                  {availableCurrencies.map((c) => (
                    <option key={`transfer-${c.currencyCode}`} value={c.currencyCode}>{c.currencyCode}</option>
                  ))}
                </FormSelect>
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
              <FormInput
                type="text"
                name="amount"
                inputMode="decimal"
                value={formState.amount}
                onChange={(e) => setFormState((s) => ({ ...s, amount: sanitizeAmountInput(e.target.value) }))}
                onBlur={(e) => setFormState((s) => ({ ...s, amount: normalizeAmountInputOnBlur(e.target.value) }))}
                onFocus={(e) => setFormState((s) => ({ ...s, amount: normalizeAmountInputOnFocus(e.target.value) }))}
                onKeyDown={(e) => { if (e.key === "-") e.preventDefault(); }}
                placeholder="0,00" className="text-right tabular-nums"
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
            <FormSelect
              name="target_account_id"
              value={formState.targetAccountId}
              onChange={(e) => setFormState((s) => ({ ...s, targetAccountId: e.target.value }))}
              aria-describedby="edit-transfer-target-account-error"
              aria-invalid={targetAccountCurrencyError ? "true" : undefined} className={cn(targetAccountCurrencyError && "border-destructive/25")}
            >
              <option value="" disabled>{texts.dashboard.treasury.transfer_target_account_placeholder}</option>
              {targetAccounts
                .filter((account) => account.id !== formState.sourceAccountId)
                .map((account) => (
                  <option key={`target-${account.id}`} value={account.id}>{account.name}</option>
                ))}
            </FormSelect>
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
          <FormInput
            type="text"
            name="concept"
            value={formState.concept}
            onChange={(e) => setFormState((s) => ({ ...s, concept: e.target.value }))}
            placeholder={texts.dashboard.treasury.transfer_concept_placeholder}
          />
        </label>

        {/* BUTTONS */}
        <ModalFooter
          onCancel={onCancel}
          cancelLabel={texts.dashboard.treasury.reset_cta}
          submitLabel={texts.dashboard.treasury.update_cta}
          pendingLabel={texts.dashboard.treasury.update_loading}
          submitDisabled={!isTransferFormValid(formState, targetAccountCurrencyError)}
        />
      </PendingFieldset>
    </form>
  );
}
