"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { PendingFieldset, PendingSubmitButton } from "@/components/ui/pending-form";
import type {
  ClubActivity,
  ReceiptFormat,
  TreasuryAccount,
  TreasuryCategory,
  TreasuryCurrencyConfig,
  TreasuryMovementType,
  TreasuryRoleDashboard
} from "@/lib/domain/access";
import { DEFAULT_RECEIPT_MIN_LABEL, DEFAULT_RECEIPT_PATTERN } from "@/lib/receipt-formats";
import { texts } from "@/lib/texts";

type TreasuryRoleCardProps = {
  dashboard: TreasuryRoleDashboard;
  accounts: TreasuryAccount[];
  categories: TreasuryCategory[];
  activities: ClubActivity[];
  currencies: TreasuryCurrencyConfig[];
  movementTypes: TreasuryMovementType[];
  receiptFormats: ReceiptFormat[];
  createTreasuryRoleMovementAction: (formData: FormData) => Promise<void>;
};

export function TreasuryRoleCard({
  dashboard,
  accounts,
  categories,
  activities,
  currencies,
  movementTypes,
  receiptFormats,
  createTreasuryRoleMovementAction
}: TreasuryRoleCardProps) {
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const availableCurrencies = useMemo(() => {
    const selectedAccount = accounts.find((account) => account.id === selectedAccountId);

    if (!selectedAccount) {
      return currencies;
    }

    return currencies.filter((currency) => selectedAccount.currencies.includes(currency.currencyCode));
  }, [accounts, currencies, selectedAccountId]);

  return (
    <section className="rounded-[28px] border border-border bg-card p-6 shadow-soft sm:p-8">
      <div className="space-y-2">
        <h2 className="text-2xl font-semibold tracking-tight text-card-foreground">
          {texts.dashboard.treasury_role.title}
        </h2>
        <p className="text-sm leading-6 text-muted-foreground">
          {texts.dashboard.treasury_role.description}
        </p>
      </div>

      <div className="mt-6 grid gap-4">
        {dashboard.accounts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
            {texts.dashboard.treasury_role.empty_accounts}
          </div>
        ) : (
          <div className="grid gap-3">
            {dashboard.accounts.map((account) => (
              <article key={account.accountId} className="rounded-2xl border border-border bg-secondary/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{account.name}</p>
                  <Link
                    href={`/dashboard/treasury/accounts/${account.accountId}`}
                    className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {texts.dashboard.treasury_role.detail_cta}
                  </Link>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {account.balances.map((balance) => (
                    <div
                      key={`${account.accountId}-${balance.currencyCode}`}
                      className="rounded-2xl border border-border/60 bg-card px-3 py-2"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {balance.currencyCode}
                      </p>
                      <p className="mt-1 font-medium text-foreground">{balance.amount.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}

        <div className="rounded-[24px] border border-border bg-secondary/50 p-4">
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-foreground">
              {texts.dashboard.treasury_role.movement_form_title}
            </h3>
            <p className="text-sm leading-6 text-muted-foreground">
              {texts.dashboard.treasury_role.movement_form_description}
            </p>
          </div>

          <form action={createTreasuryRoleMovementAction} className="mt-4 grid gap-4">
            <PendingFieldset className="grid gap-4">
              <label className="grid gap-2 text-sm text-foreground">
                <span className="font-medium">{texts.dashboard.treasury.date_label}</span>
                <input
                  type="date"
                  name="movement_date"
                  defaultValue={dashboard.sessionDate}
                  className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                />
              </label>

              <label className="grid gap-2 text-sm text-foreground">
                <span className="font-medium">{texts.dashboard.treasury.account_label}</span>
                <select
                  name="account_id"
                  defaultValue=""
                  onChange={(event) => setSelectedAccountId(event.target.value)}
                  className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                >
                  <option value="" disabled>
                    {texts.settings.club.members.role_placeholder}
                  </option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm text-foreground">
                <span className="font-medium">{texts.dashboard.treasury.movement_type_label}</span>
                <select
                  name="movement_type"
                  defaultValue=""
                  className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                >
                  <option value="" disabled>
                    {texts.settings.club.members.role_placeholder}
                  </option>
                  {movementTypes.map((movementType) => (
                    <option key={movementType} value={movementType}>
                      {texts.dashboard.treasury.movement_types[movementType]}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm text-foreground">
                <span className="font-medium">{texts.dashboard.treasury.category_label}</span>
                <select
                  name="category_id"
                  defaultValue=""
                  className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                >
                  <option value="" disabled>
                    {texts.settings.club.members.role_placeholder}
                  </option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              {activities.length > 0 ? (
                <label className="grid gap-2 text-sm text-foreground">
                  <span className="font-medium">{texts.dashboard.treasury.activity_label}</span>
                  <select
                    name="activity_id"
                    defaultValue=""
                    className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                  >
                    <option value="">{texts.dashboard.treasury.activity_placeholder}</option>
                    {activities.map((activity) => (
                      <option key={activity.id} value={activity.id}>
                        {activity.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              <label className="grid gap-2 text-sm text-foreground">
                <span className="font-medium">{texts.dashboard.treasury.receipt_label}</span>
                <input
                  type="text"
                  name="receipt_number"
                  className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                />
                {receiptFormats.length > 0 ? (
                  <div className="grid gap-1 text-xs leading-5 text-muted-foreground">
                    <span>
                      {texts.dashboard.treasury.receipt_helper_format} {receiptFormats[0]?.pattern ?? DEFAULT_RECEIPT_PATTERN}
                    </span>
                    <span>
                      {texts.dashboard.treasury.receipt_helper_example} {receiptFormats[0]?.example ?? "-"}
                    </span>
                    <span>
                      {texts.dashboard.treasury.receipt_helper_available_from} {DEFAULT_RECEIPT_MIN_LABEL}
                    </span>
                  </div>
                ) : null}
              </label>

              <label className="grid gap-2 text-sm text-foreground">
                <span className="font-medium">{texts.dashboard.treasury.concept_label}</span>
                <input
                  type="text"
                  name="concept"
                  className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                />
              </label>

              <label className="grid gap-2 text-sm text-foreground">
                <span className="font-medium">{texts.dashboard.treasury.currency_label}</span>
                <select
                  name="currency_code"
                  defaultValue=""
                  className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                >
                  <option value="" disabled>
                    {texts.settings.club.members.role_placeholder}
                  </option>
                  {availableCurrencies.map((currency) => (
                    <option key={currency.currencyCode} value={currency.currencyCode}>
                      {currency.currencyCode}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm text-foreground">
                <span className="font-medium">{texts.dashboard.treasury.amount_label}</span>
                <input
                  type="number"
                  name="amount"
                  min="0.01"
                  step="0.01"
                  className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                />
              </label>

              <div className="flex flex-wrap gap-3">
                <PendingSubmitButton
                  idleLabel={texts.dashboard.treasury_role.create_cta}
                  pendingLabel={texts.dashboard.treasury_role.create_loading}
                  className="min-h-11 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
                />
                <button
                  type="reset"
                  className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                >
                  {texts.dashboard.treasury.reset_cta}
                </button>
              </div>
            </PendingFieldset>
          </form>
        </div>
      </div>
    </section>
  );
}
