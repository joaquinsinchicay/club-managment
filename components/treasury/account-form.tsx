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
const VISIBILITY_OPTIONS = ["secretaria", "tesoreria"] as const;
const ACCOUNT_TYPE_OPTIONS: TreasuryAccountType[] = ["bancaria", "billetera_virtual", "efectivo"];
const SUBTYPE_OPTIONS: TreasuryBankAccountSubtype[] = ["cuenta_corriente", "caja_ahorro"];
const CBU_REGEX = /^\d{22}$/;

function formatInitialBalance(value: number): string {
  if (!Number.isFinite(value)) return "0,00";
  return value.toFixed(2).replace(".", ",");
}

function AccountTypeIcon({ type }: { type: TreasuryAccountType }) {
  if (type === "bancaria") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true" className="size-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 10L12 4l9 6M5 10v9h14v-9M9 14v3M12 14v3M15 14v3" />
      </svg>
    );
  }
  if (type === "billetera_virtual") {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true" className="size-6">
        <rect x="3" y="6" width="18" height="13" rx="2" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M16 12h3M3 10h18" />
      </svg>
    );
  }
  // efectivo
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} aria-hidden="true" className="size-6">
      <rect x="2" y="7" width="20" height="10" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
      <path strokeLinecap="round" d="M6 12h.01M18 12h.01" />
    </svg>
  );
}

export type TreasuryAccountFormProps = {
  action: (formData: FormData) => Promise<void> | Promise<unknown>;
  submitLabel: string;
  pendingLabel: string;
  defaultAccount?: TreasuryAccount;
};

export function TreasuryAccountForm({
  action,
  submitLabel,
  pendingLabel,
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
  const [selectedVisibility, setSelectedVisibility] = useState<string[]>(
    VISIBILITY_OPTIONS.filter((v) =>
      v === "secretaria"
        ? (defaultAccount?.visibleForSecretaria ?? true)
        : (defaultAccount?.visibleForTesoreria ?? true)
    )
  );
  const [cbuValue, setCbuValue] = useState<string>(defaultAccount?.cbuCvu ?? "");
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    accountType?: string;
    currencies?: string;
    cbu?: string;
  }>({});

  function toggleCurrency(code: TreasuryCurrencyCode) {
    setSelectedCurrencies((current) => {
      if (current.includes(code)) {
        return current.filter((c) => c !== code);
      }
      return [...current, code];
    });
    setFormErrors((prev) => ({ ...prev, currencies: undefined }));
  }

  function toggleVisibility(visibility: string) {
    setSelectedVisibility((current) =>
      current.includes(visibility) ? current.filter((v) => v !== visibility) : [...current, visibility]
    );
  }

  function handleBalanceChange(code: TreasuryCurrencyCode, value: string) {
    setInitialBalances((prev) => ({ ...prev, [code]: value }));
  }

  const showBankFields = accountType === "bancaria";
  const showCbu = accountType === "bancaria" || accountType === "billetera_virtual";

  function validateAndSubmit(event: React.FormEvent<HTMLFormElement>) {
    const errors: typeof formErrors = {};
    const form = event.currentTarget;
    const nameValue = String(new FormData(form).get("name") ?? "").trim();
    if (!nameValue) errors.name = texts.settings.club.treasury.feedback.account_name_required;
    if (!accountType) errors.accountType = texts.settings.club.treasury.feedback.account_type_required;
    if (selectedCurrencies.length === 0) {
      errors.currencies = texts.settings.club.treasury.feedback.account_currencies_required;
    }
    if (showCbu && cbuValue.trim() && !CBU_REGEX.test(cbuValue.trim())) {
      errors.cbu = texts.settings.club.treasury.feedback.invalid_cbu;
    }
    if (Object.keys(errors).length > 0) {
      event.preventDefault();
      setFormErrors(errors);
    }
  }

  return (
    <form action={action as (formData: FormData) => Promise<void>} onSubmit={validateAndSubmit} className="grid gap-6">
      <PendingFieldset className="grid gap-6">
        {defaultAccount ? <input type="hidden" name="account_id" value={defaultAccount.id} /> : null}
        <input type="hidden" name="account_type" value={accountType} />

        {/* Tipo de cuenta */}
        <div className="grid gap-2">
          <span className="text-sm font-medium text-foreground">
            {texts.settings.club.treasury.account_type_label}{" "}
            <span aria-hidden="true" className="text-destructive">*</span>
          </span>
          <div className="grid grid-cols-3 gap-2">
            {ACCOUNT_TYPE_OPTIONS.map((type) => {
              const selected = accountType === type;
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
                    "flex flex-col items-center justify-center gap-2 rounded-2xl border p-4 text-sm font-medium transition",
                    selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary/40 text-foreground hover:bg-secondary"
                  )}
                >
                  <AccountTypeIcon type={type} />
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
                    "inline-flex min-h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold transition",
                    selected
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border bg-secondary/40 text-foreground hover:bg-secondary"
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
          {/* Hidden inputs para el action */}
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

        {/* Campos bancarios */}
        {showBankFields ? (
          <div className="grid gap-4">
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
          </div>
        ) : null}

        {showCbu ? (
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
                  className="flex items-center gap-2 rounded-2xl border border-border bg-secondary/40 px-3 py-2"
                >
                  <span className="inline-flex min-w-12 justify-center rounded-md bg-slate-100 px-2 py-0.5 text-eyebrow font-semibold tracking-wider text-slate-700">
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
        <div className="grid gap-2">
          <span className="text-sm font-medium text-foreground">
            {texts.settings.club.treasury.account_visibility_label}
          </span>
          <div className="grid gap-3 sm:grid-cols-2">
            {VISIBILITY_OPTIONS.map((visibility) => {
              const selected = selectedVisibility.includes(visibility);
              return (
                <label
                  key={`visibility-${visibility}`}
                  className="flex min-h-11 items-center gap-3 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
                >
                  <input
                    type="checkbox"
                    name="visibility"
                    value={visibility}
                    checked={selected}
                    onChange={() => toggleVisibility(visibility)}
                    className="size-4 rounded border-border"
                  />
                  <span className="font-medium">
                    {texts.settings.club.treasury.account_visibility_options[visibility]}
                  </span>
                </label>
              );
            })}
          </div>
        </div>

        {/* Footer actions */}
        <div className="-mx-1 flex items-center justify-end gap-2 pt-2">
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
