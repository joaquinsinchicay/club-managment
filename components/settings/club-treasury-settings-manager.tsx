"use client";

import { useState } from "react";

import { PendingFieldset, PendingSubmitButton } from "@/components/ui/pending-form";
import type {
  ClubActivity,
  ReceiptFormat,
  TreasuryAccount,
  TreasuryCurrencyCode,
  TreasuryMovementType,
  TreasuryCategory,
  TreasurySettings
} from "@/lib/domain/access";
import { texts } from "@/lib/texts";

type ClubTreasurySettingsManagerProps = {
  treasurySettings: TreasurySettings;
  setTreasuryCurrenciesAction: (formData: FormData) => Promise<void>;
  setMovementTypesAction: (formData: FormData) => Promise<void>;
  createTreasuryAccountAction: (formData: FormData) => Promise<void>;
  updateTreasuryAccountAction: (formData: FormData) => Promise<void>;
  createTreasuryCategoryAction: (formData: FormData) => Promise<void>;
  updateTreasuryCategoryAction: (formData: FormData) => Promise<void>;
  createClubActivityAction: (formData: FormData) => Promise<void>;
  updateClubActivityAction: (formData: FormData) => Promise<void>;
  createReceiptFormatAction: (formData: FormData) => Promise<void>;
  updateReceiptFormatAction: (formData: FormData) => Promise<void>;
};

function getVisibilityLabel(visibleForSecretaria: boolean) {
  return visibleForSecretaria
    ? texts.settings.club.treasury.visibility_visible
    : texts.settings.club.treasury.visibility_hidden;
}

function getAccountTypeLabel(accountType: TreasuryAccount["accountType"]) {
  return texts.settings.club.treasury.account_types[accountType];
}

function getAccountScopeLabel(accountScope: TreasuryAccount["accountScope"]) {
  return texts.settings.club.treasury.account_scopes[accountScope];
}

function getStatusLabel(status: TreasuryAccount["status"]) {
  return texts.settings.club.treasury.statuses[status];
}

function getReceiptValidationTypeLabel(type: ReceiptFormat["validationType"]) {
  return texts.settings.club.treasury.receipt_validation_types[type];
}

function getCurrencyLabel(currencyCode: TreasuryCurrencyCode) {
  return texts.settings.club.treasury.currency_options[currencyCode];
}

function getMovementTypeLabel(movementType: TreasuryMovementType) {
  return texts.dashboard.treasury.movement_types[movementType];
}

const TREASURY_CURRENCY_OPTIONS: TreasuryCurrencyCode[] = ["ARS", "USD", "EUR"];
const TREASURY_MOVEMENT_TYPE_OPTIONS: TreasuryMovementType[] = ["ingreso", "egreso"];

type ClubActivityFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  pendingLabel: string;
  defaultActivity?: ClubActivity;
};

function ClubActivityForm({
  action,
  submitLabel,
  pendingLabel,
  defaultActivity
}: ClubActivityFormProps) {
  return (
    <form action={action} className="grid gap-4 rounded-[24px] border border-border bg-secondary/40 p-4">
      <PendingFieldset className="grid gap-4">
        {defaultActivity ? <input type="hidden" name="activity_id" value={defaultActivity.id} /> : null}

        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.settings.club.treasury.activity_name_label}</span>
          <input
            type="text"
            name="name"
            defaultValue={defaultActivity?.name ?? ""}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          />
        </label>

        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.settings.club.treasury.status_label}</span>
          <select
            name="status"
            defaultValue={defaultActivity?.status ?? "active"}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          >
            <option value="active">{texts.settings.club.treasury.statuses.active}</option>
            <option value="inactive">{texts.settings.club.treasury.statuses.inactive}</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.settings.club.treasury.emoji_label}</span>
          <input
            type="text"
            name="emoji"
            defaultValue={defaultActivity?.emoji ?? ""}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          />
        </label>

        <PendingSubmitButton
          idleLabel={submitLabel}
          pendingLabel={pendingLabel}
          className="min-h-11 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95 sm:justify-self-end"
        />
      </PendingFieldset>
    </form>
  );
}

type TreasuryAccountFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  pendingLabel: string;
  defaultAccount?: TreasuryAccount;
  availableCurrencies: TreasuryCurrencyCode[];
};

function TreasuryAccountForm({
  action,
  submitLabel,
  pendingLabel,
  defaultAccount,
  availableCurrencies
}: TreasuryAccountFormProps) {
  return (
    <form action={action} className="grid gap-4 rounded-[24px] border border-border bg-secondary/40 p-4">
      <PendingFieldset className="grid gap-4">
        {defaultAccount ? <input type="hidden" name="account_id" value={defaultAccount.id} /> : null}

        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.settings.club.treasury.account_name_label}</span>
          <input
            type="text"
            name="name"
            defaultValue={defaultAccount?.name ?? ""}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          />
        </label>

        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.settings.club.treasury.account_type_label}</span>
          <select
            name="account_type"
            defaultValue={defaultAccount?.accountType ?? ""}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          >
            <option value="" disabled>
              {texts.settings.club.treasury.account_type_placeholder}
            </option>
            <option value="efectivo">{texts.settings.club.treasury.account_types.efectivo}</option>
            <option value="bancaria">{texts.settings.club.treasury.account_types.bancaria}</option>
            <option value="billetera_virtual">
              {texts.settings.club.treasury.account_types.billetera_virtual}
            </option>
          </select>
        </label>

        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.settings.club.treasury.account_scope_label}</span>
          <select
            name="account_scope"
            defaultValue={defaultAccount?.accountScope ?? "secretaria"}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          >
            <option value="secretaria">{texts.settings.club.treasury.account_scopes.secretaria}</option>
            <option value="tesoreria">{texts.settings.club.treasury.account_scopes.tesoreria}</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.settings.club.treasury.visibility_label}</span>
          <select
            name="visible_for_secretaria"
            defaultValue={String(defaultAccount?.visibleForSecretaria ?? true)}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          >
            <option value="true">{texts.settings.club.treasury.visibility_visible}</option>
            <option value="false">{texts.settings.club.treasury.visibility_hidden}</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.settings.club.treasury.status_label}</span>
          <select
            name="status"
            defaultValue={defaultAccount?.status ?? "active"}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          >
            <option value="active">{texts.settings.club.treasury.statuses.active}</option>
            <option value="inactive">{texts.settings.club.treasury.statuses.inactive}</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.settings.club.treasury.emoji_label}</span>
          <input
            type="text"
            name="emoji"
            defaultValue={defaultAccount?.emoji ?? ""}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          />
        </label>

        <fieldset className="grid gap-3">
          <legend className="text-sm font-medium text-foreground">
            {texts.settings.club.treasury.account_currencies_label}
          </legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {availableCurrencies.map((currencyCode) => (
              <label
                key={`account-currency-${currencyCode}`}
                className="flex min-h-11 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
              >
                <input
                  type="checkbox"
                  name="currencies"
                  value={currencyCode}
                  defaultChecked={defaultAccount?.currencies.includes(currencyCode) ?? false}
                  className="size-4 rounded border-border"
                />
                <span className="font-medium">{getCurrencyLabel(currencyCode)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <PendingSubmitButton
          idleLabel={submitLabel}
          pendingLabel={pendingLabel}
          className="min-h-11 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95 sm:justify-self-end"
        />
      </PendingFieldset>
    </form>
  );
}

type TreasuryCategoryFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  pendingLabel: string;
  defaultCategory?: TreasuryCategory;
};

function TreasuryCategoryForm({
  action,
  submitLabel,
  pendingLabel,
  defaultCategory
}: TreasuryCategoryFormProps) {
  return (
    <form action={action} className="grid gap-4 rounded-[24px] border border-border bg-secondary/40 p-4">
      <PendingFieldset className="grid gap-4">
        {defaultCategory ? <input type="hidden" name="category_id" value={defaultCategory.id} /> : null}

        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.settings.club.treasury.category_name_label}</span>
          <input
            type="text"
            name="name"
            defaultValue={defaultCategory?.name ?? ""}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          />
        </label>

        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.settings.club.treasury.visibility_label}</span>
          <select
            name="visible_for_secretaria"
            defaultValue={String(defaultCategory?.visibleForSecretaria ?? true)}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          >
            <option value="true">{texts.settings.club.treasury.visibility_visible}</option>
            <option value="false">{texts.settings.club.treasury.visibility_hidden}</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.settings.club.treasury.status_label}</span>
          <select
            name="status"
            defaultValue={defaultCategory?.status ?? "active"}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          >
            <option value="active">{texts.settings.club.treasury.statuses.active}</option>
            <option value="inactive">{texts.settings.club.treasury.statuses.inactive}</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.settings.club.treasury.emoji_label}</span>
          <input
            type="text"
            name="emoji"
            defaultValue={defaultCategory?.emoji ?? ""}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          />
        </label>

        <PendingSubmitButton
          idleLabel={submitLabel}
          pendingLabel={pendingLabel}
          className="min-h-11 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95 sm:justify-self-end"
        />
      </PendingFieldset>
    </form>
  );
}

type ReceiptFormatFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  pendingLabel: string;
  defaultReceiptFormat?: ReceiptFormat;
};

function ReceiptFormatForm({
  action,
  submitLabel,
  pendingLabel,
  defaultReceiptFormat
}: ReceiptFormatFormProps) {
  const validationType = defaultReceiptFormat?.validationType ?? "numeric";

  return (
    <form action={action} className="grid gap-4 rounded-[24px] border border-border bg-secondary/40 p-4">
      <PendingFieldset className="grid gap-4">
        {defaultReceiptFormat ? (
          <input type="hidden" name="receipt_format_id" value={defaultReceiptFormat.id} />
        ) : null}

        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.settings.club.treasury.receipt_name_label}</span>
          <input
            type="text"
            name="name"
            defaultValue={defaultReceiptFormat?.name ?? ""}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          />
        </label>

        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.settings.club.treasury.receipt_validation_type_label}</span>
          <select
            name="validation_type"
            defaultValue={validationType}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          >
            <option value="numeric">
              {texts.settings.club.treasury.receipt_validation_types.numeric}
            </option>
            <option value="pattern">
              {texts.settings.club.treasury.receipt_validation_types.pattern}
            </option>
          </select>
        </label>

        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.settings.club.treasury.receipt_min_label}</span>
          <input
            type="number"
            name="min_numeric_value"
            defaultValue={defaultReceiptFormat?.minNumericValue ?? ""}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          />
        </label>

        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.settings.club.treasury.receipt_pattern_label}</span>
          <input
            type="text"
            name="pattern"
            defaultValue={defaultReceiptFormat?.pattern ?? ""}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          />
        </label>

        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.settings.club.treasury.receipt_example_label}</span>
          <input
            type="text"
            name="example"
            defaultValue={defaultReceiptFormat?.example ?? ""}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          />
        </label>

        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.settings.club.treasury.status_label}</span>
          <select
            name="status"
            defaultValue={defaultReceiptFormat?.status ?? "active"}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          >
            <option value="active">{texts.settings.club.treasury.statuses.active}</option>
            <option value="inactive">{texts.settings.club.treasury.statuses.inactive}</option>
          </select>
        </label>

        <PendingSubmitButton
          idleLabel={submitLabel}
          pendingLabel={pendingLabel}
          className="min-h-11 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95 sm:justify-self-end"
        />
      </PendingFieldset>
    </form>
  );
}

export function ClubTreasurySettingsManager({
  treasurySettings,
  setTreasuryCurrenciesAction,
  setMovementTypesAction,
  createTreasuryAccountAction,
  updateTreasuryAccountAction,
  createTreasuryCategoryAction,
  updateTreasuryCategoryAction,
  createClubActivityAction,
  updateClubActivityAction,
  createReceiptFormatAction,
  updateReceiptFormatAction
}: ClubTreasurySettingsManagerProps) {
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [isCreatingActivity, setIsCreatingActivity] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [isCreatingReceiptFormat, setIsCreatingReceiptFormat] = useState(false);
  const [editingReceiptFormatId, setEditingReceiptFormatId] = useState<string | null>(null);
  const selectedCurrencies = treasurySettings.currencies.map((currency) => currency.currencyCode);
  const primaryCurrencyCode =
    treasurySettings.currencies.find((currency) => currency.isPrimary)?.currencyCode ??
    treasurySettings.currencies[0]?.currencyCode ??
    "ARS";
  const enabledMovementTypes = treasurySettings.movementTypes
    .filter((movementType) => movementType.isEnabled)
    .map((movementType) => movementType.movementType);
  const availableAccountCurrencies: TreasuryCurrencyCode[] = treasurySettings.currencies.length > 0
    ? treasurySettings.currencies.map((currency) => currency.currencyCode)
    : ["ARS"];

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-foreground">
          {texts.settings.club.treasury.section_title}
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          {texts.settings.club.treasury.section_description}
        </p>
      </div>

      <section className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">
            {texts.settings.club.treasury.currencies_title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {texts.settings.club.treasury.currencies_description}
          </p>
        </div>

        <form action={setTreasuryCurrenciesAction} className="grid gap-4 rounded-[24px] border border-border bg-secondary/40 p-4">
          <PendingFieldset className="grid gap-4">
            <fieldset className="grid gap-3">
              <legend className="text-sm font-medium text-foreground">
                {texts.settings.club.treasury.currency_selection_label}
              </legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {TREASURY_CURRENCY_OPTIONS.map((currencyCode) => (
                  <label
                    key={currencyCode}
                    className="flex min-h-11 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                  >
                    <input
                      type="checkbox"
                      name="currencies"
                      value={currencyCode}
                      defaultChecked={selectedCurrencies.includes(currencyCode)}
                      className="size-4 rounded border-border"
                    />
                    <span className="font-medium">{getCurrencyLabel(currencyCode)}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <fieldset className="grid gap-3">
              <legend className="text-sm font-medium text-foreground">
                {texts.settings.club.treasury.primary_currency_label}
              </legend>
              <div className="grid gap-3 sm:grid-cols-3">
                {TREASURY_CURRENCY_OPTIONS.map((currencyCode) => (
                  <label
                    key={`primary-${currencyCode}`}
                    className="flex min-h-11 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                  >
                    <input
                      type="radio"
                      name="primary_currency_code"
                      value={currencyCode}
                      defaultChecked={primaryCurrencyCode === currencyCode}
                      className="size-4 border-border"
                    />
                    <span className="font-medium">{getCurrencyLabel(currencyCode)}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <PendingSubmitButton
              idleLabel={texts.settings.club.treasury.save_currencies_cta}
              pendingLabel={texts.settings.club.treasury.save_currencies_loading}
              className="min-h-11 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95 sm:justify-self-end"
            />
          </PendingFieldset>
        </form>
      </section>

      <section className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-semibold text-foreground">
            {texts.settings.club.treasury.movement_types_title}
          </h3>
          <p className="text-sm text-muted-foreground">
            {texts.settings.club.treasury.movement_types_description}
          </p>
        </div>

        <form action={setMovementTypesAction} className="grid gap-4 rounded-[24px] border border-border bg-secondary/40 p-4">
          <PendingFieldset className="grid gap-4">
            <fieldset className="grid gap-3">
              <legend className="text-sm font-medium text-foreground">
                {texts.settings.club.treasury.movement_type_selection_label}
              </legend>
              <div className="grid gap-3 sm:grid-cols-2">
                {TREASURY_MOVEMENT_TYPE_OPTIONS.map((movementType) => (
                  <label
                    key={movementType}
                    className="flex min-h-11 items-center gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                  >
                    <input
                      type="checkbox"
                      name="movement_types"
                      value={movementType}
                      defaultChecked={enabledMovementTypes.includes(movementType)}
                      className="size-4 rounded border-border"
                    />
                    <span className="font-medium">{getMovementTypeLabel(movementType)}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <PendingSubmitButton
              idleLabel={texts.settings.club.treasury.save_movement_types_cta}
              pendingLabel={texts.settings.club.treasury.save_movement_types_loading}
              className="min-h-11 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95 sm:justify-self-end"
            />
          </PendingFieldset>
        </form>
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {texts.settings.club.treasury.accounts_title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {texts.settings.club.treasury.accounts_description}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsCreatingAccount((current) => !current);
              setEditingAccountId(null);
            }}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
          >
            {texts.settings.club.treasury.create_account_cta}
          </button>
        </div>

        {isCreatingAccount ? (
          <TreasuryAccountForm
            action={createTreasuryAccountAction}
            submitLabel={texts.settings.club.treasury.save_account_cta}
            pendingLabel={texts.settings.club.treasury.save_account_loading}
            availableCurrencies={availableAccountCurrencies}
          />
        ) : null}

        {treasurySettings.accounts.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-border bg-secondary/40 p-5 text-sm text-muted-foreground">
            {texts.settings.club.treasury.empty_accounts}
          </div>
        ) : (
          <div className="grid gap-4">
            {treasurySettings.accounts.map((account) => (
              <article key={account.id} className="rounded-[24px] border border-border bg-secondary/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg" aria-hidden="true">
                        {account.emoji ?? texts.settings.club.treasury.default_account_emoji}
                      </span>
                      <p className="truncate text-sm font-semibold text-foreground">{account.name}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-2 text-foreground">
                        <span className="font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {texts.settings.club.treasury.account_type_label}
                        </span>
                        <span className="font-medium">{getAccountTypeLabel(account.accountType)}</span>
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-2 text-foreground">
                        <span className="font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {texts.settings.club.treasury.account_scope_label}
                        </span>
                        <span className="font-medium">{getAccountScopeLabel(account.accountScope)}</span>
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-2 text-foreground">
                        <span className="font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {texts.settings.club.treasury.status_label}
                        </span>
                        <span className="font-medium">{getStatusLabel(account.status)}</span>
                      </span>
                      {account.accountScope === "secretaria" ? (
                        <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-2 text-foreground">
                          <span className="font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                            {texts.settings.club.treasury.visibility_label}
                          </span>
                          <span className="font-medium">{getVisibilityLabel(account.visibleForSecretaria)}</span>
                        </span>
                      ) : null}
                      <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-2 text-foreground">
                        <span className="font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {texts.settings.club.treasury.account_currencies_label}
                        </span>
                        <span className="font-medium">{account.currencies.join(" · ")}</span>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setEditingAccountId((current) => (current === account.id ? null : account.id))
                    }
                    className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                  >
                    {texts.settings.club.treasury.edit_account_cta}
                  </button>
                </div>

                {editingAccountId === account.id ? (
                  <div className="mt-4">
                    <TreasuryAccountForm
                      action={updateTreasuryAccountAction}
                      submitLabel={texts.settings.club.treasury.update_account_cta}
                      pendingLabel={texts.settings.club.treasury.update_account_loading}
                      defaultAccount={account}
                      availableCurrencies={availableAccountCurrencies}
                    />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {texts.settings.club.treasury.receipt_formats_title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {texts.settings.club.treasury.receipt_formats_description}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsCreatingReceiptFormat((current) => !current);
              setEditingReceiptFormatId(null);
            }}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
          >
            {texts.settings.club.treasury.create_receipt_format_cta}
          </button>
        </div>

        {isCreatingReceiptFormat ? (
          <ReceiptFormatForm
            action={createReceiptFormatAction}
            submitLabel={texts.settings.club.treasury.save_receipt_format_cta}
            pendingLabel={texts.settings.club.treasury.save_receipt_format_loading}
          />
        ) : null}

        {treasurySettings.receiptFormats.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-border bg-secondary/40 p-5 text-sm text-muted-foreground">
            {texts.settings.club.treasury.empty_receipt_formats}
          </div>
        ) : (
          <div className="grid gap-4">
            {treasurySettings.receiptFormats.map((receiptFormat) => (
              <article key={receiptFormat.id} className="rounded-[24px] border border-border bg-secondary/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-semibold text-foreground">{receiptFormat.name}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-2 text-foreground">
                        <span className="font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {texts.settings.club.treasury.status_label}
                        </span>
                        <span className="font-medium">{getStatusLabel(receiptFormat.status)}</span>
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-2 text-foreground">
                        <span className="font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {texts.settings.club.treasury.receipt_validation_type_label}
                        </span>
                        <span className="font-medium">
                          {getReceiptValidationTypeLabel(receiptFormat.validationType)}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-2 text-foreground">
                        <span className="font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {texts.settings.club.treasury.receipt_example_label}
                        </span>
                        <span className="font-medium">{receiptFormat.example ?? "-"}</span>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setEditingReceiptFormatId((current) =>
                        current === receiptFormat.id ? null : receiptFormat.id
                      )
                    }
                    className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                  >
                    {texts.settings.club.treasury.edit_receipt_format_cta}
                  </button>
                </div>

                {editingReceiptFormatId === receiptFormat.id ? (
                  <div className="mt-4">
                    <ReceiptFormatForm
                      action={updateReceiptFormatAction}
                      submitLabel={texts.settings.club.treasury.update_receipt_format_cta}
                      pendingLabel={texts.settings.club.treasury.update_receipt_format_loading}
                      defaultReceiptFormat={receiptFormat}
                    />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {texts.settings.club.treasury.categories_title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {texts.settings.club.treasury.categories_description}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsCreatingCategory((current) => !current);
              setEditingCategoryId(null);
            }}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
          >
            {texts.settings.club.treasury.create_category_cta}
          </button>
        </div>

        {isCreatingCategory ? (
          <TreasuryCategoryForm
            action={createTreasuryCategoryAction}
            submitLabel={texts.settings.club.treasury.save_category_cta}
            pendingLabel={texts.settings.club.treasury.save_category_loading}
          />
        ) : null}

        {treasurySettings.categories.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-border bg-secondary/40 p-5 text-sm text-muted-foreground">
            {texts.settings.club.treasury.empty_categories}
          </div>
        ) : (
          <div className="grid gap-4">
            {treasurySettings.categories.map((category) => (
              <article key={category.id} className="rounded-[24px] border border-border bg-secondary/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg" aria-hidden="true">
                        {category.emoji ?? texts.settings.club.treasury.default_category_emoji}
                      </span>
                      <p className="truncate text-sm font-semibold text-foreground">{category.name}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-2 text-foreground">
                        <span className="font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {texts.settings.club.treasury.status_label}
                        </span>
                        <span className="font-medium">{getStatusLabel(category.status)}</span>
                      </span>
                      <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-2 text-foreground">
                        <span className="font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {texts.settings.club.treasury.visibility_label}
                        </span>
                        <span className="font-medium">{getVisibilityLabel(category.visibleForSecretaria)}</span>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setEditingCategoryId((current) => (current === category.id ? null : category.id))
                    }
                    className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                  >
                    {texts.settings.club.treasury.edit_category_cta}
                  </button>
                </div>

                {editingCategoryId === category.id ? (
                  <div className="mt-4">
                    <TreasuryCategoryForm
                      action={updateTreasuryCategoryAction}
                      submitLabel={texts.settings.club.treasury.update_category_cta}
                      pendingLabel={texts.settings.club.treasury.update_category_loading}
                      defaultCategory={category}
                    />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-foreground">
              {texts.settings.club.treasury.activities_title}
            </h3>
            <p className="text-sm text-muted-foreground">
              {texts.settings.club.treasury.activities_description}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsCreatingActivity((current) => !current);
              setEditingActivityId(null);
            }}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
          >
            {texts.settings.club.treasury.create_activity_cta}
          </button>
        </div>

        {isCreatingActivity ? (
          <ClubActivityForm
            action={createClubActivityAction}
            submitLabel={texts.settings.club.treasury.save_activity_cta}
            pendingLabel={texts.settings.club.treasury.save_activity_loading}
          />
        ) : null}

        {treasurySettings.activities.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-border bg-secondary/40 p-5 text-sm text-muted-foreground">
            {texts.settings.club.treasury.empty_activities}
          </div>
        ) : (
          <div className="grid gap-4">
            {treasurySettings.activities.map((activity) => (
              <article key={activity.id} className="rounded-[24px] border border-border bg-secondary/50 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-lg" aria-hidden="true">
                        {activity.emoji ?? texts.settings.club.treasury.default_activity_emoji}
                      </span>
                      <p className="truncate text-sm font-semibold text-foreground">{activity.name}</p>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-2 text-foreground">
                        <span className="font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {texts.settings.club.treasury.status_label}
                        </span>
                        <span className="font-medium">{getStatusLabel(activity.status)}</span>
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setEditingActivityId((current) => (current === activity.id ? null : activity.id))
                    }
                    className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                  >
                    {texts.settings.club.treasury.edit_activity_cta}
                  </button>
                </div>

                {editingActivityId === activity.id ? (
                  <div className="mt-4">
                    <ClubActivityForm
                      action={updateClubActivityAction}
                      submitLabel={texts.settings.club.treasury.update_activity_cta}
                      pendingLabel={texts.settings.club.treasury.update_activity_loading}
                      defaultActivity={activity}
                    />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
