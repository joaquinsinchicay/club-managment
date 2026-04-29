"use client";

import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";

import { ModalFooter } from "@/components/ui/modal-footer";
import {
  FIELD_LABEL_CLASSNAME,
  FORM_GRID_CLASSNAME,
  FormInput,
  FormSelect,
} from "@/components/ui/modal-form";
import { PendingFieldset } from "@/components/ui/pending-form";
import type {
  ConsolidationTransferEdit,
  TreasuryAccount,
  TreasuryCurrencyConfig,
} from "@/lib/domain/access";
import { texts } from "@/lib/texts";
import { cn } from "@/lib/utils";

import {
  LocalFormField,
  type TransferFormState,
  buildEditTransferFormState,
  getDefaultCurrencyCode,
  getRequiredLabel,
  isTransferFormValid,
  normalizeAmountInputOnBlur,
  normalizeAmountInputOnFocus,
  sanitizeAmountInput,
} from "./_shared";

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
        <LocalFormField>
          <span className={FIELD_LABEL_CLASSNAME}>{texts.dashboard.treasury.date_label}</span>
          <FormInput type="text" value={transfer.movementDate} disabled />
        </LocalFormField>

        <LocalFormField fullWidth>
          <span className={FIELD_LABEL_CLASSNAME}>{texts.dashboard.treasury.detail_transfer_label}</span>
          <FormInput type="text" value={transfer.transferReference} disabled />
        </LocalFormField>

        <LocalFormField>
          <span className={FIELD_LABEL_CLASSNAME}>
            {getRequiredLabel(texts.dashboard.treasury.transfer_source_account_label, texts.dashboard.treasury)}
          </span>
          <FormSelect
            name="source_account_id"
            value={formState.sourceAccountId}
            onChange={(event) => setFormState((current) => ({ ...current, sourceAccountId: event.target.value }))}
          >
            <option value="" disabled>
              {texts.dashboard.treasury.transfer_source_account_placeholder}
            </option>
            {sourceAccounts.map((account) => (
              <option key={`edit-source-${account.id}`} value={account.id}>
                {account.name}
              </option>
            ))}
          </FormSelect>
        </LocalFormField>

        <LocalFormField>
          <span className={FIELD_LABEL_CLASSNAME}>
            {getRequiredLabel(texts.dashboard.treasury.transfer_target_account_label, texts.dashboard.treasury)}
          </span>
          <FormSelect
            name="target_account_id"
            value={formState.targetAccountId}
            onChange={(event) => setFormState((current) => ({ ...current, targetAccountId: event.target.value }))}
            aria-describedby={targetAccountCurrencyError ? "edit-transfer-target-account-error" : undefined}
            aria-invalid={targetAccountCurrencyError ? "true" : undefined} className={cn(targetAccountCurrencyError && "border-destructive/25")}
          >
            <option value="" disabled>
              {texts.dashboard.treasury.transfer_target_account_placeholder}
            </option>
            {targetAccounts.map((account) => (
              <option key={`edit-target-${account.id}`} value={account.id}>
                {account.name}
              </option>
            ))}
          </FormSelect>
          {targetAccountCurrencyError ? (
            <span
              id="edit-transfer-target-account-error"
              aria-live="polite"
              className="text-xs leading-5 text-destructive"
            >
              {targetAccountCurrencyError}
            </span>
          ) : null}
        </LocalFormField>

        <LocalFormField>
          <span className={FIELD_LABEL_CLASSNAME}>
            {getRequiredLabel(texts.dashboard.treasury.currency_label, texts.dashboard.treasury)}
          </span>
          <FormSelect
            name="currency_code"
            value={formState.currencyCode}
            onChange={(event) => setFormState((current) => ({ ...current, currencyCode: event.target.value }))}
            disabled={availableCurrencies.length === 0} className="disabled:text-muted-foreground"
          >
            <option value="" disabled>
              {texts.dashboard.treasury.currency_placeholder}
            </option>
            {availableCurrencies.map((currency) => (
              <option key={`edit-transfer-currency-${currency.currencyCode}`} value={currency.currencyCode}>
                {currency.currencyCode}
              </option>
            ))}
          </FormSelect>
        </LocalFormField>

        <LocalFormField fullWidth>
          <span className={FIELD_LABEL_CLASSNAME}>
            {getRequiredLabel(texts.dashboard.treasury.concept_label, texts.dashboard.treasury)}
          </span>
          <FormInput
            type="text"
            name="concept"
            value={formState.concept}
            onChange={(event) => setFormState((current) => ({ ...current, concept: event.target.value }))}
          />
        </LocalFormField>

        <LocalFormField>
          <span className={FIELD_LABEL_CLASSNAME}>
            {getRequiredLabel(texts.dashboard.treasury.amount_label, texts.dashboard.treasury)}
          </span>
          <FormInput
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
          />
        </LocalFormField>

      </PendingFieldset>

      <ModalFooter
        submitLabel={submitLabel}
        pendingLabel={pendingLabel}
        submitDisabled={!isTransferFormValid(formState, targetAccountCurrencyError)}
        submitVariant="dark"
      />
    </form>
  );
}
