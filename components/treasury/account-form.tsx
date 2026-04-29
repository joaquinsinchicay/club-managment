"use client";

import { useMemo, useState } from "react";

import { ModalFooter } from "@/components/ui/modal-footer";
import {
  FormCheckboxCard,
  FormError,
  FormField,
  FormFieldLabel,
  FormHelpText,
  FormInput,
  FormSelect,
} from "@/components/ui/modal-form";
import { PendingFieldset } from "@/components/ui/pending-form";
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

// Paletas DS por tipo de cuenta — apunta a tokens semánticos (ds-blue / ds-amber / ds-green)
const ACCOUNT_TYPE_COLORS: Record<TreasuryAccountType, { base: string; selected: string }> = {
  bancaria: {
    base: "border-border bg-card text-foreground hover:bg-ds-blue-050/60",
    selected: "border-ds-blue-700 bg-ds-blue-050 text-ds-blue-700"
  },
  billetera_virtual: {
    base: "border-border bg-card text-foreground hover:bg-ds-amber-050/60",
    selected: "border-ds-amber-700 bg-ds-amber-050 text-ds-amber-700"
  },
  efectivo: {
    base: "border-border bg-card text-foreground hover:bg-ds-green-050/60",
    selected: "border-ds-green-700 bg-ds-green-050 text-ds-green-700"
  }
};

function formatInitialBalance(value: number): string {
  if (!Number.isFinite(value)) return "0,00";
  return value.toFixed(2).replace(".", ",");
}

function InitialBalanceField({
  code,
  value,
  onChange
}: {
  code: TreasuryCurrencyCode;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="flex min-h-11 items-center gap-2 rounded-card border border-border bg-card py-1.5 pl-1.5 pr-3">
      <span className="inline-flex min-w-12 justify-center rounded-card bg-secondary/40 px-3 py-2 text-xs font-semibold tracking-section text-muted-foreground">
        {code}
      </span>
      {/* eslint-disable-next-line no-restricted-syntax -- Compound input con badge de moneda: <FormInput> no soporta el layout inline (label pill + input transparente right-aligned). */}
      <input
        type="text"
        name={`initial_balance[${code}]`}
        inputMode="decimal"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={`${texts.settings.club.treasury.initial_balance_label} ${code}`}
        className="min-h-10 w-full rounded-card border border-transparent bg-transparent px-2 py-2 text-right text-sm tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
      />
    </label>
  );
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
  const [selectedCurrency, setSelectedCurrency] = useState<TreasuryCurrencyCode | "">(() => {
    const first = defaultAccount?.currencies.find((c): c is TreasuryCurrencyCode =>
      CURRENCY_OPTIONS.includes(c as TreasuryCurrencyCode)
    );
    return first ?? "";
  });
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
  const [bankEntity, setBankEntity] = useState<string>(
    defaultAccount?.accountType === "bancaria" ? (defaultAccount?.bankEntity ?? "") : ""
  );
  const [bankSubtype, setBankSubtype] = useState<TreasuryBankAccountSubtype | "">(
    defaultAccount?.accountType === "bancaria" ? (defaultAccount?.bankAccountSubtype ?? "") : ""
  );
  const [nameValue, setNameValue] = useState<string>(
    defaultAccount?.accountType === "bancaria" ? "" : (defaultAccount?.name ?? "")
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
    bankEntity?: string;
    bankSubtype?: string;
    cbu?: string;
    alias?: string;
  }>({});

  // En edición, tipo de cuenta, moneda y datos bancarios de identidad quedan
  // bloqueados para no romper la consistencia de movimientos ya registrados.
  const isEditMode = Boolean(defaultAccount);

  const showBankFields = accountType === "bancaria";
  const showWalletFields = accountType === "billetera_virtual";

  // Nombre auto-compuesto para cuentas Banco: "Entidad - Tipo de cuenta".
  const composedBankName = useMemo(() => {
    if (!showBankFields) return "";
    if (!bankEntity || !bankSubtype) return "";
    const subtypeLabel = texts.settings.club.treasury.bank_account_subtypes[bankSubtype];
    return `${bankEntity} - ${subtypeLabel}`;
  }, [showBankFields, bankEntity, bankSubtype]);

  const effectiveName = showBankFields ? composedBankName : nameValue;

  function handleBalanceChange(code: TreasuryCurrencyCode, value: string) {
    setInitialBalances((prev) => ({ ...prev, [code]: value }));
  }

  function validateAndSubmit(event: React.FormEvent<HTMLFormElement>) {
    const errors: typeof formErrors = {};
    if (!effectiveName.trim()) errors.name = texts.settings.club.treasury.feedback.account_name_required;
    if (!accountType) errors.accountType = texts.settings.club.treasury.feedback.account_type_required;
    if (!selectedCurrency) {
      errors.currencies = texts.settings.club.treasury.feedback.account_currencies_required;
    }
    if (showBankFields) {
      if (!bankEntity) errors.bankEntity = texts.settings.club.treasury.feedback.bank_entity_required;
      if (!bankSubtype) errors.bankSubtype = texts.settings.club.treasury.feedback.bank_account_subtype_required;
      if (cbuValue.trim() && !CBU_REGEX.test(cbuValue.trim())) {
        errors.cbu = texts.settings.club.treasury.feedback.invalid_cbu;
      }
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
      className="flex flex-col"
    >
      <PendingFieldset className="flex flex-col gap-4">
        {defaultAccount ? <input type="hidden" name="account_id" value={defaultAccount.id} /> : null}
        <input type="hidden" name="account_type" value={accountType} />
        <input type="hidden" name="name" value={effectiveName} />
        {availableForSecretaria ? <input type="hidden" name="available_for_secretaria" value="on" /> : null}

        {/* Tipo de cuenta */}
        <div className="grid gap-2">
          <FormFieldLabel required>
            {texts.settings.club.treasury.account_type_label}
          </FormFieldLabel>
          <div className="grid grid-cols-3 gap-2">
            {ACCOUNT_TYPE_OPTIONS.map((type) => {
              const selected = accountType === type;
              const palette = ACCOUNT_TYPE_COLORS[type];
              return (
                <button
                  key={type}
                  type="button"
                  aria-pressed={selected}
                  disabled={isEditMode}
                  onClick={() => {
                    if (isEditMode) return;
                    setAccountType(type);
                    setFormErrors((prev) => ({ ...prev, accountType: undefined }));
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1.5 rounded-card border p-3 text-sm font-semibold transition",
                    selected ? palette.selected : palette.base,
                    isEditMode && !selected && "opacity-60",
                    isEditMode && "cursor-not-allowed"
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
          {formErrors.accountType ? <FormError>{formErrors.accountType}</FormError> : null}
        </div>

        {/* Nombre */}
        <FormField>
          <FormFieldLabel required>
            {texts.settings.club.treasury.account_name_label}
          </FormFieldLabel>
          {showBankFields ? (
            <FormInput
              type="text"
              value={composedBankName}
              placeholder={texts.settings.club.treasury.account_name_banco_auto_placeholder}
              readOnly
              aria-readonly
              tabIndex={-1}
              className="cursor-not-allowed bg-secondary/40 text-muted-foreground"
            />
          ) : (
            <FormInput
              type="text"
              value={nameValue}
              onChange={(event) => {
                setNameValue(event.target.value);
                setFormErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder={texts.settings.club.treasury.account_name_placeholder}
            />
          )}
          <FormHelpText>
            {showBankFields
              ? texts.settings.club.treasury.account_name_banco_helper
              : texts.settings.club.treasury.account_name_helper}
          </FormHelpText>
          {formErrors.name ? <FormError>{formErrors.name}</FormError> : null}
        </FormField>

        {/* Moneda — selector excluyente */}
        <div className="grid gap-2">
          <FormFieldLabel required>
            {texts.settings.club.treasury.account_currencies_label}
          </FormFieldLabel>
          <div className="flex flex-wrap gap-2">
            {CURRENCY_OPTIONS.map((code) => {
              const selected = selectedCurrency === code;
              return (
                <button
                  key={code}
                  type="button"
                  aria-pressed={selected}
                  disabled={isEditMode}
                  onClick={() => {
                    if (isEditMode) return;
                    setSelectedCurrency(code);
                    setFormErrors((prev) => ({ ...prev, currencies: undefined }));
                  }}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-2 rounded-card border px-5 text-sm font-semibold transition",
                    selected
                      ? "border-ds-blue-700 bg-ds-blue-050 text-ds-blue-700"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary/60",
                    isEditMode && !selected && "opacity-60",
                    isEditMode && "cursor-not-allowed"
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
          {selectedCurrency ? (
            <input type="hidden" name="currencies" value={selectedCurrency} />
          ) : null}
          <FormHelpText>
            {texts.settings.club.treasury.account_currencies_helper}
          </FormHelpText>
          {formErrors.currencies ? <FormError>{formErrors.currencies}</FormError> : null}
        </div>

        {/* Campos Banco */}
        {showBankFields ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField>
                <FormFieldLabel required>
                  {texts.settings.club.treasury.bank_entity_label}
                </FormFieldLabel>
                <FormSelect
                  name={isEditMode ? undefined : "bank_entity"}
                  value={bankEntity}
                  disabled={isEditMode}
                  onChange={(event) => {
                    setBankEntity(event.target.value);
                    setFormErrors((prev) => ({ ...prev, bankEntity: undefined, name: undefined }));
                  }}
                >
                  <option value="">{texts.settings.club.treasury.bank_entity_placeholder}</option>
                  {texts.settings.club.treasury.bank_entities.map((entity) => (
                    <option key={entity} value={entity}>{entity}</option>
                  ))}
                </FormSelect>
                {isEditMode ? (
                  <input type="hidden" name="bank_entity" value={bankEntity} />
                ) : null}
                {formErrors.bankEntity ? <FormError>{formErrors.bankEntity}</FormError> : null}
              </FormField>

              <FormField>
                <FormFieldLabel required>
                  {texts.settings.club.treasury.bank_account_subtype_label}
                </FormFieldLabel>
                <FormSelect
                  name={isEditMode ? undefined : "bank_account_subtype"}
                  value={bankSubtype}
                  disabled={isEditMode}
                  onChange={(event) => {
                    setBankSubtype(event.target.value as TreasuryBankAccountSubtype | "");
                    setFormErrors((prev) => ({ ...prev, bankSubtype: undefined, name: undefined }));
                  }}
                >
                  <option value="">{texts.settings.club.treasury.bank_account_subtype_placeholder}</option>
                  {SUBTYPE_OPTIONS.map((subtype) => (
                    <option key={subtype} value={subtype}>
                      {texts.settings.club.treasury.bank_account_subtypes[subtype]}
                    </option>
                  ))}
                </FormSelect>
                {isEditMode ? (
                  <input type="hidden" name="bank_account_subtype" value={bankSubtype} />
                ) : null}
                {formErrors.bankSubtype ? <FormError>{formErrors.bankSubtype}</FormError> : null}
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField>
                <FormFieldLabel>{texts.settings.club.treasury.account_number_label}</FormFieldLabel>
                <FormInput
                  type="text"
                  name="account_number"
                  defaultValue={defaultAccount?.accountNumber ?? ""}
                  placeholder={texts.settings.club.treasury.account_number_placeholder}
                />
              </FormField>

              <FormField>
                <FormFieldLabel>{texts.settings.club.treasury.cbu_cvu_label}</FormFieldLabel>
                <FormInput
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
                />
                {formErrors.cbu ? <FormError>{formErrors.cbu}</FormError> : null}
              </FormField>
            </div>
          </>
        ) : null}

        {/* Campos Billetera */}
        {showWalletFields ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField>
              <FormFieldLabel>{texts.settings.club.treasury.wallet_provider_label}</FormFieldLabel>
              <FormSelect
                name="wallet_provider"
                defaultValue={
                  defaultAccount?.accountType === "billetera_virtual" ? (defaultAccount?.bankEntity ?? "") : ""
                }
              >
                <option value="">{texts.settings.club.treasury.wallet_provider_placeholder}</option>
                {texts.settings.club.treasury.wallet_providers.map((provider) => (
                  <option key={provider} value={provider}>{provider}</option>
                ))}
              </FormSelect>
            </FormField>

            <FormField>
              <FormFieldLabel>{texts.settings.club.treasury.alias_label}</FormFieldLabel>
              <FormInput
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
              />
              {formErrors.alias ? <FormError>{formErrors.alias}</FormError> : null}
            </FormField>
          </div>
        ) : null}

        {/* Saldo inicial de la moneda operativa */}
        {selectedCurrency ? (
          <div className="grid gap-2">
            <FormFieldLabel>{texts.settings.club.treasury.initial_balance_label}</FormFieldLabel>
            <div className="grid gap-3 sm:grid-cols-2">
              <InitialBalanceField
                code={selectedCurrency}
                value={initialBalances[selectedCurrency] ?? "0,00"}
                onChange={(value) => handleBalanceChange(selectedCurrency, value)}
              />
            </div>
            <FormHelpText>{texts.settings.club.treasury.initial_balance_helper}</FormHelpText>
          </div>
        ) : null}

        {/* Visibilidad — checkbox único para Secretaría. Tesorería siempre habilitada. */}
        <FormCheckboxCard
          name="__available_for_secretaria_display"
          value="on"
          label={texts.settings.club.treasury.visibility_secretaria_checkbox}
          checked={availableForSecretaria}
          onChange={setAvailableForSecretaria}
        />

        <ModalFooter
          onCancel={onCancel}
          cancelLabel={cancelLabel ?? texts.settings.club.treasury.cancel_cta}
          submitLabel={submitLabel}
          pendingLabel={pendingLabel}
        />
      </PendingFieldset>
    </form>
  );
}
