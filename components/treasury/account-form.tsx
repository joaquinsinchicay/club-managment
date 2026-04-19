"use client";

import { useMemo, useState } from "react";

import { PendingFieldset, PendingSubmitButton } from "@/components/ui/pending-form";
import type {
  TreasuryAccount,
  TreasuryAccountType,
  TreasuryBankAccountSubtype,
  TreasuryCurrencyCode
} from "@/lib/domain/access";
import { texts } from "@/lib/texts";
import { cn } from "@/lib/utils";

const CURRENCY_OPTIONS: TreasuryCurrencyCode[] = ["ARS", "USD"];
const ACCOUNT_TYPE_OPTIONS: TreasuryAccountType[] = ["bancaria", "billetera_virtual", "efectivo"];
const SUBTYPE_OPTIONS: TreasuryBankAccountSubtype[] = ["cuenta_corriente", "caja_ahorro"];
const CBU_REGEX = /^\d{22}$/;
const ALIAS_REGEX = /^[A-Za-z0-9.]+$/;

const ACCOUNT_TYPE_COLORS: Record<TreasuryAccountType, { base: string; selected: string }> = {
  bancaria: {
    base: "border-border bg-card text-foreground hover:bg-ds-blue-050/60",
    selected: "border-ds-blue-700 bg-ds-blue-050 text-ds-blue-700"
  },
  billetera_virtual: {
    base: "border-border bg-card text-foreground hover:bg-amber-50/60",
    selected: "border-amber-500 bg-amber-50 text-amber-700"
  },
  efectivo: {
    base: "border-border bg-card text-foreground hover:bg-emerald-50/60",
    selected: "border-emerald-500 bg-emerald-50 text-emerald-700"
  }
};

function formatInitialBalance(value: number): string {
  if (!Number.isFinite(value)) return "0,00";
  return value.toFixed(2).replace(".", ",");
}

export type TreasuryAccountFormProps = {
  action: (formData: FormData) => Promise<void> | Promise<unknown>;
  submitLabel: string;
  pendingLabel: string;
  cancelLabel?: string;
  onCancel?: () => void;
  defaultAccount?: TreasuryAccount;
};

export function TreasuryAccountForm({
  action,
  submitLabel,
  pendingLabel,
  cancelLabel,
  onCancel,
  defaultAccount
}: TreasuryAccountFormProps) {
  const [accountType, setAccountType] = useState<TreasuryAccountType | "">(
    defaultAccount?.accountType ?? ""
  );
  const [selectedCurrencies, setSelectedCurrencies] = useState<TreasuryCurrencyCode[]>(
    defaultAccount?.currencies.filter((c): c is TreasuryCurrencyCode =>
      CURRENCY_OPTIONS.includes(c as TreasuryCurrencyCode)
    ) ?? []
  );
  const defaultBalances = useMemo(() => {
    const map: Record<TreasuryCurrencyCode, string> = { ARS: "0,00", USD: "0,00" };
    defaultAccount?.currencyDetails.forEach((detail) => {
      map[detail.currencyCode] = formatInitialBalance(detail.initialBalance);
    });
    return map;
  }, [defaultAccount]);
  const [initialBalances, setInitialBalances] = useState<Record<TreasuryCurrencyCode, string>>(defaultBalances);
  const [availableForSecretaria, setAvailableForSecretaria] = useState<boolean>(
    defaultAccount?.visibleForSecretaria ?? false
  );
  const [cbuValue, setCbuValue] = useState<string>(
    defaultAccount?.accountType === "bancaria" ? (defaultAccount?.cbuCvu ?? "") : ""
  );
  const [aliasValue, setAliasValue] = useState<string>(
    defaultAccount?.accountType === "billetera_virtual" ? (defaultAccount?.cbuCvu ?? "") : ""
  );
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    accountType?: string;
    currencies?: string;
    cbu?: string;
    alias?: string;
  }>({});

  function toggleCurrency(code: TreasuryCurrencyCode) {
    setSelectedCurrencies((current) =>
      current.includes(code) ? current.filter((c) => c !== code) : [...current, code]
    );
    setFormErrors((prev) => ({ ...prev, currencies: undefined }));
  }

  function handleBalanceChange(code: TreasuryCurrencyCode, value: string) {
    setInitialBalances((prev) => ({ ...prev, [code]: value }));
  }

  const showBankFields = accountType === "bancaria";
  const showWalletFields = accountType === "billetera_virtual";

  function validateAndSubmit(event: React.FormEvent<HTMLFormElement>) {
    const errors: typeof formErrors = {};
    const form = event.currentTarget;
    const nameValue = String(new FormData(form).get("name") ?? "").trim();
    if (!nameValue) errors.name = texts.settings.club.treasury.feedback.account_name_required;
    if (!accountType) errors.accountType = texts.settings.club.treasury.feedback.account_type_required;
    if (selectedCurrencies.length === 0) {
      errors.currencies = texts.settings.club.treasury.feedback.account_currencies_required;
    }
    if (showBankFields && cbuValue.trim() && !CBU_REGEX.test(cbuValue.trim())) {
      errors.cbu = texts.settings.club.treasury.feedback.invalid_cbu;
    }
    if (showWalletFields && aliasValue.trim() && !ALIAS_REGEX.test(aliasValue.trim())) {
      errors.alias = texts.settings.club.treasury.feedback.invalid_alias;
    }
    if (Object.keys(errors).length > 0) {
      event.preventDefault();
      setFormErrors(errors);
    }
  }

  return (
    <form
      action={action as (formData: FormData) => Promise<void>}
      onSubmit={validateAndSubmit}
      className="flex min-h-0 flex-1 flex-col"
    >
      <PendingFieldset className="flex min-h-0 flex-1 flex-col gap-5">
        {defaultAccount ? <input type="hidden" name="account_id" value={defaultAccount.id} /> : null}
        <input type="hidden" name="account_type" value={accountType} />
        {availableForSecretaria ? <input type="hidden" name="available_for_secretaria" value="on" /> : null}

        {/* Tipo de cuenta */}
        <div className="grid gap-2">
          <span className="text-sm font-medium text-foreground">
            {texts.settings.club.treasury.account_type_label}{" "}
            <span aria-hidden="true" className="text-destructive">*</span>
          </span>
          <div className="grid grid-cols-3 gap-2">
            {ACCOUNT_TYPE_OPTIONS.map((type) => {
              const selected = accountType === type;
              const palette = ACCOUNT_TYPE_COLORS[type];
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => {
                    setAccountType(type);
                    setFormErrors((prev) => ({ ...prev, accountType: undefined }));
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 rounded-2xl border p-4 text-sm font-semibold transition",
                    selected ? palette.selected : palette.base
                  )}
                >
                  <span aria-hidden="true" className="text-2xl leading-none">
                    {texts.settings.club.treasury.account_type_emojis[type]}
                  </span>
                  <span>{texts.settings.club.treasury.account_type_cards[type]}</span>
                </button>
              );
            })}
          </div>
          {formErrors.accountType ? (
            <p className="text-sm text-destructive" aria-live="polite">
              {formErrors.accountType}
            </p>
          ) : null}
        </div>

        {/* Nombre */}
        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">
            {texts.settings.club.treasury.account_name_label}{" "}
            <span aria-hidden="true" className="text-destructive">*</span>
          </span>
          <input
            type="text"
            name="name"
            defaultValue={defaultAccount?.name ?? ""}
            placeholder={texts.settings.club.treasury.account_name_placeholder}
            onChange={() => setFormErrors((prev) => ({ ...prev, name: undefined }))}
            className="min-h-11 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
          />
          <span className="text-meta text-muted-foreground">
            {texts.settings.club.treasury.account_name_helper}
          </span>
          {formErrors.name ? (
            <span className="text-sm text-destructive" aria-live="polite">{formErrors.name}</span>
          ) : null}
        </label>

        {/* Monedas */}
        <div className="grid gap-2">
          <span className="text-sm font-medium text-foreground">
            {texts.settings.club.treasury.account_currencies_label}{" "}
            <span aria-hidden="true" className="text-destructive">*</span>
          </span>
          <div className="flex flex-wrap gap-2">
            {CURRENCY_OPTIONS.map((code) => {
              const selected = selectedCurrencies.includes(code);
              return (
                <button
                  key={code}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggleCurrency(code)}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-2 rounded-full border px-5 text-sm font-semibold transition",
                    selected
                      ? "border-ds-blue-700 bg-ds-blue-050 text-ds-blue-700"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary/60"
                  )}
                >
                  {selected ? (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} aria-hidden="true" className="size-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  ) : null}
                  {code}
                </button>
              );
            })}
          </div>
          {selectedCurrencies.map((code) => (
            <input key={`cur-${code}`} type="hidden" name="currencies" value={code} />
          ))}
          <span className="text-meta text-muted-foreground">
            {texts.settings.club.treasury.account_currencies_helper}
          </span>
          {formErrors.currencies ? (
            <span className="text-sm text-destructive" aria-live="polite">{formErrors.currencies}</span>
          ) : null}
        </div>

        {/* Campos Banco */}
        {showBankFields ? (
          <>
            <label className="grid gap-2 text-sm text-foreground">
              <span className="font-medium">{texts.settings.club.treasury.bank_entity_label}</span>
              <select
                name="bank_entity"
                defaultValue={defaultAccount?.bankEntity ?? ""}
                className="min-h-11 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
              >
                <option value="">{texts.settings.club.treasury.bank_entity_placeholder}</option>
                {texts.settings.club.treasury.bank_entities.map((entity) => (
                  <option key={entity} value={entity}>{entity}</option>
                ))}
              </select>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="grid gap-2 text-sm text-foreground">
                <span className="font-medium">{texts.settings.club.treasury.bank_account_subtype_label}</span>
                <select
                  name="bank_account_subtype"
                  defaultValue={defaultAccount?.bankAccountSubtype ?? ""}
                  className="min-h-11 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
                >
                  <option value="">{texts.settings.club.treasury.bank_account_subtype_placeholder}</option>
                  {SUBTYPE_OPTIONS.map((subtype) => (
                    <option key={subtype} value={subtype}>
                      {texts.settings.club.treasury.bank_account_subtypes[subtype]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm text-foreground">
                <span className="font-medium">{texts.settings.club.treasury.account_number_label}</span>
                <input
                  type="text"
                  name="account_number"
                  defaultValue={defaultAccount?.accountNumber ?? ""}
                  placeholder={texts.settings.club.treasury.account_number_placeholder}
                  className="min-h-11 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
                />
              </label>
            </div>

            <label className="grid gap-2 text-sm text-foreground">
              <span className="font-medium">{texts.settings.club.treasury.cbu_cvu_label}</span>
              <input
                type="text"
                name="cbu_cvu"
                inputMode="numeric"
                maxLength={22}
                value={cbuValue}
                onChange={(event) => {
                  setCbuValue(event.target.value.replace(/\D/g, "").slice(0, 22));
                  setFormErrors((prev) => ({ ...prev, cbu: undefined }));
                }}
                placeholder={texts.settings.club.treasury.cbu_cvu_placeholder}
                className="min-h-11 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
              />
              {formErrors.cbu ? (
                <span className="text-sm text-destructive" aria-live="polite">{formErrors.cbu}</span>
              ) : null}
            </label>
          </>
        ) : null}

        {/* Campos Billetera */}
        {showWalletFields ? (
          <>
            <label className="grid gap-2 text-sm text-foreground">
              <span className="font-medium">{texts.settings.club.treasury.wallet_provider_label}</span>
              <select
                name="wallet_provider"
                defaultValue={
                  defaultAccount?.accountType === "billetera_virtual" ? (defaultAccount?.bankEntity ?? "") : ""
                }
                className="min-h-11 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
              >
                <option value="">{texts.settings.club.treasury.wallet_provider_placeholder}</option>
                {texts.settings.club.treasury.wallet_providers.map((provider) => (
                  <option key={provider} value={provider}>{provider}</option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm text-foreground">
              <span className="font-medium">{texts.settings.club.treasury.alias_label}</span>
              <input
                type="text"
                name="alias"
                maxLength={60}
                value={aliasValue}
                onChange={(event) => {
                  const sanitized = event.target.value.replace(/[^A-Za-z0-9.]/g, "").slice(0, 60);
                  setAliasValue(sanitized);
                  setFormErrors((prev) => ({ ...prev, alias: undefined }));
                }}
                placeholder={texts.settings.club.treasury.alias_placeholder}
                className="min-h-11 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
              />
              <span className="text-meta text-muted-foreground">
                {texts.settings.club.treasury.alias_helper}
              </span>
              {formErrors.alias ? (
                <span className="text-sm text-destructive" aria-live="polite">{formErrors.alias}</span>
              ) : null}
            </label>
          </>
        ) : null}

        {/* Saldo inicial por moneda */}
        {selectedCurrencies.length > 0 ? (
          <div className="grid gap-2">
            <span className="text-sm font-medium text-foreground">
              {texts.settings.club.treasury.initial_balance_label}
            </span>
            <div className="grid gap-2">
              {selectedCurrencies.map((code) => (
                <div
                  key={`bal-${code}`}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/40 px-3 py-2"
                >
                  <span className="inline-flex min-w-14 justify-center rounded-xl bg-card px-3 py-2 text-sm font-semibold tracking-wider text-foreground">
                    {code}
                  </span>
                  <input
                    type="text"
                    name={`initial_balance[${code}]`}
                    inputMode="decimal"
                    value={initialBalances[code] ?? "0,00"}
                    onChange={(event) => handleBalanceChange(code, event.target.value)}
                    className="min-h-10 w-full rounded-xl border border-transparent bg-transparent px-3 py-2 text-right text-sm tabular-nums text-foreground focus:border-border focus:bg-card"
                  />
                </div>
              ))}
            </div>
            <span className="text-meta text-muted-foreground">
              {texts.settings.club.treasury.initial_balance_helper}
            </span>
          </div>
        ) : null}

        {/* Visibilidad */}
        <label className="flex min-h-11 items-center gap-3 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground">
          <input
            type="checkbox"
            checked={availableForSecretaria}
            onChange={(event) => setAvailableForSecretaria(event.target.checked)}
            className="size-4 rounded border-border"
          />
          <span className="font-medium">
            {texts.settings.club.treasury.visibility_secretaria_checkbox}
          </span>
        </label>

        {/* Footer actions (sticky bottom dentro del body scrolleable del modal) */}
        <div className="sticky bottom-0 -mx-5 -mb-5 mt-auto flex items-center justify-end gap-2 border-t border-border/60 bg-card px-5 py-4 sm:-mx-6 sm:-mb-6 sm:px-6">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="min-h-11 rounded-2xl border border-border bg-card px-5 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
            >
              {cancelLabel ?? texts.settings.club.treasury.cancel_cta}
            </button>
          ) : null}
          <PendingSubmitButton
            idleLabel={submitLabel}
            pendingLabel={pendingLabel}
            className="min-h-11 rounded-2xl bg-foreground px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
          />
        </div>
      </PendingFieldset>
    </form>
  );
}
