"use client";

import { type ReactNode, useMemo, useState } from "react";

import { PendingFieldset, PendingSubmitButton } from "@/components/ui/pending-form";
import type {
  ClubActivity,
  ClubCalendarEvent,
  ReceiptFormat,
  TreasuryAccount,
  TreasuryCategory,
  TreasuryCurrencyConfig,
  TreasuryMovementType
} from "@/lib/domain/access";
import { DEFAULT_RECEIPT_MIN_LABEL, DEFAULT_RECEIPT_PATTERN } from "@/lib/receipt-formats";
import { texts } from "@/lib/texts";
import { cn } from "@/lib/utils";

type BaseMovementFormProps = {
  accounts: TreasuryAccount[];
  categories: TreasuryCategory[];
  activities: ClubActivity[];
  currencies: TreasuryCurrencyConfig[];
  movementTypes: TreasuryMovementType[];
  receiptFormats: ReceiptFormat[];
  submitLabel: string;
  pendingLabel: string;
  submitAction: (formData: FormData) => Promise<void>;
};

const FORM_GRID_CLASSNAME = "grid gap-4 sm:grid-cols-2";
const FIELD_CLASSNAME = "grid gap-2 text-sm text-foreground";
const FULL_WIDTH_FIELD_CLASSNAME = "sm:col-span-2";
const CONTROL_CLASSNAME = "min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground";
const DISABLED_CONTROL_CLASSNAME = "min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground";

function FormField({
  children,
  fullWidth = false
}: {
  children: ReactNode;
  fullWidth?: boolean;
}) {
  return <label className={cn(FIELD_CLASSNAME, fullWidth && FULL_WIDTH_FIELD_CLASSNAME)}>{children}</label>;
}

function ReceiptHelper({ receiptFormats }: { receiptFormats: ReceiptFormat[] }) {
  if (receiptFormats.length === 0) {
    return null;
  }

  return (
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
  );
}

export function SecretariaMovementForm({
  accounts,
  categories,
  activities,
  calendarEvents,
  currencies,
  movementTypes,
  receiptFormats,
  submitLabel,
  pendingLabel,
  submitAction,
  sessionDate
}: BaseMovementFormProps & {
  calendarEvents: ClubCalendarEvent[];
  sessionDate: string;
}) {
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [selectedActivityId, setSelectedActivityId] = useState("");
  const availableCurrencies = useMemo(() => {
    const selectedAccount = accounts.find((account) => account.id === selectedAccountId);

    if (!selectedAccount) {
      return currencies;
    }

    return currencies.filter((currency) => selectedAccount.currencies.includes(currency.currencyCode));
  }, [accounts, currencies, selectedAccountId]);

  return (
    <form action={submitAction} className="grid gap-4">
      <PendingFieldset className={FORM_GRID_CLASSNAME}>
        <FormField>
          <span className="font-medium">{texts.dashboard.treasury.date_label}</span>
          <input
            type="text"
            value={sessionDate}
            disabled
            className={DISABLED_CONTROL_CLASSNAME}
          />
        </FormField>

        <FormField>
          <span className="font-medium">{texts.dashboard.treasury.account_label}</span>
          <select
            name="account_id"
            defaultValue=""
            onChange={(event) => setSelectedAccountId(event.target.value)}
            className={CONTROL_CLASSNAME}
          >
            <option value="" disabled>
              {texts.dashboard.treasury.account_placeholder}
            </option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField>
          <span className="font-medium">{texts.dashboard.treasury.movement_type_label}</span>
          <select name="movement_type" defaultValue="" className={CONTROL_CLASSNAME}>
            <option value="" disabled>
              {texts.dashboard.treasury.movement_type_placeholder}
            </option>
            {movementTypes.map((movementType) => (
              <option key={movementType} value={movementType}>
                {texts.dashboard.treasury.movement_types[movementType]}
              </option>
            ))}
          </select>
        </FormField>

        <FormField>
          <span className="font-medium">{texts.dashboard.treasury.category_label}</span>
          <select
            name="category_id"
            defaultValue=""
            onChange={(event) => setSelectedCategoryId(event.target.value)}
            className={CONTROL_CLASSNAME}
          >
            <option value="" disabled>
              {texts.dashboard.treasury.category_placeholder}
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </FormField>

        {activities.length > 0 ? (
          <FormField>
            <span className="font-medium">{texts.dashboard.treasury.activity_label}</span>
            <select
              name="activity_id"
              value={selectedActivityId}
              onChange={(event) => setSelectedActivityId(event.target.value)}
              key={selectedCategoryId || "activity-select"}
              className={CONTROL_CLASSNAME}
            >
              <option value="">{texts.dashboard.treasury.activity_placeholder}</option>
              {activities.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.name}
                </option>
              ))}
            </select>
          </FormField>
        ) : null}

        <FormField fullWidth>
          <span className="font-medium">{texts.dashboard.treasury.receipt_label}</span>
          <input
            type="text"
            name="receipt_number"
            className={CONTROL_CLASSNAME}
          />
          <ReceiptHelper receiptFormats={receiptFormats} />
        </FormField>

        <FormField fullWidth>
          <span className="font-medium">{texts.dashboard.treasury.calendar_label}</span>
          <select
            name="calendar_event_id"
            defaultValue=""
            disabled={calendarEvents.length === 0}
            className={cn(CONTROL_CLASSNAME, "disabled:text-muted-foreground")}
          >
            <option value="">
              {calendarEvents.length > 0
                ? texts.dashboard.treasury.calendar_placeholder
                : texts.dashboard.treasury.empty_calendar_events}
            </option>
            {calendarEvents.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title}
              </option>
            ))}
          </select>
        </FormField>

        <FormField fullWidth>
          <span className="font-medium">{texts.dashboard.treasury.concept_label}</span>
          <input type="text" name="concept" className={CONTROL_CLASSNAME} />
        </FormField>

        <FormField>
          <span className="font-medium">{texts.dashboard.treasury.currency_label}</span>
          <select
            name="currency_code"
            key={selectedAccountId || "currency-select"}
            defaultValue=""
            className={CONTROL_CLASSNAME}
          >
            <option value="" disabled>
              {texts.dashboard.treasury.currency_placeholder}
            </option>
            {availableCurrencies.map((currency) => (
              <option key={currency.currencyCode} value={currency.currencyCode}>
                {currency.currencyCode}
              </option>
            ))}
          </select>
        </FormField>

        <FormField>
          <span className="font-medium">{texts.dashboard.treasury.amount_label}</span>
          <input type="text" name="amount" inputMode="decimal" className={CONTROL_CLASSNAME} />
        </FormField>

        <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
          <PendingSubmitButton
            idleLabel={submitLabel}
            pendingLabel={pendingLabel}
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
  );
}

export function AccountTransferForm({
  accounts,
  currencies,
  submitAction,
  sessionDate
}: {
  accounts: TreasuryAccount[];
  currencies: TreasuryCurrencyConfig[];
  submitAction: (formData: FormData) => Promise<void>;
  sessionDate: string;
}) {
  return (
    <form action={submitAction} className="grid gap-4">
      <PendingFieldset className={FORM_GRID_CLASSNAME}>
        <FormField>
          <span className="font-medium">{texts.dashboard.treasury.date_label}</span>
          <input
            type="text"
            value={sessionDate}
            disabled
            className={DISABLED_CONTROL_CLASSNAME}
          />
        </FormField>

        <FormField>
          <span className="font-medium">{texts.dashboard.treasury.transfer_source_account_label}</span>
          <select name="source_account_id" defaultValue="" className={CONTROL_CLASSNAME}>
            <option value="" disabled>
              {texts.dashboard.treasury.transfer_source_account_placeholder}
            </option>
            {accounts.map((account) => (
              <option key={`source-${account.id}`} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField>
          <span className="font-medium">{texts.dashboard.treasury.transfer_target_account_label}</span>
          <select name="target_account_id" defaultValue="" className={CONTROL_CLASSNAME}>
            <option value="" disabled>
              {texts.dashboard.treasury.transfer_target_account_placeholder}
            </option>
            {accounts.map((account) => (
              <option key={`target-${account.id}`} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField>
          <span className="font-medium">{texts.dashboard.treasury.currency_label}</span>
          <select name="currency_code" defaultValue="" className={CONTROL_CLASSNAME}>
            <option value="" disabled>
              {texts.dashboard.treasury.currency_placeholder}
            </option>
            {currencies.map((currency) => (
              <option key={`transfer-${currency.currencyCode}`} value={currency.currencyCode}>
                {currency.currencyCode}
              </option>
            ))}
          </select>
        </FormField>

        <FormField fullWidth>
          <span className="font-medium">{texts.dashboard.treasury.concept_label}</span>
          <input type="text" name="concept" className={CONTROL_CLASSNAME} />
        </FormField>

        <FormField>
          <span className="font-medium">{texts.dashboard.treasury.amount_label}</span>
          <input type="text" name="amount" inputMode="decimal" className={CONTROL_CLASSNAME} />
        </FormField>

        <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
          <PendingSubmitButton
            idleLabel={texts.dashboard.treasury.transfer_create_cta}
            pendingLabel={texts.dashboard.treasury.transfer_create_loading}
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
  );
}

export function TreasuryRoleMovementForm({
  accounts,
  categories,
  activities,
  currencies,
  movementTypes,
  receiptFormats,
  submitLabel,
  pendingLabel,
  submitAction,
  sessionDate
}: BaseMovementFormProps & { sessionDate: string }) {
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const availableCurrencies = useMemo(() => {
    const selectedAccount = accounts.find((account) => account.id === selectedAccountId);

    if (!selectedAccount) {
      return currencies;
    }

    return currencies.filter((currency) => selectedAccount.currencies.includes(currency.currencyCode));
  }, [accounts, currencies, selectedAccountId]);

  return (
    <form action={submitAction} className="grid gap-4">
      <PendingFieldset className={FORM_GRID_CLASSNAME}>
        <FormField>
          <span className="font-medium">{texts.dashboard.treasury.date_label}</span>
          <input
            type="date"
            name="movement_date"
            defaultValue={sessionDate}
            className={CONTROL_CLASSNAME}
          />
        </FormField>

        <FormField>
          <span className="font-medium">{texts.dashboard.treasury.account_label}</span>
          <select
            name="account_id"
            defaultValue=""
            onChange={(event) => setSelectedAccountId(event.target.value)}
            className={CONTROL_CLASSNAME}
          >
            <option value="" disabled>
              {texts.dashboard.treasury.account_placeholder}
            </option>
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField>
          <span className="font-medium">{texts.dashboard.treasury.movement_type_label}</span>
          <select name="movement_type" defaultValue="" className={CONTROL_CLASSNAME}>
            <option value="" disabled>
              {texts.dashboard.treasury.movement_type_placeholder}
            </option>
            {movementTypes.map((movementType) => (
              <option key={movementType} value={movementType}>
                {texts.dashboard.treasury.movement_types[movementType]}
              </option>
            ))}
          </select>
        </FormField>

        <FormField>
          <span className="font-medium">{texts.dashboard.treasury.category_label}</span>
          <select name="category_id" defaultValue="" className={CONTROL_CLASSNAME}>
            <option value="" disabled>
              {texts.dashboard.treasury.category_placeholder}
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </FormField>

        {activities.length > 0 ? (
          <FormField>
            <span className="font-medium">{texts.dashboard.treasury.activity_label}</span>
            <select name="activity_id" defaultValue="" className={CONTROL_CLASSNAME}>
              <option value="">{texts.dashboard.treasury.activity_placeholder}</option>
              {activities.map((activity) => (
                <option key={activity.id} value={activity.id}>
                  {activity.name}
                </option>
              ))}
            </select>
          </FormField>
        ) : null}

        <FormField fullWidth>
          <span className="font-medium">{texts.dashboard.treasury.receipt_label}</span>
          <input
            type="text"
            name="receipt_number"
            className={CONTROL_CLASSNAME}
          />
          <ReceiptHelper receiptFormats={receiptFormats} />
        </FormField>

        <FormField fullWidth>
          <span className="font-medium">{texts.dashboard.treasury.concept_label}</span>
          <input type="text" name="concept" className={CONTROL_CLASSNAME} />
        </FormField>

        <FormField>
          <span className="font-medium">{texts.dashboard.treasury.currency_label}</span>
          <select name="currency_code" defaultValue="" className={CONTROL_CLASSNAME}>
            <option value="" disabled>
              {texts.dashboard.treasury.currency_placeholder}
            </option>
            {availableCurrencies.map((currency) => (
              <option key={currency.currencyCode} value={currency.currencyCode}>
                {currency.currencyCode}
              </option>
            ))}
          </select>
        </FormField>

        <FormField>
          <span className="font-medium">{texts.dashboard.treasury.amount_label}</span>
          <input type="text" name="amount" inputMode="decimal" className={CONTROL_CLASSNAME} />
        </FormField>

        <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
          <PendingSubmitButton
            idleLabel={submitLabel}
            pendingLabel={pendingLabel}
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
  );
}

export function TreasuryRoleFxForm({
  accounts,
  currencies,
  submitAction,
  sessionDate
}: {
  accounts: TreasuryAccount[];
  currencies: TreasuryCurrencyConfig[];
  submitAction: (formData: FormData) => Promise<void>;
  sessionDate: string;
}) {
  return (
    <form action={submitAction} className="grid gap-4">
      <PendingFieldset className={FORM_GRID_CLASSNAME}>
        <FormField>
          <span className="font-medium">{texts.dashboard.treasury.date_label}</span>
          <input
            type="date"
            name="movement_date_preview"
            defaultValue={sessionDate}
            disabled
            className={DISABLED_CONTROL_CLASSNAME}
          />
        </FormField>

        <FormField>
          <span className="font-medium">{texts.dashboard.treasury.fx_source_account_label}</span>
          <select name="source_account_id" defaultValue="" className={CONTROL_CLASSNAME}>
            <option value="" disabled>
              {texts.dashboard.treasury.fx_source_account_placeholder}
            </option>
            {accounts.map((account) => (
              <option key={`fx-source-${account.id}`} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField>
          <span className="font-medium">{texts.dashboard.treasury.fx_source_currency_label}</span>
          <select name="source_currency_code" defaultValue="" className={CONTROL_CLASSNAME}>
            <option value="" disabled>
              {texts.dashboard.treasury.fx_source_currency_placeholder}
            </option>
            {currencies.map((currency) => (
              <option key={`fx-source-currency-${currency.currencyCode}`} value={currency.currencyCode}>
                {currency.currencyCode}
              </option>
            ))}
          </select>
        </FormField>

        <FormField>
          <span className="font-medium">{texts.dashboard.treasury.fx_source_amount_label}</span>
          <input type="text" name="source_amount" inputMode="decimal" className={CONTROL_CLASSNAME} />
        </FormField>

        <FormField>
          <span className="font-medium">{texts.dashboard.treasury.fx_target_account_label}</span>
          <select name="target_account_id" defaultValue="" className={CONTROL_CLASSNAME}>
            <option value="" disabled>
              {texts.dashboard.treasury.fx_target_account_placeholder}
            </option>
            {accounts.map((account) => (
              <option key={`fx-target-${account.id}`} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField>
          <span className="font-medium">{texts.dashboard.treasury.fx_target_currency_label}</span>
          <select name="target_currency_code" defaultValue="" className={CONTROL_CLASSNAME}>
            <option value="" disabled>
              {texts.dashboard.treasury.fx_target_currency_placeholder}
            </option>
            {currencies.map((currency) => (
              <option key={`fx-target-currency-${currency.currencyCode}`} value={currency.currencyCode}>
                {currency.currencyCode}
              </option>
            ))}
          </select>
        </FormField>

        <FormField>
          <span className="font-medium">{texts.dashboard.treasury.fx_target_amount_label}</span>
          <input type="text" name="target_amount" inputMode="decimal" className={CONTROL_CLASSNAME} />
        </FormField>

        <FormField fullWidth>
          <span className="font-medium">{texts.dashboard.treasury.concept_label}</span>
          <input type="text" name="concept" className={CONTROL_CLASSNAME} />
        </FormField>

        <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
          <PendingSubmitButton
            idleLabel={texts.dashboard.treasury_role.fx_create_cta}
            pendingLabel={texts.dashboard.treasury_role.fx_create_loading}
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
  );
}
