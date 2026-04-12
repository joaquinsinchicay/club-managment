"use client";

import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from "react";

import { formatLocalizedAmount } from "@/lib/amounts";
import { PendingFieldset, PendingSubmitButton } from "@/components/ui/pending-form";
import type {
  ClubActivity,
  ClubCalendarEvent,
  ReceiptFormat,
  TreasuryAccount,
  TreasuryCategory,
  TreasuryCurrencyConfig,
  TreasuryDashboardMovement,
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
  submitAction: (formData: FormData) => Promise<unknown>;
};

const FORM_GRID_CLASSNAME = "grid gap-4 sm:grid-cols-2";
const FIELD_CLASSNAME = "grid gap-2 text-sm text-foreground";
const FULL_WIDTH_FIELD_CLASSNAME = "sm:col-span-2";
const CONTROL_CLASSNAME = "min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground";
const DISABLED_CONTROL_CLASSNAME = "min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-muted-foreground";

type MovementFormState = {
  movementDate?: string;
  accountId: string;
  movementType: string;
  categoryId: string;
  activityId: string;
  receiptNumber: string;
  calendarEventId?: string;
  concept: string;
  currencyCode: string;
  amount: string;
};

type TransferFormState = {
  sourceAccountId: string;
  targetAccountId: string;
  currencyCode: string;
  concept: string;
  amount: string;
};

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
    <div className="text-xs leading-5 text-muted-foreground">
      <span>
        {texts.dashboard.treasury.receipt_helper_example} {receiptFormats[0]?.example ?? DEFAULT_RECEIPT_PATTERN}.{" "}
        {texts.dashboard.treasury.receipt_helper_available_from} {DEFAULT_RECEIPT_MIN_LABEL}
      </span>
    </div>
  );
}

function sanitizeAmountInput(value: string) {
  const normalizedValue = value.replace(/[^\d,]/g, "");
  const [integerPart, ...decimalParts] = normalizedValue.split(",");

  if (decimalParts.length === 0) {
    return integerPart;
  }

  return `${integerPart},${decimalParts.join("")}`;
}

function getDefaultCurrencyCode(account: TreasuryAccount | undefined, currencies: TreasuryCurrencyConfig[]) {
  if (!account) {
    return "";
  }

  const availableCurrencyCodes = currencies
    .map((currency) => currency.currencyCode)
    .filter((currencyCode) => account.currencies.includes(currencyCode));

  if (availableCurrencyCodes.length === 0) {
    return "";
  }

  if (availableCurrencyCodes.length > 1 && availableCurrencyCodes.includes("ARS")) {
    return "ARS";
  }

  return availableCurrencyCodes[0] ?? "";
}

function getRequiredLabel(label: string) {
  return `${label}${texts.dashboard.treasury.required_suffix}`;
}

function MovementFormFields({
  accounts,
  categories,
  activities,
  calendarEvents,
  currencies,
  movementTypes,
  receiptFormats,
  formState,
  onChange,
  showMovementDateInput = false
}: {
  accounts: TreasuryAccount[];
  categories: TreasuryCategory[];
  activities: ClubActivity[];
  calendarEvents?: ClubCalendarEvent[];
  currencies: TreasuryCurrencyConfig[];
  movementTypes: TreasuryMovementType[];
  receiptFormats: ReceiptFormat[];
  formState: MovementFormState;
  onChange: (patch: Partial<MovementFormState>) => void;
  showMovementDateInput?: boolean;
}) {
  const availableCurrencies = useMemo(() => {
    const selectedAccount = accounts.find((account) => account.id === formState.accountId);

    if (!selectedAccount) {
      return [];
    }

    return currencies.filter((currency) => selectedAccount.currencies.includes(currency.currencyCode));
  }, [accounts, currencies, formState.accountId]);

  return (
    <>
      {showMovementDateInput ? (
        <FormField>
          <span className="font-medium">{texts.dashboard.treasury.date_label}</span>
          <input
            type="date"
            name="movement_date"
            value={formState.movementDate ?? ""}
            onChange={(event) => onChange({ movementDate: event.target.value })}
            className={CONTROL_CLASSNAME}
          />
        </FormField>
      ) : null}

      <FormField>
        <span className="font-medium">{getRequiredLabel(texts.dashboard.treasury.account_label)}</span>
        <select
          name="account_id"
          value={formState.accountId}
          onChange={(event) => onChange({ accountId: event.target.value })}
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
        <span className="font-medium">{getRequiredLabel(texts.dashboard.treasury.movement_type_label)}</span>
        <select
          name="movement_type"
          value={formState.movementType}
          onChange={(event) => onChange({ movementType: event.target.value })}
          className={CONTROL_CLASSNAME}
        >
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
        <span className="font-medium">{getRequiredLabel(texts.dashboard.treasury.category_label)}</span>
        <select
          name="category_id"
          value={formState.categoryId}
          onChange={(event) => onChange({ categoryId: event.target.value })}
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
            value={formState.activityId}
            onChange={(event) => onChange({ activityId: event.target.value })}
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
          value={formState.receiptNumber}
          onChange={(event) => onChange({ receiptNumber: event.target.value })}
          className={CONTROL_CLASSNAME}
        />
        <ReceiptHelper receiptFormats={receiptFormats} />
      </FormField>

      {calendarEvents ? (
        <FormField fullWidth>
          <span className="font-medium">{texts.dashboard.treasury.calendar_label}</span>
          <select
            name="calendar_event_id"
            value={formState.calendarEventId ?? ""}
            onChange={(event) => onChange({ calendarEventId: event.target.value })}
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
      ) : null}

      <FormField fullWidth>
        <span className="font-medium">{getRequiredLabel(texts.dashboard.treasury.concept_label)}</span>
        <input
          type="text"
          name="concept"
          value={formState.concept}
          onChange={(event) => onChange({ concept: event.target.value })}
          className={CONTROL_CLASSNAME}
        />
      </FormField>

      <FormField>
        <span className="font-medium">{getRequiredLabel(texts.dashboard.treasury.currency_label)}</span>
        <select
          name="currency_code"
          value={formState.currencyCode}
          onChange={(event) => onChange({ currencyCode: event.target.value })}
          className={CONTROL_CLASSNAME}
          disabled={availableCurrencies.length === 0}
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
        <span className="font-medium">{getRequiredLabel(texts.dashboard.treasury.amount_label)}</span>
        <input
          type="text"
          name="amount"
          inputMode="decimal"
          value={formState.amount}
          onChange={(event) => onChange({ amount: sanitizeAmountInput(event.target.value) })}
          onKeyDown={(event) => {
            if (event.key === "-") {
              event.preventDefault();
            }
          }}
          className={CONTROL_CLASSNAME}
        />
      </FormField>
    </>
  );
}

function isMovementFormValid(formState: MovementFormState) {
  return Boolean(
    formState.accountId &&
      formState.movementType &&
      formState.categoryId &&
      formState.concept.trim() &&
      formState.currencyCode &&
      formState.amount.trim()
  );
}

function buildEmptySecretariaMovementFormState(): MovementFormState {
  return {
    accountId: "",
    movementType: "",
    categoryId: "",
    activityId: "",
    receiptNumber: "",
    calendarEventId: "",
    concept: "",
    currencyCode: "",
    amount: ""
  };
}

function buildEditMovementFormState(movement: TreasuryDashboardMovement): MovementFormState {
  return {
    movementDate: movement.movementDate,
    accountId: movement.accountId,
    movementType: movement.movementType,
    categoryId: movement.categoryId,
    activityId: movement.activityId ?? "",
    receiptNumber: movement.receiptNumber ?? "",
    calendarEventId: movement.calendarEventId ?? "",
    concept: movement.concept,
    currencyCode: movement.currencyCode,
    amount: formatLocalizedAmount(movement.amount)
  };
}

function buildEmptyTransferFormState(): TransferFormState {
  return {
    sourceAccountId: "",
    targetAccountId: "",
    currencyCode: "",
    concept: "",
    amount: ""
  };
}

function isTransferFormValid(formState: TransferFormState, targetAccountCurrencyError: string | null) {
  return Boolean(
    formState.sourceAccountId &&
      formState.targetAccountId &&
      formState.currencyCode &&
      formState.concept.trim() &&
      formState.amount.trim() &&
      !targetAccountCurrencyError
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
  const [formState, setFormState] = useState<MovementFormState>(buildEmptySecretariaMovementFormState);

  useEffect(() => {
    const selectedAccount = accounts.find((account) => account.id === formState.accountId);
    const nextCurrencyCode = getDefaultCurrencyCode(selectedAccount, currencies);

    if (!selectedAccount && formState.currencyCode) {
      setFormState((current) => ({ ...current, currencyCode: "" }));
      return;
    }

    if (selectedAccount && nextCurrencyCode && !selectedAccount.currencies.includes(formState.currencyCode)) {
      setFormState((current) => ({ ...current, currencyCode: nextCurrencyCode }));
    }
  }, [accounts, currencies, formState.accountId, formState.currencyCode]);

  return (
    <form
      action={async (formData) => {
        await submitAction(formData);
      }}
      className="grid gap-4"
      onReset={() => setFormState(buildEmptySecretariaMovementFormState())}
    >
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
        <MovementFormFields
          accounts={accounts}
          categories={categories}
          activities={activities}
          calendarEvents={calendarEvents}
          currencies={currencies}
          movementTypes={movementTypes}
          receiptFormats={receiptFormats}
          formState={formState}
          onChange={(patch) => setFormState((current) => ({ ...current, ...patch }))}
        />

        <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
          <PendingSubmitButton
            idleLabel={submitLabel}
            pendingLabel={pendingLabel}
            disabled={!isMovementFormValid(formState)}
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

export function SecretariaMovementEditForm({
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
  movement
}: BaseMovementFormProps & {
  calendarEvents?: ClubCalendarEvent[];
  movement: TreasuryDashboardMovement;
}) {
  const [formState, setFormState] = useState<MovementFormState>(() => buildEditMovementFormState(movement));

  useEffect(() => {
    setFormState(buildEditMovementFormState(movement));
  }, [movement]);

  useEffect(() => {
    const selectedAccount = accounts.find((account) => account.id === formState.accountId);
    const nextCurrencyCode = getDefaultCurrencyCode(selectedAccount, currencies);

    if (!selectedAccount && formState.currencyCode) {
      setFormState((current) => ({ ...current, currencyCode: "" }));
      return;
    }

    if (selectedAccount && nextCurrencyCode && !selectedAccount.currencies.includes(formState.currencyCode)) {
      setFormState((current) => ({ ...current, currencyCode: nextCurrencyCode }));
    }
  }, [accounts, currencies, formState.accountId, formState.currencyCode]);

  return (
    <form
      action={async (formData) => {
        await submitAction(formData);
      }}
      className="grid gap-4"
    >
      <input type="hidden" name="movement_id" value={movement.movementId} />

      <PendingFieldset className={FORM_GRID_CLASSNAME}>
        <FormField>
          <span className="font-medium">{texts.dashboard.treasury.movement_id_label}</span>
          <input type="text" value={movement.movementDisplayId} disabled className={DISABLED_CONTROL_CLASSNAME} />
        </FormField>

        <FormField>
          <span className="font-medium">{texts.dashboard.treasury.date_label}</span>
          <input type="text" value={movement.movementDate} disabled className={DISABLED_CONTROL_CLASSNAME} />
        </FormField>

        <MovementFormFields
          accounts={accounts}
          categories={categories}
          activities={activities}
          calendarEvents={calendarEvents}
          currencies={currencies}
          movementTypes={movementTypes}
          receiptFormats={receiptFormats}
          formState={formState}
          onChange={(patch) => setFormState((current) => ({ ...current, ...patch }))}
        />

        {movement.transferReference ? (
          <FormField fullWidth>
            <span className="font-medium">{texts.dashboard.treasury.detail_transfer_label}</span>
            <input type="text" value={movement.transferReference} disabled className={DISABLED_CONTROL_CLASSNAME} />
          </FormField>
        ) : null}

        {movement.fxOperationReference ? (
          <FormField fullWidth>
            <span className="font-medium">{texts.dashboard.treasury.detail_fx_label}</span>
            <input type="text" value={movement.fxOperationReference} disabled className={DISABLED_CONTROL_CLASSNAME} />
          </FormField>
        ) : null}

        <div className="sm:col-span-2">
          <PendingSubmitButton
            idleLabel={submitLabel}
            pendingLabel={pendingLabel}
            disabled={!isMovementFormValid(formState)}
            className="min-h-11 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
          />
        </div>
      </PendingFieldset>
    </form>
  );
}

export function AccountTransferForm({
  sourceAccounts,
  targetAccounts,
  currencies,
  submitAction,
  sessionDate
}: {
  sourceAccounts: TreasuryAccount[];
  targetAccounts: TreasuryAccount[];
  currencies: TreasuryCurrencyConfig[];
  submitAction: (formData: FormData) => Promise<void>;
  sessionDate: string;
}) {
  const [formState, setFormState] = useState<TransferFormState>(buildEmptyTransferFormState);

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

  const handleReset = () => setFormState(buildEmptyTransferFormState());

  return (
    <form
      action={async (formData) => {
        await submitAction(formData);
      }}
      className="grid gap-4"
      onReset={handleReset}
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        if (!isTransferFormValid(formState, targetAccountCurrencyError)) {
          event.preventDefault();
        }
      }}
    >
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
          <span className="font-medium">{getRequiredLabel(texts.dashboard.treasury.transfer_source_account_label)}</span>
          <select
            name="source_account_id"
            value={formState.sourceAccountId}
            onChange={(event) => setFormState((current) => ({ ...current, sourceAccountId: event.target.value }))}
            className={CONTROL_CLASSNAME}
          >
            <option value="" disabled>
              {texts.dashboard.treasury.transfer_source_account_placeholder}
            </option>
            {sourceAccounts.map((account) => (
              <option key={`source-${account.id}`} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </FormField>

        <FormField>
          <span className="font-medium">{getRequiredLabel(texts.dashboard.treasury.transfer_target_account_label)}</span>
          <select
            name="target_account_id"
            value={formState.targetAccountId}
            onChange={(event) => setFormState((current) => ({ ...current, targetAccountId: event.target.value }))}
            aria-describedby={targetAccountCurrencyError ? "transfer-target-account-error" : undefined}
            aria-invalid={targetAccountCurrencyError ? "true" : undefined}
            className={cn(CONTROL_CLASSNAME, targetAccountCurrencyError && "border-destructive/25")}
          >
            <option value="" disabled>
              {texts.dashboard.treasury.transfer_target_account_placeholder}
            </option>
            {targetAccounts.map((account) => (
              <option key={`target-${account.id}`} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          {targetAccountCurrencyError ? (
            <span
              id="transfer-target-account-error"
              aria-live="polite"
              className="text-xs leading-5 text-destructive"
            >
              {targetAccountCurrencyError}
            </span>
          ) : null}
        </FormField>

        <FormField>
          <span className="font-medium">{getRequiredLabel(texts.dashboard.treasury.currency_label)}</span>
          <select
            name="currency_code"
            value={formState.currencyCode}
            onChange={(event) => setFormState((current) => ({ ...current, currencyCode: event.target.value }))}
            disabled={availableCurrencies.length === 0}
            className={cn(CONTROL_CLASSNAME, "disabled:text-muted-foreground")}
          >
            <option value="" disabled>
              {texts.dashboard.treasury.currency_placeholder}
            </option>
            {availableCurrencies.map((currency) => (
              <option key={`transfer-${currency.currencyCode}`} value={currency.currencyCode}>
                {currency.currencyCode}
              </option>
            ))}
          </select>
        </FormField>

        <FormField fullWidth>
          <span className="font-medium">{getRequiredLabel(texts.dashboard.treasury.concept_label)}</span>
          <input
            type="text"
            name="concept"
            value={formState.concept}
            onChange={(event) => setFormState((current) => ({ ...current, concept: event.target.value }))}
            className={CONTROL_CLASSNAME}
          />
        </FormField>

        <FormField>
          <span className="font-medium">{getRequiredLabel(texts.dashboard.treasury.amount_label)}</span>
          <input
            type="text"
            name="amount"
            inputMode="decimal"
            value={formState.amount}
            onChange={(event) => setFormState((current) => ({ ...current, amount: sanitizeAmountInput(event.target.value) }))}
            onKeyDown={(event) => {
              if (event.key === "-") {
                event.preventDefault();
              }
            }}
            className={CONTROL_CLASSNAME}
          />
        </FormField>

        <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
          <PendingSubmitButton
            idleLabel={texts.dashboard.treasury.transfer_create_cta}
            pendingLabel={texts.dashboard.treasury.transfer_create_loading}
            disabled={!isTransferFormValid(formState, targetAccountCurrencyError)}
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
  const [formState, setFormState] = useState<MovementFormState>({
    movementDate: sessionDate,
    accountId: "",
    movementType: "",
    categoryId: "",
    activityId: "",
    receiptNumber: "",
    concept: "",
    currencyCode: "",
    amount: ""
  });

  useEffect(() => {
    const selectedAccount = accounts.find((account) => account.id === formState.accountId);
    const nextCurrencyCode = getDefaultCurrencyCode(selectedAccount, currencies);

    if (!selectedAccount && formState.currencyCode) {
      setFormState((current) => ({ ...current, currencyCode: "" }));
      return;
    }

    if (selectedAccount && nextCurrencyCode && !selectedAccount.currencies.includes(formState.currencyCode)) {
      setFormState((current) => ({ ...current, currencyCode: nextCurrencyCode }));
    }
  }, [accounts, currencies, formState.accountId, formState.currencyCode]);

  const handleReset = () =>
    setFormState({
      movementDate: sessionDate,
      accountId: "",
      movementType: "",
      categoryId: "",
      activityId: "",
      receiptNumber: "",
      concept: "",
      currencyCode: "",
      amount: ""
    });

  return (
    <form
      action={async (formData) => {
        await submitAction(formData);
      }}
      className="grid gap-4"
      onReset={handleReset}
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        if (!isMovementFormValid(formState)) {
          event.preventDefault();
          return;
        }

        window.setTimeout(handleReset, 0);
      }}
    >
      <PendingFieldset className={FORM_GRID_CLASSNAME}>
        <MovementFormFields
          accounts={accounts}
          categories={categories}
          activities={activities}
          currencies={currencies}
          movementTypes={movementTypes}
          receiptFormats={receiptFormats}
          formState={formState}
          onChange={(patch) => setFormState((current) => ({ ...current, ...patch }))}
          showMovementDateInput
        />

        <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2">
          <PendingSubmitButton
            idleLabel={submitLabel}
            pendingLabel={pendingLabel}
            disabled={!isMovementFormValid(formState)}
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
