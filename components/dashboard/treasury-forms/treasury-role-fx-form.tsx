"use client";

import { type FormEvent, useMemo, useState } from "react";

import {
  formatLocalizedAmount,
  parseLocalizedAmount,
} from "@/lib/amounts";
import { formatSessionDateLong } from "@/lib/dates";
import { ModalFooter } from "@/components/ui/modal-footer";
import {
  FIELD_LABEL_CLASSNAME,
  FormBanner,
  FormInput,
  FormSelect,
} from "@/components/ui/modal-form";
import { PendingFieldset } from "@/components/ui/pending-form";
import { useTreasuryData } from "@/lib/contexts/treasury-data-context";
import { texts } from "@/lib/texts";
import { cn } from "@/lib/utils";

import {
  DISABLED_CONTROL_CLASSNAME,
  normalizeAmountInputOnBlur,
  normalizeAmountInputOnFocus,
  sanitizeAmountInput,
} from "./_shared";

type FxFormState = {
  operationType: "compra" | "venta";
  sourceAccountId: string;
  targetAccountId: string;
  sourceAmount: string;
  exchangeRate: string;
  concept: string;
};

function buildEmptyFxFormState(): FxFormState {
  return {
    operationType: "compra",
    sourceAccountId: "",
    targetAccountId: "",
    sourceAmount: "",
    exchangeRate: "",
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
      formState.targetAccountId &&
      isPositiveAmount(formState.sourceAmount) &&
      isPositiveAmount(formState.exchangeRate)
  );
}

export function TreasuryRoleFxForm({
  submitAction,
  sessionDate,
  onCancel
}: {
  submitAction: (formData: FormData) => Promise<unknown>;
  sessionDate: string;
  onCancel: () => void;
}) {
  // Fase 4 · T3.2 — `accounts` desde context (antes prop).
  const { accounts } = useTreasuryData();
  const [formState, setFormState] = useState<FxFormState>(buildEmptyFxFormState);

  const sourceCurrencyCode = formState.operationType === "compra" ? "ARS" : "USD";
  const targetCurrencyCode = formState.operationType === "compra" ? "USD" : "ARS";

  const computedTargetAmount = useMemo(() => {
    const parsedSource = parseLocalizedAmount(formState.sourceAmount);
    const parsedRate = parseLocalizedAmount(formState.exchangeRate);
    if (!parsedSource || !parsedRate || parsedRate === 0) return null;
    return formState.operationType === "compra"
      ? parsedSource / parsedRate
      : parsedSource * parsedRate;
  }, [formState.operationType, formState.sourceAmount, formState.exchangeRate]);

  const computedTargetAmountForSubmit = computedTargetAmount !== null
    ? formatLocalizedAmount(computedTargetAmount)
    : "";

  const handleReset = () => setFormState(buildEmptyFxFormState());

  return (
    <form
      action={async (formData) => {
        await submitAction(formData);
      }}
      className="flex flex-col gap-4"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        if (!isFxFormValid(formState)) {
          event.preventDefault();
          return;
        }
        window.setTimeout(handleReset, 0);
      }}
    >
      {/* Hidden inputs for backend */}
      <input type="hidden" name="source_currency_code" value={sourceCurrencyCode} />
      <input type="hidden" name="target_currency_code" value={targetCurrencyCode} />
      <input type="hidden" name="target_amount" value={computedTargetAmountForSubmit} />

      <PendingFieldset className="flex flex-col gap-4">
        {/* FECHA */}
        <div className="flex flex-col gap-1.5">
          <p className={FIELD_LABEL_CLASSNAME}>{texts.dashboard.treasury_role.date_label}</p>
          <div className={DISABLED_CONTROL_CLASSNAME}>
            {formatSessionDateLong(sessionDate)}
          </div>
        </div>

        {/* OPERACIÓN */}
        <div className="flex flex-col gap-1.5">
          <p className={FIELD_LABEL_CLASSNAME}>
            {texts.dashboard.treasury_role.fx_operation_label}
            <span className="text-destructive" aria-hidden="true"> *</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(["compra", "venta"] as const).map((op) => {
              const isSelected = formState.operationType === op;
              return (
                <button
                  key={op}
                  type="button"
                  onClick={() => setFormState((s) => ({ ...s, operationType: op }))}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-card border px-3 py-3 transition",
                    isSelected
                      ? "border-info/30 bg-info/10 text-info"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary"
                  )}
                >
                  <span className="text-sm font-semibold">
                    {op === "compra"
                      ? texts.dashboard.treasury_role.fx_operation_compra
                      : texts.dashboard.treasury_role.fx_operation_venta}
                  </span>
                  <span className="text-eyebrow font-medium opacity-70">
                    {op === "compra"
                      ? texts.dashboard.treasury_role.fx_operation_compra_sublabel
                      : texts.dashboard.treasury_role.fx_operation_venta_sublabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* CUENTA ORIGEN + MONTO ENTREGADO */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <p className={FIELD_LABEL_CLASSNAME}>
              {texts.dashboard.treasury_role.fx_source_account_label}
              <span className="text-destructive" aria-hidden="true"> *</span>
            </p>
            <FormSelect
              name="source_account_id"
              value={formState.sourceAccountId}
              onChange={(e) => setFormState((s) => ({ ...s, sourceAccountId: e.target.value }))}
            >
              <option value="" disabled>{texts.dashboard.treasury_role.fx_source_account_placeholder}</option>
              {accounts.map((account) => (
                <option key={`fx-source-${account.id}`} value={account.id}>{account.name}</option>
              ))}
            </FormSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className={FIELD_LABEL_CLASSNAME}>
              {texts.dashboard.treasury_role.fx_source_amount_label}
              <span className="text-destructive" aria-hidden="true"> *</span>
            </p>
            <div className="flex overflow-hidden rounded-card border border-border bg-card focus-within:ring-2 focus-within:ring-foreground/10">
              <span className="flex shrink-0 items-center border-r border-border bg-secondary-hover px-3 text-sm font-semibold text-muted-foreground">
                {sourceCurrencyCode}
              </span>
              {/* eslint-disable-next-line no-restricted-syntax -- Compound input (badge + input transparente): <FormInput> no soporta el layout inline con badge pegado. */}
              <input
                type="text"
                name="source_amount"
                inputMode="decimal"
                value={formState.sourceAmount}
                onChange={(e) => setFormState((s) => ({ ...s, sourceAmount: sanitizeAmountInput(e.target.value) }))}
                onBlur={(e) => setFormState((s) => ({ ...s, sourceAmount: normalizeAmountInputOnBlur(e.target.value) }))}
                onFocus={(e) => setFormState((s) => ({ ...s, sourceAmount: normalizeAmountInputOnFocus(e.target.value) }))}
                onKeyDown={(e) => { if (e.key === "-") e.preventDefault(); }}
                placeholder="0,00"
                className="min-h-11 flex-1 bg-transparent px-3 py-2 text-right text-sm tabular-nums text-foreground focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* TIPO DE CAMBIO */}
        <div className="flex flex-col gap-1.5">
          <p className={FIELD_LABEL_CLASSNAME}>
            {texts.dashboard.treasury_role.fx_exchange_rate_label}
            <span className="text-destructive" aria-hidden="true"> *</span>
          </p>
          <div className="flex overflow-hidden rounded-card border border-border bg-card focus-within:ring-2 focus-within:ring-foreground/10">
            <span className="flex shrink-0 items-center border-r border-border bg-secondary-hover px-3 text-sm font-semibold text-muted-foreground">
              1 USD =
            </span>
            {/* eslint-disable-next-line no-restricted-syntax -- Compound input (badge + input transparente): <FormInput> no soporta el layout inline con badge pegado. */}
            <input
              type="text"
              inputMode="decimal"
              value={formState.exchangeRate}
              onChange={(e) => setFormState((s) => ({ ...s, exchangeRate: sanitizeAmountInput(e.target.value) }))}
              onBlur={(e) => setFormState((s) => ({ ...s, exchangeRate: normalizeAmountInputOnBlur(e.target.value) }))}
              onFocus={(e) => setFormState((s) => ({ ...s, exchangeRate: normalizeAmountInputOnFocus(e.target.value) }))}
              onKeyDown={(e) => { if (e.key === "-") e.preventDefault(); }}
              placeholder="1.040,00"
              className="min-h-11 flex-1 bg-transparent px-3 py-2 text-right text-sm tabular-nums text-foreground focus:outline-none"
            />
          </div>
          <p className="text-meta text-muted-foreground">{texts.dashboard.treasury_role.fx_exchange_rate_helper}</p>
        </div>

        {/* CUENTA DESTINO + MONTO RECIBIDO */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <p className={FIELD_LABEL_CLASSNAME}>
              {texts.dashboard.treasury_role.fx_target_account_label}
              <span className="text-destructive" aria-hidden="true"> *</span>
            </p>
            <FormSelect
              name="target_account_id"
              value={formState.targetAccountId}
              onChange={(e) => setFormState((s) => ({ ...s, targetAccountId: e.target.value }))}
            >
              <option value="" disabled>{texts.dashboard.treasury_role.fx_target_account_placeholder}</option>
              {accounts.map((account) => (
                <option key={`fx-target-${account.id}`} value={account.id}>{account.name}</option>
              ))}
            </FormSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className={FIELD_LABEL_CLASSNAME}>{texts.dashboard.treasury_role.fx_target_amount_label}</p>
            <div className="flex overflow-hidden rounded-card border border-border bg-secondary-readonly">
              <span className="flex shrink-0 items-center border-r border-border bg-secondary-pressed px-3 text-sm font-semibold text-muted-foreground">
                {targetCurrencyCode}
              </span>
              <span className="flex min-h-11 flex-1 items-center justify-end px-3 text-sm tabular-nums text-muted-foreground">
                {computedTargetAmount !== null
                  ? formatLocalizedAmount(computedTargetAmount)
                  : "0,00"}
              </span>
            </div>
            <p className="text-meta text-muted-foreground">{texts.dashboard.treasury_role.fx_target_amount_helper}</p>
          </div>
        </div>

        {/* CONCEPTO */}
        <div className="flex flex-col gap-1.5">
          <p className={FIELD_LABEL_CLASSNAME}>{texts.dashboard.treasury_role.concept_label}</p>
          <FormInput
            type="text"
            name="concept"
            value={formState.concept}
            onChange={(e) => setFormState((s) => ({ ...s, concept: e.target.value }))}
            placeholder={texts.dashboard.treasury_role.fx_concept_placeholder}
          />
        </div>

        {/* BANNER INFO */}
        <FormBanner variant="info">
          {texts.dashboard.treasury_role.fx_info_banner}
        </FormBanner>

        <ModalFooter
          onCancel={onCancel}
          cancelLabel={texts.dashboard.treasury_role.reset_cta}
          submitLabel={texts.dashboard.treasury_role.fx_create_cta}
          pendingLabel={texts.dashboard.treasury_role.fx_create_loading}
          submitDisabled={!isFxFormValid(formState)}
          submitVariant="dark"
        />
      </PendingFieldset>
    </form>
  );
}
