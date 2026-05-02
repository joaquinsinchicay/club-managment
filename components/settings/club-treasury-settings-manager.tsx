"use client";

import { useState } from "react";

import { Button, buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MetaPill } from "@/components/ui/meta-pill";
import {
  FormCheckboxCard,
  FormField,
  FormFieldLabel,
  FormInput,
  FormReadonly,
  FormSelect,
} from "@/components/ui/modal-form";
import { PendingFieldset, PendingSubmitButton } from "@/components/ui/pending-form";
import { Badge } from "@/components/ui/badge";
import type {
  ClubActivity,
  TreasuryAccount,
  TreasuryCurrencyCode,
  TreasuryMovementType,
  TreasuryCategory,
  TreasurySettings
} from "@/lib/domain/access";
import { DEFAULT_RECEIPT_EXAMPLE, DEFAULT_RECEIPT_MIN_LABEL, DEFAULT_RECEIPT_PATTERN } from "@/lib/receipt-formats";
import { dashboard as txtDashboard, settings as txtSettings } from "@/lib/texts";
import { isSystemTreasuryCategoryName } from "@/lib/treasury-system-categories";
import { getEmojiOptions } from "@/lib/treasury-system-options";

type ClubTreasurySettingsManagerProps = {
  treasurySettings: TreasurySettings;
  createTreasuryAccountAction: (formData: FormData) => Promise<void>;
  updateTreasuryAccountAction: (formData: FormData) => Promise<void>;
  createTreasuryCategoryAction: (formData: FormData) => Promise<void>;
  updateTreasuryCategoryAction: (formData: FormData) => Promise<void>;
  createClubActivityAction: (formData: FormData) => Promise<void>;
  updateClubActivityAction: (formData: FormData) => Promise<void>;
};

function getRoleVisibilityLabel(visibleForSecretaria: boolean, visibleForTesoreria: boolean) {
  const labels = [];

  if (visibleForSecretaria) {
    labels.push(txtSettings.club.treasury.account_visibility_options.secretaria);
  }

  if (visibleForTesoreria) {
    labels.push(txtSettings.club.treasury.account_visibility_options.tesoreria);
  }

  return labels.join(" + ") || txtSettings.club.treasury.visibility_hidden;
}

function getAccountTypeLabel(accountType: TreasuryAccount["accountType"]) {
  return txtSettings.club.treasury.account_types[accountType];
}

function getAccountVisibilityLabel(account: TreasuryAccount) {
  return getRoleVisibilityLabel(account.visibleForSecretaria, account.visibleForTesoreria);
}

function getCurrencyLabel(currencyCode: TreasuryCurrencyCode) {
  return txtSettings.club.treasury.currency_options[currencyCode];
}

function getMovementTypeLabel(movementType: TreasuryMovementType) {
  return txtDashboard.treasury.movement_types[movementType];
}

const TREASURY_CURRENCY_OPTIONS: TreasuryCurrencyCode[] = ["ARS", "USD"];
const TREASURY_MOVEMENT_TYPE_OPTIONS: TreasuryMovementType[] = ["ingreso", "egreso"];
const TREASURY_ACCOUNT_VISIBILITY_OPTIONS = ["secretaria", "tesoreria"] as const;
const TREASURY_ACCOUNT_EMOJI_OPTIONS = txtSettings.club.treasury.emoji_options.accounts;
const TREASURY_CATEGORY_EMOJI_OPTIONS = txtSettings.club.treasury.emoji_options.categories;
const TREASURY_ACTIVITY_EMOJI_OPTIONS = txtSettings.club.treasury.emoji_options.activities;

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
    <form action={action} className="grid gap-4 rounded-shell border border-border bg-secondary-readonly p-4">
      <PendingFieldset className="grid gap-4">
        {defaultActivity ? <input type="hidden" name="activity_id" value={defaultActivity.id} /> : null}

        <FormField>
          <FormFieldLabel>{txtSettings.club.treasury.activity_name_label}</FormFieldLabel>
          <FormInput type="text" name="name" defaultValue={defaultActivity?.name ?? ""} />
        </FormField>

        <div className="grid gap-3">
          <FormFieldLabel>{txtSettings.club.treasury.account_visibility_label}</FormFieldLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            {TREASURY_ACCOUNT_VISIBILITY_OPTIONS.map((visibility) => (
              <FormCheckboxCard
                key={`activity-visibility-${visibility}`}
                name="visibility"
                value={visibility}
                label={txtSettings.club.treasury.account_visibility_options[visibility]}
                defaultChecked={
                  visibility === "secretaria"
                    ? (defaultActivity?.visibleForSecretaria ?? true)
                    : (defaultActivity?.visibleForTesoreria ?? false)
                }
              />
            ))}
          </div>
        </div>

        <FormField>
          <FormFieldLabel>{txtSettings.club.treasury.emoji_label}</FormFieldLabel>
          <FormSelect name="emoji" defaultValue={defaultActivity?.emoji ?? ""}>
            <option value="">{txtSettings.club.treasury.emoji_placeholder}</option>
            {getEmojiOptions(TREASURY_ACTIVITY_EMOJI_OPTIONS, defaultActivity?.emoji).map((emoji) => (
              <option key={`activity-emoji-${emoji}`} value={emoji}>
                {emoji}
              </option>
            ))}
          </FormSelect>
        </FormField>

        <PendingSubmitButton
          idleLabel={submitLabel}
          pendingLabel={pendingLabel}
          className={buttonClass({ variant: "primary", className: "sm:justify-self-end" })}
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
  const [selectedCurrencies, setSelectedCurrencies] = useState<TreasuryCurrencyCode[]>(
    defaultAccount?.currencies.filter((currency): currency is TreasuryCurrencyCode =>
      TREASURY_CURRENCY_OPTIONS.includes(currency as TreasuryCurrencyCode)
    ) ?? []
  );
  const [currenciesTouched, setCurrenciesTouched] = useState(false);

  function handleCurrencyToggle(currencyCode: TreasuryCurrencyCode, checked: boolean) {
    setCurrenciesTouched(true);
    setSelectedCurrencies((currentCurrencies) => {
      if (checked) {
        return currentCurrencies.includes(currencyCode)
          ? currentCurrencies
          : [...currentCurrencies, currencyCode];
      }

      return currentCurrencies.filter((currentCurrency) => currentCurrency !== currencyCode);
    });
  }

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (selectedCurrencies.length > 0) {
          return;
        }

        event.preventDefault();
        setCurrenciesTouched(true);
      }}
      className="grid gap-4 rounded-shell border border-border bg-secondary-readonly p-4"
    >
      <PendingFieldset className="grid gap-4">
        {defaultAccount ? <input type="hidden" name="account_id" value={defaultAccount.id} /> : null}

        <FormField>
          <FormFieldLabel>{txtSettings.club.treasury.account_name_label}</FormFieldLabel>
          <FormInput type="text" name="name" defaultValue={defaultAccount?.name ?? ""} />
        </FormField>

        <FormField>
          <FormFieldLabel>{txtSettings.club.treasury.account_type_label}</FormFieldLabel>
          <FormSelect name="account_type" defaultValue={defaultAccount?.accountType ?? ""}>
            <option value="" disabled>
              {txtSettings.club.treasury.account_type_placeholder}
            </option>
            <option value="efectivo">{txtSettings.club.treasury.account_types.efectivo}</option>
            <option value="bancaria">{txtSettings.club.treasury.account_types.bancaria}</option>
            <option value="billetera_virtual">
              {txtSettings.club.treasury.account_types.billetera_virtual}
            </option>
          </FormSelect>
        </FormField>

        <div className="grid gap-3">
          <FormFieldLabel>{txtSettings.club.treasury.account_visibility_label}</FormFieldLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            {TREASURY_ACCOUNT_VISIBILITY_OPTIONS.map((visibility) => (
              <FormCheckboxCard
                key={`account-visibility-${visibility}`}
                name="visibility"
                value={visibility}
                label={txtSettings.club.treasury.account_visibility_options[visibility]}
                defaultChecked={
                  visibility === "secretaria"
                    ? (defaultAccount?.visibleForSecretaria ?? true)
                    : (defaultAccount?.visibleForTesoreria ?? false)
                }
              />
            ))}
          </div>
        </div>

        <FormField>
          <FormFieldLabel>{txtSettings.club.treasury.emoji_label}</FormFieldLabel>
          <FormSelect name="emoji" defaultValue={defaultAccount?.emoji ?? ""}>
            <option value="">{txtSettings.club.treasury.emoji_placeholder}</option>
            {getEmojiOptions(TREASURY_ACCOUNT_EMOJI_OPTIONS, defaultAccount?.emoji).map((emoji) => (
              <option key={`account-emoji-${emoji}`} value={emoji}>
                {emoji}
              </option>
            ))}
          </FormSelect>
        </FormField>

        <div className="grid gap-3">
          <FormFieldLabel>{txtSettings.club.treasury.account_currencies_label}</FormFieldLabel>
          <div className="grid gap-3 sm:grid-cols-3">
            {availableCurrencies.map((currencyCode) => (
              <FormCheckboxCard
                key={`account-currency-${currencyCode}`}
                name="currencies"
                value={currencyCode}
                label={getCurrencyLabel(currencyCode)}
                checked={selectedCurrencies.includes(currencyCode)}
                onChange={(checked) => handleCurrencyToggle(currencyCode, checked)}
              />
            ))}
          </div>
          {currenciesTouched && selectedCurrencies.length === 0 ? (
            <p aria-live="assertive" className="text-sm text-destructive">
              {txtSettings.club.treasury.feedback.account_currencies_required}
            </p>
          ) : null}
        </div>

        <PendingSubmitButton
          idleLabel={submitLabel}
          pendingLabel={pendingLabel}
          disabled={selectedCurrencies.length === 0}
          className={buttonClass({ variant: "primary", className: "sm:justify-self-end" })}
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
  const isSystemCategory = defaultCategory ? isSystemTreasuryCategoryName(defaultCategory.name) : false;

  return (
    <form action={action} className="grid gap-4 rounded-shell border border-border bg-secondary-readonly p-4">
      <PendingFieldset className="grid gap-4">
        {defaultCategory ? <input type="hidden" name="category_id" value={defaultCategory.id} /> : null}
        {isSystemCategory ? (
          <>
            <input type="hidden" name="name" value={defaultCategory?.name ?? ""} />
            <input type="hidden" name="emoji" value={defaultCategory?.emoji ?? ""} />
          </>
        ) : (
          <>
            <FormField>
              <FormFieldLabel>{txtSettings.club.treasury.category_name_label}</FormFieldLabel>
              <FormInput type="text" name="name" defaultValue={defaultCategory?.name ?? ""} />
            </FormField>

            <FormField>
              <FormFieldLabel>{txtSettings.club.treasury.emoji_label}</FormFieldLabel>
              <FormSelect name="emoji" defaultValue={defaultCategory?.emoji ?? ""}>
                <option value="">{txtSettings.club.treasury.emoji_placeholder}</option>
                {getEmojiOptions(TREASURY_CATEGORY_EMOJI_OPTIONS, defaultCategory?.emoji).map((emoji) => (
                  <option key={`category-emoji-${emoji}`} value={emoji}>
                    {emoji}
                  </option>
                ))}
              </FormSelect>
            </FormField>
          </>
        )}

        <div className="grid gap-3">
          <FormFieldLabel>{txtSettings.club.treasury.account_visibility_label}</FormFieldLabel>
          <div className="grid gap-3 sm:grid-cols-2">
            {TREASURY_ACCOUNT_VISIBILITY_OPTIONS.map((visibility) => (
              <FormCheckboxCard
                key={`category-visibility-${visibility}`}
                name="visibility"
                value={visibility}
                label={txtSettings.club.treasury.account_visibility_options[visibility]}
                defaultChecked={
                  visibility === "secretaria"
                    ? (defaultCategory?.visibleForSecretaria ?? true)
                    : (defaultCategory?.visibleForTesoreria ?? false)
                }
              />
            ))}
          </div>
        </div>

        <PendingSubmitButton
          idleLabel={submitLabel}
          pendingLabel={pendingLabel}
          className={buttonClass({ variant: "primary", className: "sm:justify-self-end" })}
        />
      </PendingFieldset>
    </form>
  );
}

type SettingsSectionShellProps = {
  eyebrow?: string;
  title: string;
  description: string;
  action?: React.ReactNode;
  children: React.ReactNode;
};

function SettingsSectionShell({
  eyebrow,
  title,
  description,
  action,
  children
}: SettingsSectionShellProps) {
  return (
    <Card className="border-border/70 shadow-soft">
      <div className="flex flex-col gap-4 border-b border-border/60 pb-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          {eyebrow ? <Badge label={eyebrow} tone="neutral" /> : null}
          <div className="space-y-1">
            <h3 className="text-lg font-semibold tracking-tight text-foreground">{title}</h3>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </div>
      <div className="mt-5">{children}</div>
    </Card>
  );
}

export function ClubTreasurySettingsManager({
  treasurySettings,
  createTreasuryAccountAction,
  updateTreasuryAccountAction,
  createTreasuryCategoryAction,
  updateTreasuryCategoryAction,
  createClubActivityAction,
  updateClubActivityAction
}: ClubTreasurySettingsManagerProps) {
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
  const [accountCreateFormKey, setAccountCreateFormKey] = useState(0);
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [editingCategoryId, setEditingCategoryId] = useState<string | null>(null);
  const [categoryCreateFormKey, setCategoryCreateFormKey] = useState(0);
  const [isCreatingActivity, setIsCreatingActivity] = useState(false);
  const [editingActivityId, setEditingActivityId] = useState<string | null>(null);
  const [activityCreateFormKey, setActivityCreateFormKey] = useState(0);
  const availableAccountCurrencies: TreasuryCurrencyCode[] = TREASURY_CURRENCY_OPTIONS;
  const receiptFormat = treasurySettings.receiptFormats[0];

  async function handleCreateAccount(formData: FormData) {
    setIsCreatingAccount(false);
    setEditingAccountId(null);
    setAccountCreateFormKey((k) => k + 1);
    await createTreasuryAccountAction(formData);
  }

  async function handleCreateCategory(formData: FormData) {
    setIsCreatingCategory(false);
    setEditingCategoryId(null);
    setCategoryCreateFormKey((k) => k + 1);
    await createTreasuryCategoryAction(formData);
  }

  async function handleCreateActivity(formData: FormData) {
    setIsCreatingActivity(false);
    setEditingActivityId(null);
    setActivityCreateFormKey((k) => k + 1);
    await createClubActivityAction(formData);
  }

  return (
    <div className="space-y-6">
      <SettingsSectionShell
        title={txtSettings.club.treasury.accounts_title}
        description={txtSettings.club.treasury.accounts_description}
        action={
          <Button
            variant="secondary"
            onClick={() => {
              setIsCreatingAccount((current) => !current);
              setEditingAccountId(null);
            }}
          >
            {txtSettings.club.treasury.create_account_cta}
          </Button>
        }
      >
        {isCreatingAccount ? (
          <div className="mb-4">
            <TreasuryAccountForm
              key={`create-account-form-${accountCreateFormKey}`}
              action={handleCreateAccount}
              submitLabel={txtSettings.club.treasury.save_account_cta}
              pendingLabel={txtSettings.club.treasury.save_account_loading}
              availableCurrencies={availableAccountCurrencies}
            />
          </div>
        ) : null}

        {treasurySettings.accounts.length === 0 ? (
          <EmptyState title={txtSettings.club.treasury.empty_accounts} />
        ) : (
          <div className="grid gap-4">
            {treasurySettings.accounts.map((account) => (
              <Card as="article" key={account.id} padding="compact">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-shell bg-primary/10 text-xl">
                        {account.emoji ?? txtSettings.club.treasury.default_account_emoji}
                      </div>
                      <div>
                        <p className="truncate text-base font-semibold text-foreground">{account.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {getAccountTypeLabel(account.accountType)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <MetaPill
                        label={txtSettings.club.treasury.account_visibility_label}
                        value={getAccountVisibilityLabel(account)}
                      />
                      <MetaPill
                        label={txtSettings.club.treasury.account_currencies_label}
                        value={account.currencies.join(" · ")}
                      />
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    onClick={() =>
                      setEditingAccountId((current) => (current === account.id ? null : account.id))
                    }
                  >
                    {txtSettings.club.treasury.edit_account_cta}
                  </Button>
                </div>

                {editingAccountId === account.id ? (
                  <div className="mt-4">
                    <TreasuryAccountForm
                      action={updateTreasuryAccountAction}
                      submitLabel={txtSettings.club.treasury.update_account_cta}
                      pendingLabel={txtSettings.club.treasury.update_account_loading}
                      defaultAccount={account}
                      availableCurrencies={availableAccountCurrencies}
                    />
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </SettingsSectionShell>

      <SettingsSectionShell
        eyebrow={txtSettings.club.treasury.movement_type_selection_label}
        title={txtSettings.club.treasury.movement_types_title}
        description={txtSettings.club.treasury.movement_types_description}
      >
        <div className="grid gap-3 lg:grid-cols-2">
          {TREASURY_MOVEMENT_TYPE_OPTIONS.map((movementType) => {
            const isIncome = movementType === "ingreso";

            return (
              <article
                key={movementType}
                className={`rounded-shell border p-5 ${
                  isIncome ? "border-success/25 bg-success/5" : "border-destructive/20 bg-destructive/5"
                }`}
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-card text-2xl">
                  {isIncome ? "↗" : "↘"}
                </div>
                <div className="mt-5 space-y-1">
                  <p
                    className={`text-3xl font-semibold tracking-tight ${
                      isIncome ? "text-success" : "text-destructive"
                    }`}
                  >
                    {getMovementTypeLabel(movementType)}
                  </p>
                  <p className="text-xs font-semibold uppercase tracking-card-eyebrow text-muted-foreground">
                    {txtSettings.club.treasury.movement_type_impacts[movementType]}
                  </p>
                </div>
              </article>
            );
          })}
        </div>
      </SettingsSectionShell>

      <SettingsSectionShell
        title={txtSettings.club.treasury.categories_title}
        description={txtSettings.club.treasury.categories_description}
        action={
          <Button
            variant="secondary"
            onClick={() => {
              setIsCreatingCategory((current) => !current);
              setEditingCategoryId(null);
            }}
          >
            {txtSettings.club.treasury.create_category_cta}
          </Button>
        }
      >
        {isCreatingCategory ? (
          <div className="mb-4">
            <TreasuryCategoryForm
              key={`create-category-form-${categoryCreateFormKey}`}
              action={handleCreateCategory}
              submitLabel={txtSettings.club.treasury.save_category_cta}
              pendingLabel={txtSettings.club.treasury.save_category_loading}
            />
          </div>
        ) : null}

        {treasurySettings.categories.length === 0 ? (
          <EmptyState title={txtSettings.club.treasury.empty_categories} />
        ) : (
          <div className="grid gap-4">
            {treasurySettings.categories.map((category) => (
              <Card as="article" key={category.id} padding="compact">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-shell bg-primary/10 text-xl">
                        {category.emoji ?? txtSettings.club.treasury.default_category_emoji}
                      </div>
                      <div>
                        <p className="truncate text-base font-semibold text-foreground">{category.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {getRoleVisibilityLabel(
                            category.visibleForSecretaria,
                            category.visibleForTesoreria
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <MetaPill
                        label={txtSettings.club.treasury.account_visibility_label}
                        value={getRoleVisibilityLabel(
                          category.visibleForSecretaria,
                          category.visibleForTesoreria
                        )}
                      />
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    onClick={() =>
                      setEditingCategoryId((current) => (current === category.id ? null : category.id))
                    }
                  >
                    {txtSettings.club.treasury.edit_category_cta}
                  </Button>
                </div>

                {editingCategoryId === category.id ? (
                  <div className="mt-4">
                    <TreasuryCategoryForm
                      action={updateTreasuryCategoryAction}
                      submitLabel={txtSettings.club.treasury.update_category_cta}
                      pendingLabel={txtSettings.club.treasury.update_category_loading}
                      defaultCategory={category}
                    />
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </SettingsSectionShell>

      <SettingsSectionShell
        title={txtSettings.club.treasury.activities_title}
        description={txtSettings.club.treasury.activities_description}
        action={
          <Button
            variant="secondary"
            onClick={() => {
              setIsCreatingActivity((current) => !current);
              setEditingActivityId(null);
            }}
          >
            {txtSettings.club.treasury.create_activity_cta}
          </Button>
        }
      >
        {isCreatingActivity ? (
          <div className="mb-4">
            <ClubActivityForm
              key={`create-activity-form-${activityCreateFormKey}`}
              action={handleCreateActivity}
              submitLabel={txtSettings.club.treasury.save_activity_cta}
              pendingLabel={txtSettings.club.treasury.save_activity_loading}
            />
          </div>
        ) : null}

        {treasurySettings.activities.length === 0 ? (
          <EmptyState title={txtSettings.club.treasury.empty_activities} />
        ) : (
          <div className="grid gap-4">
            {treasurySettings.activities.map((activity) => (
              <Card as="article" key={activity.id} padding="compact">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-shell bg-primary/10 text-xl">
                        {activity.emoji ?? txtSettings.club.treasury.default_activity_emoji}
                      </div>
                      <div>
                        <p className="truncate text-base font-semibold text-foreground">{activity.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {getRoleVisibilityLabel(
                            activity.visibleForSecretaria,
                            activity.visibleForTesoreria
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <MetaPill
                        label={txtSettings.club.treasury.account_visibility_label}
                        value={getRoleVisibilityLabel(
                          activity.visibleForSecretaria,
                          activity.visibleForTesoreria
                        )}
                      />
                    </div>
                  </div>

                  <Button
                    variant="secondary"
                    onClick={() =>
                      setEditingActivityId((current) => (current === activity.id ? null : activity.id))
                    }
                  >
                    {txtSettings.club.treasury.edit_activity_cta}
                  </Button>
                </div>

                {editingActivityId === activity.id ? (
                  <div className="mt-4">
                    <ClubActivityForm
                      action={updateClubActivityAction}
                      submitLabel={txtSettings.club.treasury.update_activity_cta}
                      pendingLabel={txtSettings.club.treasury.update_activity_loading}
                      defaultActivity={activity}
                    />
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </SettingsSectionShell>

      <SettingsSectionShell
        title={txtSettings.club.treasury.receipt_formats_title}
        description={txtSettings.club.treasury.receipt_formats_description}
      >
        <div className="grid gap-4 rounded-shell border border-border/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.92)_0%,rgba(255,255,255,0.98)_100%)] p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField>
              <FormFieldLabel>{txtSettings.club.treasury.receipt_name_label}</FormFieldLabel>
              <FormReadonly>
                {receiptFormat?.name ?? txtSettings.club.treasury.empty_receipt_formats}
              </FormReadonly>
            </FormField>

            <FormField>
              <FormFieldLabel>{txtSettings.club.treasury.receipt_example_label}</FormFieldLabel>
              <FormReadonly>{receiptFormat?.example ?? DEFAULT_RECEIPT_EXAMPLE}</FormReadonly>
            </FormField>

            <FormField>
              <FormFieldLabel>{txtSettings.club.treasury.receipt_pattern_label}</FormFieldLabel>
              <FormReadonly>{receiptFormat?.pattern ?? DEFAULT_RECEIPT_PATTERN}</FormReadonly>
            </FormField>

            <FormField>
              <FormFieldLabel>{txtSettings.club.treasury.receipt_min_label}</FormFieldLabel>
              <FormReadonly>{DEFAULT_RECEIPT_MIN_LABEL}</FormReadonly>
            </FormField>
          </div>

          <p className="text-xs leading-5 text-muted-foreground">
            {txtSettings.club.treasury.receipt_formats_read_only}
          </p>
        </div>
      </SettingsSectionShell>
    </div>
  );
}
