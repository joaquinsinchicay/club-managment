"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

import { Modal } from "@/components/ui/modal";
import { PendingFieldset, PendingSubmitButton } from "@/components/ui/pending-form";
import { SettingsTabShell } from "@/components/settings/settings-tab-shell";
import type { TreasuryAccount, TreasuryCurrencyCode } from "@/lib/domain/access";
import { texts } from "@/lib/texts";

const TREASURY_CURRENCY_OPTIONS: TreasuryCurrencyCode[] = ["ARS", "USD"];
const TREASURY_ACCOUNT_VISIBILITY_OPTIONS = ["secretaria", "tesoreria"] as const;
const TREASURY_ACCOUNT_EMOJI_OPTIONS = texts.settings.club.treasury.emoji_options.accounts;

function getCurrencyLabel(currencyCode: TreasuryCurrencyCode) {
  return texts.settings.club.treasury.currency_options[currencyCode];
}

function getAccountTypeLabel(accountType: TreasuryAccount["accountType"]) {
  return texts.settings.club.treasury.account_types[accountType];
}

function getAccountVisibilityLabel(account: TreasuryAccount) {
  const labels = [];
  if (account.visibleForSecretaria) {
    labels.push(texts.settings.club.treasury.account_visibility_options.secretaria);
  }
  if (account.visibleForTesoreria) {
    labels.push(texts.settings.club.treasury.account_visibility_options.tesoreria);
  }
  return labels.join(" + ") || texts.settings.club.treasury.visibility_hidden;
}

function getEmojiOptions(options: string[], currentEmoji?: string | null) {
  if (currentEmoji && !options.includes(currentEmoji)) {
    return [currentEmoji, ...options];
  }
  return options;
}

type AccountFormProps = {
  action: (formData: FormData) => Promise<void>;
  submitLabel: string;
  pendingLabel: string;
  defaultAccount?: TreasuryAccount;
  availableCurrencies: TreasuryCurrencyCode[];
  onSuccess: () => void;
};

function AccountForm({
  action,
  submitLabel,
  pendingLabel,
  defaultAccount,
  availableCurrencies,
  onSuccess
}: AccountFormProps) {
  const [selectedCurrencies, setSelectedCurrencies] = useState<TreasuryCurrencyCode[]>(
    defaultAccount?.currencies.filter((c): c is TreasuryCurrencyCode =>
      TREASURY_CURRENCY_OPTIONS.includes(c as TreasuryCurrencyCode)
    ) ?? []
  );
  const [currenciesTouched, setCurrenciesTouched] = useState(false);
  const [selectedVisibility, setSelectedVisibility] = useState<string[]>(
    TREASURY_ACCOUNT_VISIBILITY_OPTIONS.filter((v) =>
      v === "secretaria" ? (defaultAccount?.visibleForSecretaria ?? true) : (defaultAccount?.visibleForTesoreria ?? false)
    )
  );
  const [visibilityTouched, setVisibilityTouched] = useState(false);
  const searchParams = useSearchParams();
  const feedbackCode = searchParams.get("feedback");

  useEffect(() => {
    if (
      feedbackCode === "account_created" ||
      feedbackCode === "account_updated"
    ) {
      onSuccess();
    }
  }, [feedbackCode, onSuccess]);

  function handleVisibilityToggle(visibility: string, checked: boolean) {
    setVisibilityTouched(true);
    setSelectedVisibility((current) =>
      checked ? [...current, visibility] : current.filter((v) => v !== visibility)
    );
  }

  function handleCurrencyToggle(currencyCode: TreasuryCurrencyCode, checked: boolean) {
    setCurrenciesTouched(true);
    setSelectedCurrencies((current) => {
      if (checked) {
        return current.includes(currencyCode) ? current : [...current, currencyCode];
      }
      return current.filter((c) => c !== currencyCode);
    });
  }

  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (selectedVisibility.length === 0) {
          event.preventDefault();
          setVisibilityTouched(true);
          return;
        }

        if (selectedCurrencies.length === 0) {
          event.preventDefault();
          setCurrenciesTouched(true);
        }
      }}
      className="grid gap-4"
    >
      <PendingFieldset className="grid gap-4">
        {defaultAccount ? <input type="hidden" name="account_id" value={defaultAccount.id} /> : null}

        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.settings.club.treasury.account_name_label}</span>
          <input
            type="text"
            name="name"
            defaultValue={defaultAccount?.name ?? ""}
            className="min-h-11 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
          />
        </label>

        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.settings.club.treasury.account_type_label}</span>
          <select
            name="account_type"
            defaultValue={defaultAccount?.accountType ?? ""}
            className="min-h-11 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
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

        <fieldset className="grid gap-3">
          <legend className="text-sm font-medium text-foreground">
            {texts.settings.club.treasury.account_visibility_label}
          </legend>
          <div className="grid gap-3 sm:grid-cols-2">
            {TREASURY_ACCOUNT_VISIBILITY_OPTIONS.map((visibility) => (
              <label
                key={`account-visibility-${visibility}`}
                className="flex min-h-11 items-center gap-3 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
              >
                <input
                  type="checkbox"
                  name="visibility"
                  value={visibility}
                  checked={selectedVisibility.includes(visibility)}
                  onChange={(e) => handleVisibilityToggle(visibility, e.target.checked)}
                  className="size-4 rounded border-border"
                />
                <span className="font-medium">
                  {texts.settings.club.treasury.account_visibility_options[visibility]}
                </span>
              </label>
            ))}
          </div>
          {visibilityTouched && selectedVisibility.length === 0 ? (
            <p aria-live="assertive" className="text-sm text-destructive">
              {texts.settings.club.treasury.feedback.account_visibility_required}
            </p>
          ) : null}
        </fieldset>

        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.settings.club.treasury.emoji_label}</span>
          <select
            name="emoji"
            defaultValue={defaultAccount?.emoji ?? ""}
            className="min-h-11 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
          >
            <option value="">{texts.settings.club.treasury.emoji_placeholder}</option>
            {getEmojiOptions(TREASURY_ACCOUNT_EMOJI_OPTIONS, defaultAccount?.emoji).map((emoji) => (
              <option key={`account-emoji-${emoji}`} value={emoji}>
                {emoji}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="grid gap-3">
          <legend className="text-sm font-medium text-foreground">
            {texts.settings.club.treasury.account_currencies_label}
          </legend>
          <div className="grid gap-3 sm:grid-cols-3">
            {availableCurrencies.map((currencyCode) => (
              <label
                key={`account-currency-${currencyCode}`}
                className="flex min-h-11 items-center gap-3 rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm text-foreground"
              >
                <input
                  type="checkbox"
                  name="currencies"
                  value={currencyCode}
                  checked={selectedCurrencies.includes(currencyCode)}
                  onChange={(e) => handleCurrencyToggle(currencyCode, e.target.checked)}
                  className="size-4 rounded border-border"
                />
                <span className="font-medium">{getCurrencyLabel(currencyCode)}</span>
              </label>
            ))}
          </div>
          {currenciesTouched && selectedCurrencies.length === 0 ? (
            <p aria-live="assertive" className="text-sm text-destructive">
              {texts.settings.club.treasury.feedback.account_currencies_required}
            </p>
          ) : null}
        </fieldset>

        <PendingSubmitButton
          idleLabel={submitLabel}
          pendingLabel={pendingLabel}
          disabled={selectedCurrencies.length === 0 || selectedVisibility.length === 0}
          className="min-h-11 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95 sm:justify-self-end"
        />
      </PendingFieldset>
    </form>
  );
}

type AccountsTabProps = {
  accounts: TreasuryAccount[];
  createTreasuryAccountAction: (formData: FormData) => Promise<void>;
  updateTreasuryAccountAction: (formData: FormData) => Promise<void>;
};

export function AccountsTab({
  accounts,
  createTreasuryAccountAction,
  updateTreasuryAccountAction
}: AccountsTabProps) {
  const [search, setSearch] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [editingAccount, setEditingAccount] = useState<TreasuryAccount | null>(null);

  const filteredAccounts = accounts.filter((account) =>
    account.name.toLowerCase().includes(search.toLowerCase())
  );

  function handleCreateSuccess() {
    setIsCreating(false);
  }

  function handleEditSuccess() {
    setEditingAccount(null);
  }

  return (
    <>
      <SettingsTabShell
        searchPlaceholder={texts.settings.club.treasury.accounts_title}
        searchValue={search}
        onSearch={setSearch}
        ctaLabel={texts.settings.club.treasury.create_account_cta}
        onCta={() => {
          setIsCreating(true);
          setEditingAccount(null);
        }}
      >
        {filteredAccounts.length === 0 ? (
          <div className="rounded-[24px] border border-dashed border-border bg-secondary/30 p-5 text-sm text-muted-foreground">
            {accounts.length === 0
              ? texts.settings.club.treasury.empty_accounts
              : "Sin resultados para la búsqueda."}
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredAccounts.map((account) => (
              <article
                key={account.id}
                className="rounded-[26px] border border-border/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.92)_0%,rgba(255,255,255,0.98)_100%)] p-5"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-[18px] bg-primary/10 text-xl">
                        {account.emoji ?? texts.settings.club.treasury.default_account_emoji}
                      </div>
                      <div>
                        <p className="truncate text-base font-semibold text-foreground">{account.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {getAccountTypeLabel(account.accountType)}
                        </p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-2 text-foreground">
                        <span className="font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                          {texts.settings.club.treasury.account_visibility_label}
                        </span>
                        <span className="font-medium">{getAccountVisibilityLabel(account)}</span>
                      </span>
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
                    onClick={() => {
                      setEditingAccount(account);
                      setIsCreating(false);
                    }}
                    aria-label={texts.settings.club.treasury.edit_account_cta}
                    className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </SettingsTabShell>

      <Modal
        open={isCreating}
        title={texts.settings.club.treasury.create_account_cta}
        onClose={() => setIsCreating(false)}
      >
        <AccountForm
          action={createTreasuryAccountAction}
          submitLabel={texts.settings.club.treasury.save_account_cta}
          pendingLabel={texts.settings.club.treasury.save_account_loading}
          availableCurrencies={TREASURY_CURRENCY_OPTIONS}
          onSuccess={handleCreateSuccess}
        />
      </Modal>

      <Modal
        open={editingAccount !== null}
        title={texts.settings.club.treasury.edit_account_cta}
        onClose={() => setEditingAccount(null)}
      >
        {editingAccount ? (
          <AccountForm
            key={editingAccount.id}
            action={updateTreasuryAccountAction}
            submitLabel={texts.settings.club.treasury.update_account_cta}
            pendingLabel={texts.settings.club.treasury.update_account_loading}
            defaultAccount={editingAccount}
            availableCurrencies={TREASURY_CURRENCY_OPTIONS}
            onSuccess={handleEditSuccess}
          />
        ) : null}
      </Modal>
    </>
  );
}
