"use client";

import { useEffect, useMemo } from "react";

import {
  FIELD_LABEL_CLASSNAME,
  FormInput,
  FormSelect,
} from "@/components/ui/modal-form";
import type {
  ClubActivity,
  ReceiptFormat,
  TreasuryAccount,
  TreasuryCategory,
  TreasuryCurrencyConfig,
  TreasuryMovementType
} from "@/lib/domain/access";
import { texts } from "@/lib/texts";

import {
  LocalFormField,
  type MovementFormState,
  type OperationalFormCopy,
  getRequiredLabel,
  normalizeAmountInputOnBlur,
  normalizeAmountInputOnFocus,
  sanitizeAmountInput,
} from "./_shared";

export function MovementFormFields({
  accounts,
  categories,
  activities,
  currencies,
  movementTypes,
  receiptFormats,
  formState,
  onChange,
  showMovementDateInput = false,
  copy = texts.dashboard.treasury
}: {
  accounts: TreasuryAccount[];
  categories: TreasuryCategory[];
  activities: ClubActivity[];
  currencies: TreasuryCurrencyConfig[];
  movementTypes: TreasuryMovementType[];
  receiptFormats: ReceiptFormat[];
  formState: MovementFormState;
  onChange: (patch: Partial<MovementFormState>) => void;
  showMovementDateInput?: boolean;
  copy?: OperationalFormCopy;
}) {
  const availableCurrencies = useMemo(() => {
    const selectedAccount = accounts.find((account) => account.id === formState.accountId);

    if (!selectedAccount) {
      return [];
    }

    return currencies.filter((currency) => selectedAccount.currencies.includes(currency.currencyCode));
  }, [accounts, currencies, formState.accountId]);

  const availableCategories = useMemo(
    () =>
      categories.filter((category) => {
        if (category.isLegacy || category.movementType === "saldo") {
          return false;
        }

        if (!formState.movementType) {
          return true;
        }

        return category.movementType === formState.movementType;
      }),
    [categories, formState.movementType]
  );

  useEffect(() => {
    if (!formState.categoryId) {
      return;
    }

    const isSelectedCategoryAvailable = availableCategories.some(
      (category) => category.id === formState.categoryId
    );

    if (!isSelectedCategoryAvailable) {
      onChange({ categoryId: "" });
    }
  }, [availableCategories, formState.categoryId, onChange]);

  return (
    <>
      {showMovementDateInput ? (
        <LocalFormField>
          <span className={FIELD_LABEL_CLASSNAME}>{copy.date_label}</span>
          <FormInput
            type="date"
            name="movement_date"
            value={formState.movementDate ?? ""}
            onChange={(event) => onChange({ movementDate: event.target.value })}
          />
        </LocalFormField>
      ) : null}

      <LocalFormField>
        <span className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.account_label, copy)}</span>
        <FormSelect
          name="account_id"
          value={formState.accountId}
          onChange={(event) => onChange({ accountId: event.target.value })}
        >
          <option value="" disabled>
            {copy.account_placeholder}
          </option>
          {accounts.map((account) => (
            <option key={account.id} value={account.id}>
              {account.name}
            </option>
          ))}
        </FormSelect>
      </LocalFormField>

      <LocalFormField>
        <span className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.movement_type_label, copy)}</span>
        <FormSelect
          name="movement_type"
          value={formState.movementType}
          onChange={(event) => onChange({ movementType: event.target.value })}
        >
          <option value="" disabled>
            {copy.movement_type_placeholder}
          </option>
          {movementTypes.map((movementType) => (
            <option key={movementType} value={movementType}>
              {copy.movement_types[movementType]}
            </option>
          ))}
        </FormSelect>
      </LocalFormField>

      <LocalFormField>
        <span className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.category_label, copy)}</span>
        <FormSelect
          name="category_id"
          value={formState.categoryId}
          disabled={!formState.movementType}
          onChange={(event) => onChange({ categoryId: event.target.value })}
        >
          <option value="" disabled>
            {copy.category_placeholder}
          </option>
          {availableCategories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.subCategoryName}
            </option>
          ))}
        </FormSelect>
      </LocalFormField>

      {formState.categoryId ? (
        <LocalFormField>
          <span className={FIELD_LABEL_CLASSNAME}>{copy.parent_category_label}</span>
          <FormInput
            type="text"
            value={availableCategories.find((c) => c.id === formState.categoryId)?.parentCategory ?? ""}
            disabled
            readOnly
          />
        </LocalFormField>
      ) : null}

      {activities.length > 0 ? (
        <LocalFormField>
          <span className={FIELD_LABEL_CLASSNAME}>{copy.activity_label}</span>
          <FormSelect
            name="activity_id"
            value={formState.activityId}
            onChange={(event) => onChange({ activityId: event.target.value })}
          >
            <option value="">{copy.activity_placeholder}</option>
            {activities.map((activity) => (
              <option key={activity.id} value={activity.id}>
                {activity.name}
              </option>
            ))}
          </FormSelect>
        </LocalFormField>
      ) : null}

      {receiptFormats.length > 0 ? (
        <LocalFormField fullWidth>
          <span className={FIELD_LABEL_CLASSNAME}>{receiptFormats[0]?.name ?? copy.receipt_label}</span>
          <FormInput
            type="text"
            name="receipt_number"
            value={formState.receiptNumber}
            inputMode={receiptFormats[0]?.validationType === "numeric" ? "numeric" : "text"}
            pattern={receiptFormats[0]?.validationType === "numeric" ? "[0-9]*" : undefined}
            onChange={(event) => {
              const value = event.target.value;
              if (receiptFormats[0]?.validationType === "numeric") {
                if (value === "" || /^[0-9]+$/.test(value)) {
                  onChange({ receiptNumber: value });
                }
              } else {
                if (value === "" || /^[a-zA-Z0-9]*$/.test(value)) {
                  onChange({ receiptNumber: value });
                }
              }
            }}
          />
        </LocalFormField>
      ) : null}

      <LocalFormField fullWidth>
        <span className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.concept_label, copy)}</span>
        <FormInput
          type="text"
          name="concept"
          value={formState.concept}
          onChange={(event) => onChange({ concept: event.target.value })}
        />
      </LocalFormField>

      <LocalFormField>
        <span className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.currency_label, copy)}</span>
        <FormSelect
          name="currency_code"
          value={formState.currencyCode}
          onChange={(event) => onChange({ currencyCode: event.target.value })}
          disabled={availableCurrencies.length === 0}
        >
          <option value="" disabled>
            {copy.currency_placeholder}
          </option>
          {availableCurrencies.map((currency) => (
            <option key={currency.currencyCode} value={currency.currencyCode}>
              {currency.currencyCode}
            </option>
          ))}
        </FormSelect>
      </LocalFormField>

      <LocalFormField>
        <span className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.amount_label, copy)}</span>
        <FormInput
          type="text"
          name="amount"
          inputMode="decimal"
          value={formState.amount}
          onChange={(event) => onChange({ amount: sanitizeAmountInput(event.target.value) })}
          onBlur={(event) => onChange({ amount: normalizeAmountInputOnBlur(event.target.value) })}
          onFocus={(event) => onChange({ amount: normalizeAmountInputOnFocus(event.target.value) })}
          onKeyDown={(event) => {
            if (event.key === "-") {
              event.preventDefault();
            }
          }}
        />
      </LocalFormField>
    </>
  );
}
