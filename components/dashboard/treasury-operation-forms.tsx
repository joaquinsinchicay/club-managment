"use client";

import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from "react";

import {
  formatLocalizedAmount,
  formatLocalizedAmountInputOnBlur,
  formatLocalizedAmountInputOnFocus,
  parseLocalizedAmount,
  sanitizeLocalizedAmountInput
} from "@/lib/amounts";
import { ModalFooter } from "@/components/ui/modal-footer";
import {
  CONTROL_CLASSNAME,
  FIELD_CLASSNAME,
  FIELD_LABEL_CLASSNAME,
  FORM_GRID_CLASSNAME,
  FULL_WIDTH_FIELD_CLASSNAME,
  FormBanner,
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/ui/modal-form";
import { PendingFieldset } from "@/components/ui/pending-form";
import type {
  ClubActivity,
  ConsolidationTransferEdit,
  ReceiptFormat,
  TreasuryAccount,
  TreasuryCategory,
  TreasuryCurrencyConfig,
  TreasuryMovementType
} from "@/lib/domain/access";
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
  // US-53: optional multiselect of active cost centers. Only passed from
  // contexts where the user has role `tesoreria`; Secretaría never receives
  // these options. When present, the form submits `cost_center_ids[]` and
  // a `cost_centers_present` flag so the action knows to sync links.
  costCenters?: Array<{
    id: string;
    name: string;
    type: string;
    currencyCode: string;
    status: "activo" | "inactivo";
  }>;
  initialCostCenterIds?: string[];
  /**
   * Lista de contratos RRHH para el selector "Contrato" del movimiento.
   * Cuando se omite, el campo no se renderiza. Cuando se pasa array vacio,
   * el field aparece deshabilitado con "No hay contratos".
   */
  staffContracts?: Array<{
    contractId: string;
    staffMemberId: string;
    label: string;
  }>;
};

type OperationalFormCopy = {
  receipt_helper_example: string;
  receipt_helper_available_from: string;
  required_suffix: string;
  date_label: string;
  account_label: string;
  account_placeholder: string;
  movement_type_label: string;
  movement_type_placeholder: string;
  category_label: string;
  category_placeholder: string;
  parent_category_label: string;
  activity_label: string;
  activity_placeholder: string;
  receipt_label: string;
  concept_label: string;
  currency_label: string;
  currency_placeholder: string;
  amount_label: string;
  reset_cta: string;
  movement_id_label: string;
  detail_transfer_label: string;
  detail_fx_label: string;
  transfer_source_account_label?: string;
  transfer_source_account_placeholder?: string;
  transfer_target_account_label?: string;
  transfer_target_account_placeholder?: string;
  transfer_target_account_currency_error?: string;
  transfer_create_cta?: string;
  transfer_create_loading?: string;
  fx_source_account_label: string;
  fx_source_account_placeholder: string;
  fx_source_currency_label: string;
  fx_source_currency_placeholder: string;
  fx_source_amount_label: string;
  fx_target_account_label: string;
  fx_target_account_placeholder: string;
  fx_target_currency_label: string;
  fx_target_currency_placeholder: string;
  fx_target_amount_label: string;
  fx_create_cta: string;
  fx_create_loading: string;
  movement_types: Record<string, string>;
};

// Variante de CONTROL_CLASSNAME para inputs/selects deshabilitados.
// No coincide con FORM_READONLY_CLASSNAME (que es inline-flex para <div>),
// porque acá se aplica directamente a controles de form.
const DISABLED_CONTROL_CLASSNAME = "min-h-11 w-full rounded-card border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground";

type MovementFormState = {
  movementDate?: string;
  accountId: string;
  movementType: string;
  categoryId: string;
  activityId: string;
  receiptNumber: string;
  concept: string;
  currencyCode: string;
  amount: string;
  /** FK opcional a staff_contracts(id). Vacio = "Sin asignar". */
  staffContractId: string;
};

type TransferFormState = {
  sourceAccountId: string;
  targetAccountId: string;
  currencyCode: string;
  concept: string;
  amount: string;
};

type EditableMovement = {
  movementId: string;
  movementDisplayId: string;
  movementDate: string;
  accountId: string;
  movementType: TreasuryMovementType;
  categoryId: string;
  activityId: string | null;
  receiptNumber: string | null;
  transferReference?: string | null;
  fxOperationReference?: string | null;
  concept: string;
  currencyCode: string;
  amount: number;
  staffContractId?: string | null;
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


function sanitizeAmountInput(value: string) {
  return sanitizeLocalizedAmountInput(value);
}

function normalizeAmountInputOnBlur(value: string) {
  return formatLocalizedAmountInputOnBlur(value);
}

function normalizeAmountInputOnFocus(value: string) {
  return formatLocalizedAmountInputOnFocus(value);
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

function getRequiredLabel(label: string, copy: OperationalFormCopy) {
  return `${label}${copy.required_suffix}`;
}

function MovementFormFields({
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
        <FormField>
          <span className={FIELD_LABEL_CLASSNAME}>{copy.date_label}</span>
          <FormInput
            type="date"
            name="movement_date"
            value={formState.movementDate ?? ""}
            onChange={(event) => onChange({ movementDate: event.target.value })}
          />
        </FormField>
      ) : null}

      <FormField>
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
      </FormField>

      <FormField>
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
      </FormField>

      <FormField>
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
      </FormField>

      {formState.categoryId ? (
        <FormField>
          <span className={FIELD_LABEL_CLASSNAME}>{copy.parent_category_label}</span>
          <FormInput
            type="text"
            value={availableCategories.find((c) => c.id === formState.categoryId)?.parentCategory ?? ""}
            disabled
            readOnly
          />
        </FormField>
      ) : null}

      {activities.length > 0 ? (
        <FormField>
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
        </FormField>
      ) : null}

      {receiptFormats.length > 0 ? (
        <FormField fullWidth>
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
        </FormField>
      ) : null}

      <FormField fullWidth>
        <span className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.concept_label, copy)}</span>
        <FormInput
          type="text"
          name="concept"
          value={formState.concept}
          onChange={(event) => onChange({ concept: event.target.value })}
        />
      </FormField>

      <FormField>
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
      </FormField>

      <FormField>
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
    concept: "",
    currencyCode: "",
    amount: "",
    staffContractId: ""
  };
}

function buildEditMovementFormState(movement: EditableMovement): MovementFormState {
  return {
    movementDate: movement.movementDate,
    accountId: movement.accountId,
    movementType: movement.movementType,
    categoryId: movement.categoryId,
    activityId: movement.activityId ?? "",
    receiptNumber: movement.receiptNumber ?? "",
    concept: movement.concept,
    currencyCode: movement.currencyCode,
    amount: formatLocalizedAmount(movement.amount),
    staffContractId: movement.staffContractId ?? ""
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

function buildEditTransferFormState(transfer: ConsolidationTransferEdit): TransferFormState {
  return {
    sourceAccountId: transfer.sourceAccountId,
    targetAccountId: transfer.targetAccountId,
    currencyCode: transfer.currencyCode,
    concept: transfer.concept,
    amount: formatLocalizedAmount(transfer.amount)
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

function formatSessionDateLong(sessionDate: string): string {
  const date = new Date(`${sessionDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return sessionDate;
  const formatted = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(date);
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

/* ──────────────────────────────────────────────────────────────────────────
 * StaffContractSelect — select simple para vincular un movimiento a un
 * contrato RRHH (carga historica + futuro flow de pagos manuales).
 *
 * Renderiza un <select> nativo con la lista de contratos del club + opcion
 * "Sin asignar". Hidden flag `staff_contract_present` indica que el form
 * incluye el campo (asi la action server-side hace el sync).
 * ────────────────────────────────────────────────────────────────────────── */

type StaffContractOption = {
  contractId: string;
  staffMemberId: string;
  label: string;
};

function StaffContractField({
  options,
  value,
  onChange,
  label,
  placeholder,
  emptyOptionsLabel
}: {
  options: StaffContractOption[];
  value: string;
  onChange: (next: string) => void;
  label: string;
  placeholder: string;
  emptyOptionsLabel: string;
}) {
  const isEmpty = options.length === 0;
  // Si la opcion seleccionada no esta en la lista (ej. contrato historico
  // finalizado que no se devolvio por filtro), preservala via hidden input
  // para no perder el dato al guardar.
  const valueInOptions = options.some((o) => o.contractId === value);
  return (
    <div className="grid gap-2">
      <p className={FIELD_LABEL_CLASSNAME}>{label}</p>
      <input type="hidden" name="staff_contract_present" value="1" />
      {!valueInOptions && value ? (
        <input type="hidden" name="staff_contract_id" value={value} />
      ) : null}
      <FormSelect
        name={valueInOptions || !value ? "staff_contract_id" : undefined}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={isEmpty}
      >
        <option value="">{isEmpty ? emptyOptionsLabel : placeholder}</option>
        {options.map((option) => (
          <option key={option.contractId} value={option.contractId}>
            {option.label}
          </option>
        ))}
        {!valueInOptions && value ? (
          <option value={value} disabled>
            {value}
          </option>
        ) : null}
      </FormSelect>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 * CostCenterMultiSelect — dropdown con checkboxes interno (US-53).
 *
 * Reemplaza la lista plana de checkboxes que se renderizaba antes en los
 * forms de creacion / edicion de movimientos por un trigger compacto que
 * abre un panel desplegable. Sigue serializando como `cost_center_ids`
 * (multiples hidden inputs) + flag `cost_centers_present` para que la
 * action server-side sincronice los links sin asumirlos por defecto.
 * ────────────────────────────────────────────────────────────────────────── */

type CostCenterOption = {
  id: string;
  name: string;
  type: string;
  currencyCode: string;
  status: "activo" | "inactivo";
};

type CostCenterMultiSelectProps = {
  options: CostCenterOption[];
  selectedIds: string[];
  onChange: (next: string[]) => void;
  formStateCurrency: string;
  emptyOptionsLabel: string;
  placeholder: string;
  selectedSummary: (count: number) => string;
  currencyMismatchTitle: string;
};

function CostCenterMultiSelect({
  options,
  selectedIds,
  onChange,
  formStateCurrency,
  emptyOptionsLabel,
  placeholder,
  selectedSummary,
  currencyMismatchTitle
}: CostCenterMultiSelectProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!open) return;
    function onPointer(event: PointerEvent) {
      if (!wrapperRef.current) return;
      if (!wrapperRef.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function toggle(id: string) {
    onChange(selectedIds.includes(id) ? selectedIds.filter((x) => x !== id) : [...selectedIds, id]);
  }

  const selectedCount = selectedIds.length;
  const triggerLabel = selectedCount === 0 ? placeholder : selectedSummary(selectedCount);
  const isPlaceholder = selectedCount === 0;

  return (
    <div ref={wrapperRef} className="relative">
      {/* Hidden flag + multiples hidden inputs para FormData (compat backend). */}
      <input type="hidden" name="cost_centers_present" value="1" />
      {selectedIds.map((id) => (
        <input key={id} type="hidden" name="cost_center_ids" value={id} />
      ))}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        disabled={options.length === 0}
        className={cn(
          "min-h-11 w-full rounded-card border border-border bg-card px-4 py-3 text-left text-sm focus:outline-none focus:ring-2 focus:ring-foreground/10",
          "flex items-center justify-between gap-2",
          isPlaceholder ? "text-muted-foreground" : "text-foreground",
          options.length === 0 && "cursor-not-allowed opacity-60"
        )}
      >
        <span className="truncate">{options.length === 0 ? emptyOptionsLabel : triggerLabel}</span>
        <svg
          className={cn("size-4 shrink-0 text-muted-foreground transition", open && "rotate-180")}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && options.length > 0 ? (
        <div
          role="listbox"
          aria-multiselectable="true"
          className="absolute left-0 right-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-card border border-border bg-card p-1 shadow-lg"
        >
          {options.map((cc) => {
            const checked = selectedIds.includes(cc.id);
            const isInactive = cc.status === "inactivo";
            // Inactivos no seleccionados: no se pueden tildar (impedir nuevos
            // links a CCs cerrados). Inactivos ya seleccionados se pueden
            // destildar para desvincular si el usuario quiere.
            const lockNew = isInactive && !checked;
            const currencyMismatch =
              checked && Boolean(formStateCurrency) && cc.currencyCode !== formStateCurrency;
            return (
              <label
                key={cc.id}
                role="option"
                aria-selected={checked}
                aria-disabled={lockNew}
                title={lockNew ? "CC inactivo — no se puede agregar" : undefined}
                className={cn(
                  "flex min-h-10 items-center gap-3 rounded-btn px-3 py-2 text-sm text-foreground transition",
                  lockNew ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-secondary/60"
                )}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  disabled={lockNew}
                  onChange={() => toggle(cc.id)}
                  className="size-4 rounded border-border text-foreground focus:ring-foreground disabled:cursor-not-allowed"
                />
                <span className="flex-1 truncate font-medium">{cc.name}</span>
                {isInactive ? (
                  <span className="rounded-xs bg-ds-slate-100 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-eyebrow text-muted-foreground">
                    Inactivo
                  </span>
                ) : null}
                <span className="rounded-xs bg-ds-slate-100 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-eyebrow text-ds-slate-700">
                  {cc.type}
                </span>
                <span className="text-xs font-semibold uppercase tracking-eyebrow text-muted-foreground">
                  {cc.currencyCode}
                </span>
                {currencyMismatch ? (
                  <span
                    className="rounded-xs bg-ds-amber-050 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-eyebrow text-ds-amber-700"
                    title={currencyMismatchTitle}
                  >
                    ⚠
                  </span>
                ) : null}
              </label>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function SecretariaMovementForm({
  accounts,
  categories,
  activities,
  currencies,
  movementTypes,
  receiptFormats,
  submitLabel,
  pendingLabel,
  submitAction,
  sessionDate,
  onCancel,
  copy = texts.dashboard.treasury,
  staffContracts
}: BaseMovementFormProps & {
  sessionDate: string;
  onCancel: () => void;
  copy?: OperationalFormCopy;
}) {
  const [formState, setFormState] = useState<MovementFormState>(buildEmptySecretariaMovementFormState);

  const availableCurrencies = useMemo(() => {
    const selectedAccount = accounts.find((a) => a.id === formState.accountId);
    if (!selectedAccount) return [];
    return currencies.filter((c) => selectedAccount.currencies.includes(c.currencyCode));
  }, [accounts, currencies, formState.accountId]);

  const availableCategories = useMemo(
    () =>
      categories.filter((c) => {
        if (c.isLegacy || c.movementType === "saldo") return false;
        if (!formState.movementType) return true;
        return c.movementType === formState.movementType;
      }),
    [categories, formState.movementType]
  );

  useEffect(() => {
    if (!formState.categoryId) return;
    if (!availableCategories.some((c) => c.id === formState.categoryId)) {
      setFormState((s) => ({ ...s, categoryId: "" }));
    }
  }, [availableCategories, formState.categoryId]);

  useEffect(() => {
    const selectedAccount = accounts.find((a) => a.id === formState.accountId);
    const nextCurrencyCode = getDefaultCurrencyCode(selectedAccount, currencies);
    if (!selectedAccount && formState.currencyCode) {
      setFormState((s) => ({ ...s, currencyCode: "" }));
      return;
    }
    if (selectedAccount && nextCurrencyCode && !selectedAccount.currencies.includes(formState.currencyCode)) {
      setFormState((s) => ({ ...s, currencyCode: nextCurrencyCode }));
    }
  }, [accounts, currencies, formState.accountId, formState.currencyCode]);

  const selectedParentCategory =
    availableCategories.find((c) => c.id === formState.categoryId)?.parentCategory ?? "";

  const hasMultipleCurrencies = availableCurrencies.length > 1;

  const hasActivityAndReceipt = activities.length > 0 && receiptFormats.length > 0;

  return (
    <form
      action={async (formData) => { await submitAction(formData); }}
      className="grid gap-4"
    >
      <PendingFieldset className="grid gap-4">
        {/* FECHA */}
        <div className="grid gap-1.5">
          <p className={FIELD_LABEL_CLASSNAME}>{copy.date_label}</p>
          <div className={cn(DISABLED_CONTROL_CLASSNAME, "font-medium text-foreground")}>
            {formatSessionDateLong(sessionDate)}
          </div>
          <p className="text-meta text-muted-foreground">{texts.dashboard.treasury.date_helper_text}</p>
        </div>

        {/* TIPO DE MOVIMIENTO */}
        <div className="grid gap-2">
          <p className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.movement_type_label, copy)}</p>
          <div className="grid grid-cols-2 gap-2">
            {movementTypes.map((type) => {
              const isSelected = formState.movementType === type;
              const isIngreso = type === "ingreso";
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormState((s) => ({ ...s, movementType: type }))}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-card border px-3 py-3 transition",
                    isSelected
                      ? isIngreso
                        ? "border-success/30 bg-success/10 text-success"
                        : "border-ds-red-200 bg-ds-red-050 text-ds-red-700"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary"
                  )}
                >
                  <span className="text-sm font-semibold">{copy.movement_types[type]}</span>
                  <span className="text-eyebrow font-medium opacity-70">
                    {isIngreso
                      ? texts.dashboard.treasury.movement_type_ingreso_sublabel
                      : texts.dashboard.treasury.movement_type_egreso_sublabel}
                  </span>
                </button>
              );
            })}
          </div>
          <input type="hidden" name="movement_type" value={formState.movementType} />
        </div>

        {/* CUENTA */}
        <label className="grid gap-2">
          <span className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.account_label, copy)}</span>
          <FormSelect
            name="account_id"
            value={formState.accountId}
            onChange={(e) => setFormState((s) => ({ ...s, accountId: e.target.value }))}
          >
            <option value="" disabled>{copy.account_placeholder}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </FormSelect>
        </label>

        {/* MONTO */}
        <div className="grid gap-2">
          <p className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.amount_label, copy)}</p>
          <div className="flex gap-2">
            {hasMultipleCurrencies ? (
              <FormSelect
                name="currency_code"
                value={formState.currencyCode}
                onChange={(e) => setFormState((s) => ({ ...s, currencyCode: e.target.value }))} className="w-24 shrink-0"
              >
                <option value="" disabled>{copy.currency_placeholder}</option>
                {availableCurrencies.map((c) => (
                  <option key={c.currencyCode} value={c.currencyCode}>{c.currencyCode}</option>
                ))}
              </FormSelect>
            ) : (
              <>
                <input type="hidden" name="currency_code" value={formState.currencyCode} />
                <div className={cn(DISABLED_CONTROL_CLASSNAME, "w-24 shrink-0 text-center font-medium text-foreground")}>
                  {formState.currencyCode || "—"}
                </div>
              </>
            )}
            <FormInput
              type="text"
              name="amount"
              inputMode="decimal"
              value={formState.amount}
              onChange={(e) => setFormState((s) => ({ ...s, amount: sanitizeAmountInput(e.target.value) }))}
              onBlur={(e) => setFormState((s) => ({ ...s, amount: normalizeAmountInputOnBlur(e.target.value) }))}
              onFocus={(e) => setFormState((s) => ({ ...s, amount: normalizeAmountInputOnFocus(e.target.value) }))}
              onKeyDown={(e) => { if (e.key === "-") e.preventDefault(); }}
              placeholder="0,00" className="flex-1 text-right tabular-nums"
            />
          </div>
          <p className="text-meta text-muted-foreground">{texts.dashboard.treasury.amount_helper_text}</p>
        </div>

        {/* SUBCATEGORÍA (izq) / CATEGORÍA (der) */}
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-2">
            <span className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.category_label, copy)}</span>
            <FormSelect
              name="category_id"
              value={formState.categoryId}
              disabled={!formState.movementType}
              onChange={(e) => setFormState((s) => ({ ...s, categoryId: e.target.value }))}
            >
              <option value="" disabled>{copy.category_placeholder}</option>
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.subCategoryName}</option>
              ))}
            </FormSelect>
          </label>
          <label className="grid gap-2">
            <span className={FIELD_LABEL_CLASSNAME}>{copy.parent_category_label}</span>
            <FormInput
              type="text"
              value={selectedParentCategory}
              disabled
              readOnly
              placeholder="—"
            />
          </label>
        </div>
        <p className="-mt-2 text-meta text-muted-foreground">{texts.dashboard.treasury.category_helper_text}</p>

        {/* ACTIVIDAD + RECIBO en la misma fila si ambos existen */}
        {hasActivityAndReceipt ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2">
              <span className={FIELD_LABEL_CLASSNAME}>{copy.activity_label}</span>
              <FormSelect
                name="activity_id"
                value={formState.activityId}
                onChange={(e) => setFormState((s) => ({ ...s, activityId: e.target.value }))}
              >
                <option value="">{copy.activity_placeholder}</option>
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </FormSelect>
            </label>
            <label className="grid gap-2">
              <span className={FIELD_LABEL_CLASSNAME}>{receiptFormats[0]?.name ?? copy.receipt_label}</span>
              <FormInput
                type="text"
                name="receipt_number"
                value={formState.receiptNumber}
                inputMode={receiptFormats[0]?.validationType === "numeric" ? "numeric" : "text"}
                onChange={(e) => {
                  const value = e.target.value;
                  if (receiptFormats[0]?.validationType === "numeric") {
                    if (value === "" || /^[0-9]+$/.test(value)) setFormState((s) => ({ ...s, receiptNumber: value }));
                  } else {
                    if (value === "" || /^[a-zA-Z0-9]*$/.test(value)) setFormState((s) => ({ ...s, receiptNumber: value }));
                  }
                }}
              />
            </label>
          </div>
        ) : (
          <>
            {activities.length > 0 ? (
              <label className="grid gap-2">
                <span className={FIELD_LABEL_CLASSNAME}>{copy.activity_label}</span>
                <FormSelect
                  name="activity_id"
                  value={formState.activityId}
                  onChange={(e) => setFormState((s) => ({ ...s, activityId: e.target.value }))}
                >
                  <option value="">{copy.activity_placeholder}</option>
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </FormSelect>
              </label>
            ) : null}
            {receiptFormats.length > 0 ? (
              <label className="grid gap-2">
                <span className={FIELD_LABEL_CLASSNAME}>{receiptFormats[0]?.name ?? copy.receipt_label}</span>
                <FormInput
                  type="text"
                  name="receipt_number"
                  value={formState.receiptNumber}
                  inputMode={receiptFormats[0]?.validationType === "numeric" ? "numeric" : "text"}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (receiptFormats[0]?.validationType === "numeric") {
                      if (value === "" || /^[0-9]+$/.test(value)) setFormState((s) => ({ ...s, receiptNumber: value }));
                    } else {
                      if (value === "" || /^[a-zA-Z0-9]*$/.test(value)) setFormState((s) => ({ ...s, receiptNumber: value }));
                    }
                  }}
                />
              </label>
            ) : null}
          </>
        )}

        {/* CONCEPTO */}
        <label className="grid gap-2">
          <span className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.concept_label, copy)}</span>
          <FormInput
            type="text"
            name="concept"
            value={formState.concept}
            onChange={(e) => setFormState((s) => ({ ...s, concept: e.target.value }))}
            placeholder={texts.dashboard.treasury.concept_placeholder}
          />
        </label>

        {/* CONTRATO RRHH (opcional) */}
        {staffContracts !== undefined && (
          <StaffContractField
            options={staffContracts}
            value={formState.staffContractId}
            onChange={(next) => setFormState((s) => ({ ...s, staffContractId: next }))}
            label={texts.dashboard.treasury_role.staff_contract_label}
            placeholder={texts.dashboard.treasury_role.staff_contract_placeholder}
            emptyOptionsLabel={texts.dashboard.treasury_role.staff_contract_empty}
          />
        )}

        {/* BUTTONS */}
        <ModalFooter
          onCancel={onCancel}
          cancelLabel={copy.reset_cta}
          submitLabel={submitLabel}
          pendingLabel={pendingLabel}
          submitDisabled={!isMovementFormValid(formState)}
        />
      </PendingFieldset>
    </form>
  );
}

export function SecretariaMovementEditForm({
  accounts,
  categories,
  activities,
  currencies,
  movementTypes,
  receiptFormats,
  submitLabel,
  pendingLabel,
  submitAction,
  movement,
  copy = texts.dashboard.treasury,
  extraHiddenFields,
  editableMovementDate = false,
  onCancel,
  costCenters,
  initialCostCenterIds,
  staffContracts
}: BaseMovementFormProps & {
  movement: EditableMovement;
  copy?: OperationalFormCopy;
  extraHiddenFields?: ReactNode;
  editableMovementDate?: boolean;
  onCancel: () => void;
}) {
  const ccCopy = texts.dashboard.treasury_role.cost_centers;
  const [formState, setFormState] = useState<MovementFormState>(() => buildEditMovementFormState(movement));
  // US-53 / edit: cost center multiselect (solo se renderiza cuando el caller
  // pasa `costCenters`, indicando rol con permiso). `initialCostCenterIds`
  // arranca con los CC ya linkeados al movimiento (si los conocemos).
  const [selectedCostCenterIds, setSelectedCostCenterIds] = useState<string[]>(
    () => initialCostCenterIds ?? []
  );
  function toggleCostCenter(id: string) {
    setSelectedCostCenterIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  }
  // Mostrar todos los CCs activos + los inactivos que ya estan seleccionados
  // en el movimiento (preservar links historicos). El multiselect deshabilita
  // los inactivos no seleccionados para impedir nuevos links a CCs cerrados.
  const visibleCostCenters = (costCenters ?? []).filter(
    (cc) => cc.status === "activo" || selectedCostCenterIds.includes(cc.id)
  );

  useEffect(() => {
    setFormState(buildEditMovementFormState(movement));
  }, [movement]);

  useEffect(() => {
    setSelectedCostCenterIds(initialCostCenterIds ?? []);
  }, [initialCostCenterIds]);

  const availableCurrencies = useMemo(() => {
    const selectedAccount = accounts.find((a) => a.id === formState.accountId);
    if (!selectedAccount) return [];
    return currencies.filter((c) => selectedAccount.currencies.includes(c.currencyCode));
  }, [accounts, currencies, formState.accountId]);

  const availableCategories = useMemo(
    () => {
      const filtered = categories.filter((c) => {
        if (c.isLegacy || c.movementType === "saldo") return false;
        if (!formState.movementType) return true;
        return c.movementType === formState.movementType;
      });
      // Defensive: incluir la categoria actual aunque este oculta para el rol o
      // su movement_type no matchee el actual del form. Asi el edit modal no
      // pierde el dato cuando un movimiento historico apunta a una categoria
      // que despues fue desactivada.
      if (
        formState.categoryId &&
        !filtered.some((c) => c.id === formState.categoryId)
      ) {
        const current = categories.find((c) => c.id === formState.categoryId);
        if (current && !current.isLegacy && current.movementType !== "saldo") {
          return [current, ...filtered];
        }
      }
      return filtered;
    },
    [categories, formState.movementType, formState.categoryId]
  );

  useEffect(() => {
    if (!formState.categoryId) return;
    if (!availableCategories.some((c) => c.id === formState.categoryId)) {
      setFormState((s) => ({ ...s, categoryId: "" }));
    }
  }, [availableCategories, formState.categoryId]);

  useEffect(() => {
    const selectedAccount = accounts.find((a) => a.id === formState.accountId);
    const nextCurrencyCode = getDefaultCurrencyCode(selectedAccount, currencies);
    if (!selectedAccount && formState.currencyCode) {
      setFormState((s) => ({ ...s, currencyCode: "" }));
      return;
    }
    if (selectedAccount && nextCurrencyCode && !selectedAccount.currencies.includes(formState.currencyCode)) {
      setFormState((s) => ({ ...s, currencyCode: nextCurrencyCode }));
    }
  }, [accounts, currencies, formState.accountId, formState.currencyCode]);

  const selectedParentCategory =
    availableCategories.find((c) => c.id === formState.categoryId)?.parentCategory ?? "";

  const hasMultipleCurrencies = availableCurrencies.length > 1;
  const hasActivityAndReceipt = activities.length > 0 && receiptFormats.length > 0;

  return (
    <form
      action={async (formData) => { await submitAction(formData); }}
      className="grid gap-4"
    >
      <input type="hidden" name="movement_id" value={movement.movementId} />
      {extraHiddenFields}

      <PendingFieldset className="grid gap-4">
        {/* ID chip */}
        <div className="flex items-center gap-2">
          <span className={FIELD_LABEL_CLASSNAME}>{copy.movement_id_label}</span>
          <span className="rounded-card bg-secondary px-2 py-0.5 text-xs font-semibold tabular-nums text-foreground">
            {movement.movementDisplayId}
          </span>
        </div>

        {/* FECHA */}
        <div className="grid gap-1.5">
          <p className={FIELD_LABEL_CLASSNAME}>{copy.date_label}</p>
          {editableMovementDate ? (
            <FormInput
              type="date"
              name="movement_date"
              value={formState.movementDate ?? ""}
              onChange={(e) => setFormState((s) => ({ ...s, movementDate: e.target.value }))}
            />
          ) : (
            <div className={cn(DISABLED_CONTROL_CLASSNAME, "font-medium text-foreground")}>
              {formatSessionDateLong(movement.movementDate)}
            </div>
          )}
        </div>

        {/* TIPO DE MOVIMIENTO */}
        <div className="grid gap-2">
          <p className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.movement_type_label, copy)}</p>
          <div className="grid grid-cols-2 gap-2">
            {movementTypes.map((type) => {
              const isSelected = formState.movementType === type;
              const isIngreso = type === "ingreso";
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormState((s) => ({ ...s, movementType: type }))}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-card border px-3 py-3 transition",
                    isSelected
                      ? isIngreso
                        ? "border-success/30 bg-success/10 text-success"
                        : "border-ds-red-200 bg-ds-red-050 text-ds-red-700"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary"
                  )}
                >
                  <span className="text-sm font-semibold">{copy.movement_types[type]}</span>
                  <span className="text-eyebrow font-medium opacity-70">
                    {isIngreso
                      ? texts.dashboard.treasury.movement_type_ingreso_sublabel
                      : texts.dashboard.treasury.movement_type_egreso_sublabel}
                  </span>
                </button>
              );
            })}
          </div>
          <input type="hidden" name="movement_type" value={formState.movementType} />
        </div>

        {/* CUENTA */}
        <label className="grid gap-2">
          <span className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.account_label, copy)}</span>
          <FormSelect
            name="account_id"
            value={formState.accountId}
            onChange={(e) => setFormState((s) => ({ ...s, accountId: e.target.value }))}
          >
            <option value="" disabled>{copy.account_placeholder}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </FormSelect>
        </label>

        {/* MONTO */}
        <div className="grid gap-2">
          <p className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.amount_label, copy)}</p>
          <div className="flex gap-2">
            {hasMultipleCurrencies ? (
              <FormSelect
                name="currency_code"
                value={formState.currencyCode}
                onChange={(e) => setFormState((s) => ({ ...s, currencyCode: e.target.value }))} className="w-24 shrink-0"
              >
                <option value="" disabled>{copy.currency_placeholder}</option>
                {availableCurrencies.map((c) => (
                  <option key={c.currencyCode} value={c.currencyCode}>{c.currencyCode}</option>
                ))}
              </FormSelect>
            ) : (
              <>
                <input type="hidden" name="currency_code" value={formState.currencyCode} />
                <div className={cn(DISABLED_CONTROL_CLASSNAME, "w-24 shrink-0 text-center font-medium text-foreground")}>
                  {formState.currencyCode || "—"}
                </div>
              </>
            )}
            <FormInput
              type="text"
              name="amount"
              inputMode="decimal"
              value={formState.amount}
              onChange={(e) => setFormState((s) => ({ ...s, amount: sanitizeAmountInput(e.target.value) }))}
              onBlur={(e) => setFormState((s) => ({ ...s, amount: normalizeAmountInputOnBlur(e.target.value) }))}
              onFocus={(e) => setFormState((s) => ({ ...s, amount: normalizeAmountInputOnFocus(e.target.value) }))}
              onKeyDown={(e) => { if (e.key === "-") e.preventDefault(); }} className="flex-1 text-right tabular-nums"
            />
          </div>
        </div>

        {/* SUBCATEGORÍA (izq) / CATEGORÍA (der) */}
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-2">
            <span className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.category_label, copy)}</span>
            <FormSelect
              name="category_id"
              value={formState.categoryId}
              disabled={!formState.movementType}
              onChange={(e) => setFormState((s) => ({ ...s, categoryId: e.target.value }))}
            >
              <option value="" disabled>{copy.category_placeholder}</option>
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.subCategoryName}</option>
              ))}
            </FormSelect>
          </label>
          <label className="grid gap-2">
            <span className={FIELD_LABEL_CLASSNAME}>{copy.parent_category_label}</span>
            <FormInput
              type="text"
              value={selectedParentCategory}
              disabled
              readOnly
              placeholder="—"
            />
          </label>
        </div>
        <p className="-mt-2 text-meta text-muted-foreground">{texts.dashboard.treasury.category_helper_text}</p>

        {/* ACTIVIDAD + RECIBO */}
        {hasActivityAndReceipt ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2">
              <span className={FIELD_LABEL_CLASSNAME}>{copy.activity_label}</span>
              <FormSelect
                name="activity_id"
                value={formState.activityId}
                onChange={(e) => setFormState((s) => ({ ...s, activityId: e.target.value }))}
              >
                <option value="">{copy.activity_placeholder}</option>
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </FormSelect>
            </label>
            <label className="grid gap-2">
              <span className={FIELD_LABEL_CLASSNAME}>{receiptFormats[0]?.name ?? copy.receipt_label}</span>
              <FormInput
                type="text"
                name="receipt_number"
                value={formState.receiptNumber}
                inputMode={receiptFormats[0]?.validationType === "numeric" ? "numeric" : "text"}
                onChange={(e) => {
                  const value = e.target.value;
                  if (receiptFormats[0]?.validationType === "numeric") {
                    if (value === "" || /^[0-9]+$/.test(value)) setFormState((s) => ({ ...s, receiptNumber: value }));
                  } else {
                    if (value === "" || /^[a-zA-Z0-9]*$/.test(value)) setFormState((s) => ({ ...s, receiptNumber: value }));
                  }
                }}
              />
            </label>
          </div>
        ) : (
          <>
            {activities.length > 0 ? (
              <label className="grid gap-2">
                <span className={FIELD_LABEL_CLASSNAME}>{copy.activity_label}</span>
                <FormSelect
                  name="activity_id"
                  value={formState.activityId}
                  onChange={(e) => setFormState((s) => ({ ...s, activityId: e.target.value }))}
                >
                  <option value="">{copy.activity_placeholder}</option>
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </FormSelect>
              </label>
            ) : null}
            {receiptFormats.length > 0 ? (
              <label className="grid gap-2">
                <span className={FIELD_LABEL_CLASSNAME}>{receiptFormats[0]?.name ?? copy.receipt_label}</span>
                <FormInput
                  type="text"
                  name="receipt_number"
                  value={formState.receiptNumber}
                  inputMode={receiptFormats[0]?.validationType === "numeric" ? "numeric" : "text"}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (receiptFormats[0]?.validationType === "numeric") {
                      if (value === "" || /^[0-9]+$/.test(value)) setFormState((s) => ({ ...s, receiptNumber: value }));
                    } else {
                      if (value === "" || /^[a-zA-Z0-9]*$/.test(value)) setFormState((s) => ({ ...s, receiptNumber: value }));
                    }
                  }}
                />
              </label>
            ) : null}
          </>
        )}

        {/* CONCEPTO */}
        <label className="grid gap-2">
          <span className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.concept_label, copy)}</span>
          <FormInput
            type="text"
            name="concept"
            value={formState.concept}
            onChange={(e) => setFormState((s) => ({ ...s, concept: e.target.value }))}
          />
        </label>

        {/* REFERENCIAS (solo lectura si existen) */}
        {movement.transferReference ? (
          <div className="grid gap-1.5">
            <p className={FIELD_LABEL_CLASSNAME}>{copy.detail_transfer_label}</p>
            <div className={cn(DISABLED_CONTROL_CLASSNAME, "truncate text-small tabular-nums")}>
              {movement.transferReference}
            </div>
          </div>
        ) : null}
        {movement.fxOperationReference ? (
          <div className="grid gap-1.5">
            <p className={FIELD_LABEL_CLASSNAME}>{copy.detail_fx_label}</p>
            <div className={cn(DISABLED_CONTROL_CLASSNAME, "truncate text-small tabular-nums")}>
              {movement.fxOperationReference}
            </div>
          </div>
        ) : null}

        {/* CONTRATO RRHH (opcional) */}
        {staffContracts !== undefined && (
          <StaffContractField
            options={staffContracts}
            value={formState.staffContractId}
            onChange={(next) => setFormState((s) => ({ ...s, staffContractId: next }))}
            label={texts.dashboard.treasury_role.staff_contract_label}
            placeholder={texts.dashboard.treasury_role.staff_contract_placeholder}
            emptyOptionsLabel={texts.dashboard.treasury_role.staff_contract_empty}
          />
        )}

        {/* COST CENTERS (US-53, rol tesoreria) */}
        {costCenters !== undefined && (
          <div className="grid gap-2">
            <p className={FIELD_LABEL_CLASSNAME}>{ccCopy.movements_cost_centers_label}</p>
            <CostCenterMultiSelect
              options={visibleCostCenters}
              selectedIds={selectedCostCenterIds}
              onChange={setSelectedCostCenterIds}
              formStateCurrency={formState.currencyCode}
              emptyOptionsLabel={ccCopy.movements_cost_centers_empty_options}
              placeholder={ccCopy.movements_cost_centers_placeholder ?? ccCopy.movements_cost_centers_label}
              selectedSummary={(count) =>
                count === 1
                  ? (ccCopy.movements_cost_centers_selected_singular ?? "1 seleccionado")
                  : (ccCopy.movements_cost_centers_selected_plural ?? "{count} seleccionados").replace(
                      "{count}",
                      String(count)
                    )
              }
              currencyMismatchTitle={ccCopy.movements_cost_centers_currency_mismatch}
            />
          </div>
        )}

        {/* BUTTONS */}
        <ModalFooter
          onCancel={onCancel}
          cancelLabel={copy.reset_cta}
          submitLabel={submitLabel}
          pendingLabel={pendingLabel}
          submitDisabled={!isMovementFormValid(formState)}
        />
      </PendingFieldset>
    </form>
  );
}

export function AccountTransferEditForm({
  movementId,
  initialValues,
  sourceAccounts,
  targetAccounts,
  currencies,
  submitAction,
  sessionDate,
  onCancel
}: {
  movementId: string;
  initialValues: TransferFormState;
  sourceAccounts: TreasuryAccount[];
  targetAccounts: TreasuryAccount[];
  currencies: TreasuryCurrencyConfig[];
  submitAction: (formData: FormData) => Promise<unknown>;
  sessionDate: string;
  onCancel: () => void;
}) {
  const [formState, setFormState] = useState<TransferFormState>(() => initialValues);

  useEffect(() => {
    setFormState(initialValues);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [movementId]);

  const selectedSourceAccount = useMemo(
    () => sourceAccounts.find((account) => account.id === formState.sourceAccountId),
    [formState.sourceAccountId, sourceAccounts]
  );
  const selectedTargetAccount = useMemo(
    () => targetAccounts.find((account) => account.id === formState.targetAccountId),
    [formState.targetAccountId, targetAccounts]
  );
  const availableCurrencies = useMemo(() => {
    if (!selectedSourceAccount) return [];
    return currencies.filter((currency) => selectedSourceAccount.currencies.includes(currency.currencyCode));
  }, [currencies, selectedSourceAccount]);

  const hasMultipleCurrencies = availableCurrencies.length > 1;

  const targetAccountCurrencyError =
    selectedTargetAccount &&
    formState.currencyCode &&
    !selectedTargetAccount.currencies.includes(formState.currencyCode)
      ? texts.dashboard.treasury.transfer_target_account_currency_error
      : null;

  useEffect(() => {
    const nextCurrencyCode = getDefaultCurrencyCode(selectedSourceAccount, currencies);
    if (!selectedSourceAccount && formState.currencyCode) {
      setFormState((s) => ({ ...s, currencyCode: "" }));
      return;
    }
    if (selectedSourceAccount && nextCurrencyCode && !selectedSourceAccount.currencies.includes(formState.currencyCode)) {
      setFormState((s) => ({ ...s, currencyCode: nextCurrencyCode }));
    }
  }, [currencies, formState.currencyCode, selectedSourceAccount]);

  return (
    <form
      action={async (formData) => { await submitAction(formData); }}
      className="grid gap-4"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        if (!isTransferFormValid(formState, targetAccountCurrencyError)) {
          event.preventDefault();
        }
      }}
    >
      <PendingFieldset className="grid gap-4">
        <input type="hidden" name="movement_id" value={movementId} />

        {/* FECHA */}
        <div className="grid gap-1.5">
          <p className={FIELD_LABEL_CLASSNAME}>{texts.dashboard.treasury.date_label}</p>
          <div className={cn(DISABLED_CONTROL_CLASSNAME, "font-medium text-foreground")}>
            {formatSessionDateLong(sessionDate)}
          </div>
          <p className="text-meta text-muted-foreground">{texts.dashboard.treasury.date_helper_text}</p>
        </div>

        {/* CUENTA ORIGEN */}
        <label className="grid gap-2">
          <span className={FIELD_LABEL_CLASSNAME}>
            {getRequiredLabel(texts.dashboard.treasury.transfer_source_account_label, texts.dashboard.treasury)}
          </span>
          <FormSelect
            name="source_account_id"
            value={formState.sourceAccountId}
            onChange={(e) => setFormState((s) => ({ ...s, sourceAccountId: e.target.value }))}
          >
            <option value="" disabled>{texts.dashboard.treasury.transfer_source_account_placeholder}</option>
            {sourceAccounts.map((account) => (
              <option key={`source-${account.id}`} value={account.id}>{account.name}</option>
            ))}
          </FormSelect>
        </label>

        {/* MONEDA + IMPORTE */}
        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2">
              <span className={FIELD_LABEL_CLASSNAME}>
                {getRequiredLabel(texts.dashboard.treasury.currency_label, texts.dashboard.treasury)}
              </span>
              {hasMultipleCurrencies ? (
                <FormSelect
                  name="currency_code"
                  value={formState.currencyCode}
                  onChange={(e) => setFormState((s) => ({ ...s, currencyCode: e.target.value }))}
                >
                  <option value="" disabled>{texts.dashboard.treasury.currency_placeholder}</option>
                  {availableCurrencies.map((c) => (
                    <option key={`transfer-${c.currencyCode}`} value={c.currencyCode}>{c.currencyCode}</option>
                  ))}
                </FormSelect>
              ) : (
                <>
                  <input type="hidden" name="currency_code" value={formState.currencyCode} />
                  <div className={cn(DISABLED_CONTROL_CLASSNAME, "font-medium text-foreground")}>
                    {formState.currencyCode || "—"}
                  </div>
                </>
              )}
            </label>
            <label className="grid gap-2">
              <span className={FIELD_LABEL_CLASSNAME}>
                {getRequiredLabel(texts.dashboard.treasury.amount_label, texts.dashboard.treasury)}
              </span>
              <FormInput
                type="text"
                name="amount"
                inputMode="decimal"
                value={formState.amount}
                onChange={(e) => setFormState((s) => ({ ...s, amount: sanitizeAmountInput(e.target.value) }))}
                onBlur={(e) => setFormState((s) => ({ ...s, amount: normalizeAmountInputOnBlur(e.target.value) }))}
                onFocus={(e) => setFormState((s) => ({ ...s, amount: normalizeAmountInputOnFocus(e.target.value) }))}
                onKeyDown={(e) => { if (e.key === "-") e.preventDefault(); }}
                placeholder="0,00" className="text-right tabular-nums"
              />
            </label>
          </div>
        </div>

        {/* CUENTA DESTINO */}
        <div className="grid gap-1.5">
          <label className="grid gap-2">
            <span className={FIELD_LABEL_CLASSNAME}>
              {getRequiredLabel(texts.dashboard.treasury.transfer_target_account_label, texts.dashboard.treasury)}
            </span>
            <FormSelect
              name="target_account_id"
              value={formState.targetAccountId}
              onChange={(e) => setFormState((s) => ({ ...s, targetAccountId: e.target.value }))}
              aria-describedby="edit-transfer-target-account-error"
              aria-invalid={targetAccountCurrencyError ? "true" : undefined} className={cn(targetAccountCurrencyError && "border-destructive/25")}
            >
              <option value="" disabled>{texts.dashboard.treasury.transfer_target_account_placeholder}</option>
              {targetAccounts
                .filter((account) => account.id !== formState.sourceAccountId)
                .map((account) => (
                  <option key={`target-${account.id}`} value={account.id}>{account.name}</option>
                ))}
            </FormSelect>
          </label>
          {targetAccountCurrencyError ? (
            <span id="edit-transfer-target-account-error" aria-live="polite" className="text-meta text-destructive">
              {targetAccountCurrencyError}
            </span>
          ) : (
            <p className="text-meta text-muted-foreground">{texts.dashboard.treasury.transfer_target_account_helper}</p>
          )}
        </div>

        {/* CONCEPTO */}
        <label className="grid gap-2">
          <span className={FIELD_LABEL_CLASSNAME}>
            {getRequiredLabel(texts.dashboard.treasury.concept_label, texts.dashboard.treasury)}
          </span>
          <FormInput
            type="text"
            name="concept"
            value={formState.concept}
            onChange={(e) => setFormState((s) => ({ ...s, concept: e.target.value }))}
            placeholder={texts.dashboard.treasury.transfer_concept_placeholder}
          />
        </label>

        {/* BUTTONS */}
        <ModalFooter
          onCancel={onCancel}
          cancelLabel={texts.dashboard.treasury.reset_cta}
          submitLabel={texts.dashboard.treasury.update_cta}
          pendingLabel={texts.dashboard.treasury.update_loading}
          submitDisabled={!isTransferFormValid(formState, targetAccountCurrencyError)}
        />
      </PendingFieldset>
    </form>
  );
}

export function AccountTransferForm({
  sourceAccounts,
  targetAccounts,
  currencies,
  submitAction,
  sessionDate,
  onCancel
}: {
  sourceAccounts: TreasuryAccount[];
  targetAccounts: TreasuryAccount[];
  currencies: TreasuryCurrencyConfig[];
  submitAction: (formData: FormData) => Promise<void>;
  sessionDate: string;
  onCancel: () => void;
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
    if (!selectedSourceAccount) return [];
    return currencies.filter((currency) => selectedSourceAccount.currencies.includes(currency.currencyCode));
  }, [currencies, selectedSourceAccount]);

  const hasMultipleCurrencies = availableCurrencies.length > 1;

  const targetAccountCurrencyError =
    selectedTargetAccount &&
    formState.currencyCode &&
    !selectedTargetAccount.currencies.includes(formState.currencyCode)
      ? texts.dashboard.treasury.transfer_target_account_currency_error
      : null;

  useEffect(() => {
    const nextCurrencyCode = getDefaultCurrencyCode(selectedSourceAccount, currencies);
    if (!selectedSourceAccount && formState.currencyCode) {
      setFormState((s) => ({ ...s, currencyCode: "" }));
      return;
    }
    if (selectedSourceAccount && nextCurrencyCode && !selectedSourceAccount.currencies.includes(formState.currencyCode)) {
      setFormState((s) => ({ ...s, currencyCode: nextCurrencyCode }));
    }
  }, [currencies, formState.currencyCode, selectedSourceAccount]);

  return (
    <form
      action={async (formData) => { await submitAction(formData); }}
      className="grid gap-4"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        if (!isTransferFormValid(formState, targetAccountCurrencyError)) {
          event.preventDefault();
        }
      }}
    >
      <PendingFieldset className="grid gap-4">
        {/* FECHA */}
        <div className="grid gap-1.5">
          <p className={FIELD_LABEL_CLASSNAME}>{texts.dashboard.treasury.date_label}</p>
          <div className={cn(DISABLED_CONTROL_CLASSNAME, "font-medium text-foreground")}>
            {formatSessionDateLong(sessionDate)}
          </div>
          <p className="text-meta text-muted-foreground">{texts.dashboard.treasury.date_helper_text}</p>
        </div>

        {/* CUENTA ORIGEN */}
        <label className="grid gap-2">
          <span className={FIELD_LABEL_CLASSNAME}>
            {getRequiredLabel(texts.dashboard.treasury.transfer_source_account_label, texts.dashboard.treasury)}
          </span>
          <FormSelect
            name="source_account_id"
            value={formState.sourceAccountId}
            onChange={(e) => setFormState((s) => ({ ...s, sourceAccountId: e.target.value }))}
          >
            <option value="" disabled>{texts.dashboard.treasury.transfer_source_account_placeholder}</option>
            {sourceAccounts.map((account) => (
              <option key={`source-${account.id}`} value={account.id}>{account.name}</option>
            ))}
          </FormSelect>
        </label>

        {/* MONEDA + IMPORTE */}
        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2">
              <span className={FIELD_LABEL_CLASSNAME}>
                {getRequiredLabel(texts.dashboard.treasury.currency_label, texts.dashboard.treasury)}
              </span>
              {hasMultipleCurrencies ? (
                <FormSelect
                  name="currency_code"
                  value={formState.currencyCode}
                  onChange={(e) => setFormState((s) => ({ ...s, currencyCode: e.target.value }))}
                >
                  <option value="" disabled>{texts.dashboard.treasury.currency_placeholder}</option>
                  {availableCurrencies.map((c) => (
                    <option key={`transfer-${c.currencyCode}`} value={c.currencyCode}>{c.currencyCode}</option>
                  ))}
                </FormSelect>
              ) : (
                <>
                  <input type="hidden" name="currency_code" value={formState.currencyCode} />
                  <div className={cn(DISABLED_CONTROL_CLASSNAME, "font-medium text-foreground")}>
                    {formState.currencyCode || "—"}
                  </div>
                </>
              )}
            </label>
            <label className="grid gap-2">
              <span className={FIELD_LABEL_CLASSNAME}>
                {getRequiredLabel(texts.dashboard.treasury.amount_label, texts.dashboard.treasury)}
              </span>
              <FormInput
                type="text"
                name="amount"
                inputMode="decimal"
                value={formState.amount}
                onChange={(e) => setFormState((s) => ({ ...s, amount: sanitizeAmountInput(e.target.value) }))}
                onBlur={(e) => setFormState((s) => ({ ...s, amount: normalizeAmountInputOnBlur(e.target.value) }))}
                onFocus={(e) => setFormState((s) => ({ ...s, amount: normalizeAmountInputOnFocus(e.target.value) }))}
                onKeyDown={(e) => { if (e.key === "-") e.preventDefault(); }}
                placeholder="0,00" className="text-right tabular-nums"
              />
            </label>
          </div>
        </div>

        {/* CUENTA DESTINO */}
        <div className="grid gap-1.5">
          <label className="grid gap-2">
            <span className={FIELD_LABEL_CLASSNAME}>
              {getRequiredLabel(texts.dashboard.treasury.transfer_target_account_label, texts.dashboard.treasury)}
            </span>
            <FormSelect
              name="target_account_id"
              value={formState.targetAccountId}
              onChange={(e) => setFormState((s) => ({ ...s, targetAccountId: e.target.value }))}
              aria-describedby="transfer-target-account-error"
              aria-invalid={targetAccountCurrencyError ? "true" : undefined} className={cn(targetAccountCurrencyError && "border-destructive/25")}
            >
              <option value="" disabled>{texts.dashboard.treasury.transfer_target_account_placeholder}</option>
              {targetAccounts
                .filter((account) => account.id !== formState.sourceAccountId)
                .map((account) => (
                  <option key={`target-${account.id}`} value={account.id}>{account.name}</option>
                ))}
            </FormSelect>
          </label>
          {targetAccountCurrencyError ? (
            <span id="transfer-target-account-error" aria-live="polite" className="text-meta text-destructive">
              {targetAccountCurrencyError}
            </span>
          ) : (
            <p className="text-meta text-muted-foreground">{texts.dashboard.treasury.transfer_target_account_helper}</p>
          )}
        </div>

        {/* CONCEPTO */}
        <label className="grid gap-2">
          <span className={FIELD_LABEL_CLASSNAME}>
            {getRequiredLabel(texts.dashboard.treasury.concept_label, texts.dashboard.treasury)}
          </span>
          <FormInput
            type="text"
            name="concept"
            value={formState.concept}
            onChange={(e) => setFormState((s) => ({ ...s, concept: e.target.value }))}
            placeholder={texts.dashboard.treasury.transfer_concept_placeholder}
          />
        </label>

        {/* BUTTONS */}
        <ModalFooter
          onCancel={onCancel}
          cancelLabel={texts.dashboard.treasury.reset_cta}
          submitLabel={texts.dashboard.treasury.transfer_create_cta}
          pendingLabel={texts.dashboard.treasury.transfer_create_loading}
          submitDisabled={!isTransferFormValid(formState, targetAccountCurrencyError)}
        />
      </PendingFieldset>
    </form>
  );
}

export function ConsolidationTransferEditForm({
  sourceAccounts,
  targetAccounts,
  currencies,
  submitAction,
  submitLabel,
  pendingLabel,
  transfer,
  extraHiddenFields
}: {
  sourceAccounts: TreasuryAccount[];
  targetAccounts: TreasuryAccount[];
  currencies: TreasuryCurrencyConfig[];
  submitAction: (formData: FormData) => Promise<unknown>;
  submitLabel: string;
  pendingLabel: string;
  transfer: ConsolidationTransferEdit;
  extraHiddenFields?: ReactNode;
}) {
  const [formState, setFormState] = useState<TransferFormState>(() => buildEditTransferFormState(transfer));

  useEffect(() => {
    setFormState(buildEditTransferFormState(transfer));
  }, [transfer]);

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

  return (
    <form
      action={async (formData) => {
        await submitAction(formData);
      }}
      className="grid gap-4"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        if (!isTransferFormValid(formState, targetAccountCurrencyError)) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="movement_id" value={transfer.movementId} />
      {extraHiddenFields}

      <PendingFieldset className={FORM_GRID_CLASSNAME}>
        <FormField>
          <span className={FIELD_LABEL_CLASSNAME}>{texts.dashboard.treasury.date_label}</span>
          <FormInput type="text" value={transfer.movementDate} disabled />
        </FormField>

        <FormField fullWidth>
          <span className={FIELD_LABEL_CLASSNAME}>{texts.dashboard.treasury.detail_transfer_label}</span>
          <FormInput type="text" value={transfer.transferReference} disabled />
        </FormField>

        <FormField>
          <span className={FIELD_LABEL_CLASSNAME}>
            {getRequiredLabel(texts.dashboard.treasury.transfer_source_account_label, texts.dashboard.treasury)}
          </span>
          <FormSelect
            name="source_account_id"
            value={formState.sourceAccountId}
            onChange={(event) => setFormState((current) => ({ ...current, sourceAccountId: event.target.value }))}
          >
            <option value="" disabled>
              {texts.dashboard.treasury.transfer_source_account_placeholder}
            </option>
            {sourceAccounts.map((account) => (
              <option key={`edit-source-${account.id}`} value={account.id}>
                {account.name}
              </option>
            ))}
          </FormSelect>
        </FormField>

        <FormField>
          <span className={FIELD_LABEL_CLASSNAME}>
            {getRequiredLabel(texts.dashboard.treasury.transfer_target_account_label, texts.dashboard.treasury)}
          </span>
          <FormSelect
            name="target_account_id"
            value={formState.targetAccountId}
            onChange={(event) => setFormState((current) => ({ ...current, targetAccountId: event.target.value }))}
            aria-describedby={targetAccountCurrencyError ? "edit-transfer-target-account-error" : undefined}
            aria-invalid={targetAccountCurrencyError ? "true" : undefined} className={cn(targetAccountCurrencyError && "border-destructive/25")}
          >
            <option value="" disabled>
              {texts.dashboard.treasury.transfer_target_account_placeholder}
            </option>
            {targetAccounts.map((account) => (
              <option key={`edit-target-${account.id}`} value={account.id}>
                {account.name}
              </option>
            ))}
          </FormSelect>
          {targetAccountCurrencyError ? (
            <span
              id="edit-transfer-target-account-error"
              aria-live="polite"
              className="text-xs leading-5 text-destructive"
            >
              {targetAccountCurrencyError}
            </span>
          ) : null}
        </FormField>

        <FormField>
          <span className={FIELD_LABEL_CLASSNAME}>
            {getRequiredLabel(texts.dashboard.treasury.currency_label, texts.dashboard.treasury)}
          </span>
          <FormSelect
            name="currency_code"
            value={formState.currencyCode}
            onChange={(event) => setFormState((current) => ({ ...current, currencyCode: event.target.value }))}
            disabled={availableCurrencies.length === 0} className="disabled:text-muted-foreground"
          >
            <option value="" disabled>
              {texts.dashboard.treasury.currency_placeholder}
            </option>
            {availableCurrencies.map((currency) => (
              <option key={`edit-transfer-currency-${currency.currencyCode}`} value={currency.currencyCode}>
                {currency.currencyCode}
              </option>
            ))}
          </FormSelect>
        </FormField>

        <FormField fullWidth>
          <span className={FIELD_LABEL_CLASSNAME}>
            {getRequiredLabel(texts.dashboard.treasury.concept_label, texts.dashboard.treasury)}
          </span>
          <FormInput
            type="text"
            name="concept"
            value={formState.concept}
            onChange={(event) => setFormState((current) => ({ ...current, concept: event.target.value }))}
          />
        </FormField>

        <FormField>
          <span className={FIELD_LABEL_CLASSNAME}>
            {getRequiredLabel(texts.dashboard.treasury.amount_label, texts.dashboard.treasury)}
          </span>
          <FormInput
            type="text"
            name="amount"
            inputMode="decimal"
            value={formState.amount}
            onChange={(event) => setFormState((current) => ({ ...current, amount: sanitizeAmountInput(event.target.value) }))}
            onBlur={(event) => setFormState((current) => ({ ...current, amount: normalizeAmountInputOnBlur(event.target.value) }))}
            onFocus={(event) =>
              setFormState((current) => ({ ...current, amount: normalizeAmountInputOnFocus(event.target.value) }))
            }
            onKeyDown={(event) => {
              if (event.key === "-") {
                event.preventDefault();
              }
            }}
          />
        </FormField>

      </PendingFieldset>

      <ModalFooter
        submitLabel={submitLabel}
        pendingLabel={pendingLabel}
        submitDisabled={!isTransferFormValid(formState, targetAccountCurrencyError)}
        submitVariant="dark"
      />
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
  sessionDate,
  onCancel,
  costCenters,
  initialCostCenterIds,
  staffContracts
}: BaseMovementFormProps & { sessionDate: string; onCancel?: () => void }) {
  const copy = texts.dashboard.treasury_role;
  const ccCopy = texts.dashboard.treasury_role.cost_centers;

  // US-53: selection state for the cost-center multiselect. Only rendered when
  // `costCenters` is passed (rol Tesorería).
  const [selectedCostCenterIds, setSelectedCostCenterIds] = useState<string[]>(
    () => initialCostCenterIds ?? []
  );
  function toggleCostCenter(id: string) {
    setSelectedCostCenterIds((current) =>
      current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    );
  }
  // Mostrar todos los CCs activos + los inactivos que ya estan seleccionados
  // en el movimiento (preservar links historicos). El multiselect deshabilita
  // los inactivos no seleccionados para impedir nuevos links a CCs cerrados.
  const visibleCostCenters = (costCenters ?? []).filter(
    (cc) => cc.status === "activo" || selectedCostCenterIds.includes(cc.id)
  );

  const [formState, setFormState] = useState<MovementFormState>(() => ({
    accountId: "",
    movementType: "",
    categoryId: "",
    activityId: "",
    receiptNumber: "",
    concept: "",
    currencyCode: "",
    amount: "",
    staffContractId: ""
  }));

  const availableCurrencies = useMemo(() => {
    const selectedAccount = accounts.find((a) => a.id === formState.accountId);
    if (!selectedAccount) return [];
    return currencies.filter((c) => selectedAccount.currencies.includes(c.currencyCode));
  }, [accounts, currencies, formState.accountId]);

  const availableCategories = useMemo(
    () =>
      categories.filter((c) => {
        if (c.isLegacy || c.movementType === "saldo") return false;
        if (!formState.movementType) return true;
        return c.movementType === formState.movementType;
      }),
    [categories, formState.movementType]
  );

  useEffect(() => {
    if (!formState.categoryId) return;
    if (!availableCategories.some((c) => c.id === formState.categoryId)) {
      setFormState((s) => ({ ...s, categoryId: "" }));
    }
  }, [availableCategories, formState.categoryId]);

  useEffect(() => {
    const selectedAccount = accounts.find((a) => a.id === formState.accountId);
    const nextCurrencyCode = getDefaultCurrencyCode(selectedAccount, currencies);
    if (!selectedAccount && formState.currencyCode) {
      setFormState((s) => ({ ...s, currencyCode: "" }));
      return;
    }
    if (selectedAccount && nextCurrencyCode && !selectedAccount.currencies.includes(formState.currencyCode)) {
      setFormState((s) => ({ ...s, currencyCode: nextCurrencyCode }));
    }
  }, [accounts, currencies, formState.accountId, formState.currencyCode]);

  const selectedParentCategory =
    availableCategories.find((c) => c.id === formState.categoryId)?.parentCategory ?? "";

  const hasMultipleCurrencies = availableCurrencies.length > 1;
  const hasActivityAndReceipt = activities.length > 0 && receiptFormats.length > 0;

  const handleReset = () =>
    setFormState({
      accountId: "",
      movementType: "",
      categoryId: "",
      activityId: "",
      receiptNumber: "",
      concept: "",
      currencyCode: "",
      amount: "",
      staffContractId: ""
    });

  return (
    <form
      action={async (formData) => {
        await submitAction(formData);
      }}
      className="grid gap-4"
    >
      <PendingFieldset className="grid gap-4">
        {/* FECHA */}
        <div className="grid gap-1.5">
          <p className={FIELD_LABEL_CLASSNAME}>{copy.date_label}</p>
          <div className={cn(DISABLED_CONTROL_CLASSNAME, "font-medium text-foreground")}>
            {formatSessionDateLong(sessionDate)}
          </div>
        </div>

        {/* TIPO DE MOVIMIENTO */}
        <div className="grid gap-2">
          <p className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.movement_type_label, copy)}</p>
          <div className="grid grid-cols-2 gap-2">
            {movementTypes.map((type) => {
              const isSelected = formState.movementType === type;
              const isIngreso = type === "ingreso";
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormState((s) => ({ ...s, movementType: type }))}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-card border px-3 py-3 transition",
                    isSelected
                      ? isIngreso
                        ? "border-success/30 bg-success/10 text-success"
                        : "border-ds-red-200 bg-ds-red-050 text-ds-red-700"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary"
                  )}
                >
                  <span className="text-sm font-semibold">{copy.movement_types[type]}</span>
                  <span className="text-eyebrow font-medium opacity-70">
                    {isIngreso
                      ? texts.dashboard.treasury.movement_type_ingreso_sublabel
                      : texts.dashboard.treasury.movement_type_egreso_sublabel}
                  </span>
                </button>
              );
            })}
          </div>
          <input type="hidden" name="movement_type" value={formState.movementType} />
        </div>

        {/* CUENTA */}
        <label className="grid gap-2">
          <span className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.account_label, copy)}</span>
          <FormSelect
            name="account_id"
            value={formState.accountId}
            onChange={(e) => setFormState((s) => ({ ...s, accountId: e.target.value }))}
          >
            <option value="" disabled>{copy.account_placeholder}</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </FormSelect>
        </label>

        {/* MONTO */}
        <div className="grid gap-2">
          <p className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.amount_label, copy)}</p>
          <div className="flex gap-2">
            {hasMultipleCurrencies ? (
              <FormSelect
                name="currency_code"
                value={formState.currencyCode}
                onChange={(e) => setFormState((s) => ({ ...s, currencyCode: e.target.value }))} className="w-24 shrink-0"
              >
                <option value="" disabled>{copy.currency_placeholder}</option>
                {availableCurrencies.map((c) => (
                  <option key={c.currencyCode} value={c.currencyCode}>{c.currencyCode}</option>
                ))}
              </FormSelect>
            ) : (
              <>
                <input type="hidden" name="currency_code" value={formState.currencyCode} />
                <div className={cn(DISABLED_CONTROL_CLASSNAME, "w-24 shrink-0 text-center font-medium text-foreground")}>
                  {formState.currencyCode || "—"}
                </div>
              </>
            )}
            <FormInput
              type="text"
              name="amount"
              inputMode="decimal"
              value={formState.amount}
              onChange={(e) => setFormState((s) => ({ ...s, amount: sanitizeAmountInput(e.target.value) }))}
              onBlur={(e) => setFormState((s) => ({ ...s, amount: normalizeAmountInputOnBlur(e.target.value) }))}
              onFocus={(e) => setFormState((s) => ({ ...s, amount: normalizeAmountInputOnFocus(e.target.value) }))}
              onKeyDown={(e) => { if (e.key === "-") e.preventDefault(); }}
              placeholder="0,00" className="flex-1 text-right tabular-nums"
            />
          </div>
          <p className="text-meta text-muted-foreground">{texts.dashboard.treasury.amount_helper_text}</p>
        </div>

        {/* CATEGORÍA + SUBCATEGORÍA */}
        <div className="grid grid-cols-2 gap-3">
          <label className="grid gap-2">
            <span className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.category_label, copy)}</span>
            <FormSelect
              name="category_id"
              value={formState.categoryId}
              disabled={!formState.movementType}
              onChange={(e) => setFormState((s) => ({ ...s, categoryId: e.target.value }))}
            >
              <option value="" disabled>{copy.category_placeholder}</option>
              {availableCategories.map((c) => (
                <option key={c.id} value={c.id}>{c.subCategoryName}</option>
              ))}
            </FormSelect>
          </label>
          <label className="grid gap-2">
            <span className={FIELD_LABEL_CLASSNAME}>{copy.parent_category_label}</span>
            <FormInput
              type="text"
              value={selectedParentCategory}
              disabled
              readOnly
              placeholder="—"
            />
          </label>
        </div>
        <p className="-mt-2 text-meta text-muted-foreground">{texts.dashboard.treasury.category_helper_text}</p>

        {/* ACTIVIDAD + RECIBO */}
        {hasActivityAndReceipt ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2">
              <span className={FIELD_LABEL_CLASSNAME}>{copy.activity_label}</span>
              <FormSelect
                name="activity_id"
                value={formState.activityId}
                onChange={(e) => setFormState((s) => ({ ...s, activityId: e.target.value }))}
              >
                <option value="">{copy.activity_placeholder}</option>
                {activities.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </FormSelect>
            </label>
            <label className="grid gap-2">
              <span className={FIELD_LABEL_CLASSNAME}>{receiptFormats[0]?.name ?? copy.receipt_label}</span>
              <FormInput
                type="text"
                name="receipt_number"
                value={formState.receiptNumber}
                inputMode={receiptFormats[0]?.validationType === "numeric" ? "numeric" : "text"}
                onChange={(e) => {
                  const value = e.target.value;
                  if (receiptFormats[0]?.validationType === "numeric") {
                    if (value === "" || /^[0-9]+$/.test(value)) setFormState((s) => ({ ...s, receiptNumber: value }));
                  } else {
                    if (value === "" || /^[a-zA-Z0-9]*$/.test(value)) setFormState((s) => ({ ...s, receiptNumber: value }));
                  }
                }}
              />
            </label>
          </div>
        ) : (
          <>
            {activities.length > 0 ? (
              <label className="grid gap-2">
                <span className={FIELD_LABEL_CLASSNAME}>{copy.activity_label}</span>
                <FormSelect
                  name="activity_id"
                  value={formState.activityId}
                  onChange={(e) => setFormState((s) => ({ ...s, activityId: e.target.value }))}
                >
                  <option value="">{copy.activity_placeholder}</option>
                  {activities.map((a) => (
                    <option key={a.id} value={a.id}>{a.name}</option>
                  ))}
                </FormSelect>
              </label>
            ) : null}
            {receiptFormats.length > 0 ? (
              <label className="grid gap-2">
                <span className={FIELD_LABEL_CLASSNAME}>{receiptFormats[0]?.name ?? copy.receipt_label}</span>
                <FormInput
                  type="text"
                  name="receipt_number"
                  value={formState.receiptNumber}
                  inputMode={receiptFormats[0]?.validationType === "numeric" ? "numeric" : "text"}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (receiptFormats[0]?.validationType === "numeric") {
                      if (value === "" || /^[0-9]+$/.test(value)) setFormState((s) => ({ ...s, receiptNumber: value }));
                    } else {
                      if (value === "" || /^[a-zA-Z0-9]*$/.test(value)) setFormState((s) => ({ ...s, receiptNumber: value }));
                    }
                  }}
                />
              </label>
            ) : null}
          </>
        )}

        {/* CONCEPTO */}
        <label className="grid gap-2">
          <span className={FIELD_LABEL_CLASSNAME}>{getRequiredLabel(copy.concept_label, copy)}</span>
          <FormInput
            type="text"
            name="concept"
            value={formState.concept}
            onChange={(e) => setFormState((s) => ({ ...s, concept: e.target.value }))}
            placeholder={texts.dashboard.treasury.concept_placeholder}
          />
        </label>

        {/* CONTRATO RRHH (opcional) */}
        {staffContracts !== undefined && (
          <StaffContractField
            options={staffContracts}
            value={formState.staffContractId}
            onChange={(next) => setFormState((s) => ({ ...s, staffContractId: next }))}
            label={texts.dashboard.treasury_role.staff_contract_label}
            placeholder={texts.dashboard.treasury_role.staff_contract_placeholder}
            emptyOptionsLabel={texts.dashboard.treasury_role.staff_contract_empty}
          />
        )}

        {/* COST CENTERS (US-53, rol tesoreria) */}
        {costCenters !== undefined && (
          <div className="grid gap-2">
            <p className={FIELD_LABEL_CLASSNAME}>{ccCopy.movements_cost_centers_label}</p>
            <CostCenterMultiSelect
              options={visibleCostCenters}
              selectedIds={selectedCostCenterIds}
              onChange={setSelectedCostCenterIds}
              formStateCurrency={formState.currencyCode}
              emptyOptionsLabel={ccCopy.movements_cost_centers_empty_options}
              placeholder={ccCopy.movements_cost_centers_placeholder ?? ccCopy.movements_cost_centers_label}
              selectedSummary={(count) =>
                count === 1
                  ? (ccCopy.movements_cost_centers_selected_singular ?? "1 seleccionado")
                  : (ccCopy.movements_cost_centers_selected_plural ?? "{count} seleccionados").replace(
                      "{count}",
                      String(count)
                    )
              }
              currencyMismatchTitle={ccCopy.movements_cost_centers_currency_mismatch}
            />
          </div>
        )}

        <ModalFooter
          onCancel={onCancel ?? handleReset}
          cancelLabel={copy.reset_cta}
          submitLabel={submitLabel}
          pendingLabel={pendingLabel}
          submitDisabled={!isMovementFormValid(formState)}
          submitVariant="dark"
        />
      </PendingFieldset>
    </form>
  );
}

type FxFormState = {
  operationType: "compra" | "venta";
  sourceAccountId: string;
  targetAccountId: string;
  sourceAmount: string;
  exchangeRate: string;
  concept: string;
};

function buildEmptyFxFormState(): FxFormState {
  return {
    operationType: "compra",
    sourceAccountId: "",
    targetAccountId: "",
    sourceAmount: "",
    exchangeRate: "",
    concept: ""
  };
}

function isPositiveAmount(value: string) {
  const normalizedValue = sanitizeAmountInput(value).trim();

  if (!normalizedValue) {
    return false;
  }

  const parsedValue = Number(normalizedValue.replace(",", "."));

  return !Number.isNaN(parsedValue) && parsedValue > 0;
}

function isFxFormValid(formState: FxFormState) {
  return Boolean(
    formState.sourceAccountId &&
      formState.targetAccountId &&
      isPositiveAmount(formState.sourceAmount) &&
      isPositiveAmount(formState.exchangeRate)
  );
}

export function TreasuryRoleFxForm({
  accounts,
  submitAction,
  sessionDate,
  onCancel
}: {
  accounts: TreasuryAccount[];
  submitAction: (formData: FormData) => Promise<unknown>;
  sessionDate: string;
  onCancel: () => void;
}) {
  const [formState, setFormState] = useState<FxFormState>(buildEmptyFxFormState);

  const sourceCurrencyCode = formState.operationType === "compra" ? "ARS" : "USD";
  const targetCurrencyCode = formState.operationType === "compra" ? "USD" : "ARS";

  const computedTargetAmount = useMemo(() => {
    const parsedSource = parseLocalizedAmount(formState.sourceAmount);
    const parsedRate = parseLocalizedAmount(formState.exchangeRate);
    if (!parsedSource || !parsedRate || parsedRate === 0) return null;
    return formState.operationType === "compra"
      ? parsedSource / parsedRate
      : parsedSource * parsedRate;
  }, [formState.operationType, formState.sourceAmount, formState.exchangeRate]);

  const computedTargetAmountForSubmit = computedTargetAmount !== null
    ? formatLocalizedAmount(computedTargetAmount)
    : "";

  const handleReset = () => setFormState(buildEmptyFxFormState());

  return (
    <form
      action={async (formData) => {
        await submitAction(formData);
      }}
      className="flex flex-col gap-4"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        if (!isFxFormValid(formState)) {
          event.preventDefault();
          return;
        }
        window.setTimeout(handleReset, 0);
      }}
    >
      {/* Hidden inputs for backend */}
      <input type="hidden" name="source_currency_code" value={sourceCurrencyCode} />
      <input type="hidden" name="target_currency_code" value={targetCurrencyCode} />
      <input type="hidden" name="target_amount" value={computedTargetAmountForSubmit} />

      <PendingFieldset className="flex flex-col gap-4">
        {/* FECHA */}
        <div className="flex flex-col gap-1.5">
          <p className={FIELD_LABEL_CLASSNAME}>{texts.dashboard.treasury_role.date_label}</p>
          <div className={DISABLED_CONTROL_CLASSNAME}>
            {formatSessionDateLong(sessionDate)}
          </div>
        </div>

        {/* OPERACIÓN */}
        <div className="flex flex-col gap-1.5">
          <p className={FIELD_LABEL_CLASSNAME}>
            {texts.dashboard.treasury_role.fx_operation_label}
            <span className="text-destructive" aria-hidden="true"> *</span>
          </p>
          <div className="grid grid-cols-2 gap-2">
            {(["compra", "venta"] as const).map((op) => {
              const isSelected = formState.operationType === op;
              return (
                <button
                  key={op}
                  type="button"
                  onClick={() => setFormState((s) => ({ ...s, operationType: op }))}
                  className={cn(
                    "flex flex-col items-center gap-0.5 rounded-card border px-3 py-3 transition",
                    isSelected
                      ? "border-info/30 bg-info/10 text-info"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary"
                  )}
                >
                  <span className="text-sm font-semibold">
                    {op === "compra"
                      ? texts.dashboard.treasury_role.fx_operation_compra
                      : texts.dashboard.treasury_role.fx_operation_venta}
                  </span>
                  <span className="text-eyebrow font-medium opacity-70">
                    {op === "compra"
                      ? texts.dashboard.treasury_role.fx_operation_compra_sublabel
                      : texts.dashboard.treasury_role.fx_operation_venta_sublabel}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* CUENTA ORIGEN + MONTO ENTREGADO */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <p className={FIELD_LABEL_CLASSNAME}>
              {texts.dashboard.treasury_role.fx_source_account_label}
              <span className="text-destructive" aria-hidden="true"> *</span>
            </p>
            <FormSelect
              name="source_account_id"
              value={formState.sourceAccountId}
              onChange={(e) => setFormState((s) => ({ ...s, sourceAccountId: e.target.value }))}
            >
              <option value="" disabled>{texts.dashboard.treasury_role.fx_source_account_placeholder}</option>
              {accounts.map((account) => (
                <option key={`fx-source-${account.id}`} value={account.id}>{account.name}</option>
              ))}
            </FormSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className={FIELD_LABEL_CLASSNAME}>
              {texts.dashboard.treasury_role.fx_source_amount_label}
              <span className="text-destructive" aria-hidden="true"> *</span>
            </p>
            <div className="flex overflow-hidden rounded-card border border-border bg-card focus-within:ring-2 focus-within:ring-foreground/10">
              <span className="flex shrink-0 items-center border-r border-border bg-secondary/50 px-3 text-sm font-semibold text-muted-foreground">
                {sourceCurrencyCode}
              </span>
              {/* eslint-disable-next-line no-restricted-syntax -- Compound input (badge + input transparente): <FormInput> no soporta el layout inline con badge pegado. */}
              <input
                type="text"
                name="source_amount"
                inputMode="decimal"
                value={formState.sourceAmount}
                onChange={(e) => setFormState((s) => ({ ...s, sourceAmount: sanitizeAmountInput(e.target.value) }))}
                onBlur={(e) => setFormState((s) => ({ ...s, sourceAmount: normalizeAmountInputOnBlur(e.target.value) }))}
                onFocus={(e) => setFormState((s) => ({ ...s, sourceAmount: normalizeAmountInputOnFocus(e.target.value) }))}
                onKeyDown={(e) => { if (e.key === "-") e.preventDefault(); }}
                placeholder="0,00"
                className="min-h-11 flex-1 bg-transparent px-3 py-2 text-right text-sm tabular-nums text-foreground focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* TIPO DE CAMBIO */}
        <div className="flex flex-col gap-1.5">
          <p className={FIELD_LABEL_CLASSNAME}>
            {texts.dashboard.treasury_role.fx_exchange_rate_label}
            <span className="text-destructive" aria-hidden="true"> *</span>
          </p>
          <div className="flex overflow-hidden rounded-card border border-border bg-card focus-within:ring-2 focus-within:ring-foreground/10">
            <span className="flex shrink-0 items-center border-r border-border bg-secondary/50 px-3 text-sm font-semibold text-muted-foreground">
              1 USD =
            </span>
            {/* eslint-disable-next-line no-restricted-syntax -- Compound input (badge + input transparente): <FormInput> no soporta el layout inline con badge pegado. */}
            <input
              type="text"
              inputMode="decimal"
              value={formState.exchangeRate}
              onChange={(e) => setFormState((s) => ({ ...s, exchangeRate: sanitizeAmountInput(e.target.value) }))}
              onBlur={(e) => setFormState((s) => ({ ...s, exchangeRate: normalizeAmountInputOnBlur(e.target.value) }))}
              onFocus={(e) => setFormState((s) => ({ ...s, exchangeRate: normalizeAmountInputOnFocus(e.target.value) }))}
              onKeyDown={(e) => { if (e.key === "-") e.preventDefault(); }}
              placeholder="1.040,00"
              className="min-h-11 flex-1 bg-transparent px-3 py-2 text-right text-sm tabular-nums text-foreground focus:outline-none"
            />
          </div>
          <p className="text-meta text-muted-foreground">{texts.dashboard.treasury_role.fx_exchange_rate_helper}</p>
        </div>

        {/* CUENTA DESTINO + MONTO RECIBIDO */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <p className={FIELD_LABEL_CLASSNAME}>
              {texts.dashboard.treasury_role.fx_target_account_label}
              <span className="text-destructive" aria-hidden="true"> *</span>
            </p>
            <FormSelect
              name="target_account_id"
              value={formState.targetAccountId}
              onChange={(e) => setFormState((s) => ({ ...s, targetAccountId: e.target.value }))}
            >
              <option value="" disabled>{texts.dashboard.treasury_role.fx_target_account_placeholder}</option>
              {accounts.map((account) => (
                <option key={`fx-target-${account.id}`} value={account.id}>{account.name}</option>
              ))}
            </FormSelect>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className={FIELD_LABEL_CLASSNAME}>{texts.dashboard.treasury_role.fx_target_amount_label}</p>
            <div className="flex overflow-hidden rounded-card border border-border bg-secondary/40">
              <span className="flex shrink-0 items-center border-r border-border bg-secondary/60 px-3 text-sm font-semibold text-muted-foreground">
                {targetCurrencyCode}
              </span>
              <span className="flex min-h-11 flex-1 items-center justify-end px-3 text-sm tabular-nums text-muted-foreground">
                {computedTargetAmount !== null
                  ? formatLocalizedAmount(computedTargetAmount)
                  : "0,00"}
              </span>
            </div>
            <p className="text-meta text-muted-foreground">{texts.dashboard.treasury_role.fx_target_amount_helper}</p>
          </div>
        </div>

        {/* CONCEPTO */}
        <div className="flex flex-col gap-1.5">
          <p className={FIELD_LABEL_CLASSNAME}>{texts.dashboard.treasury_role.concept_label}</p>
          <FormInput
            type="text"
            name="concept"
            value={formState.concept}
            onChange={(e) => setFormState((s) => ({ ...s, concept: e.target.value }))}
            placeholder={texts.dashboard.treasury_role.fx_concept_placeholder}
          />
        </div>

        {/* BANNER INFO */}
        <FormBanner variant="info">
          {texts.dashboard.treasury_role.fx_info_banner}
        </FormBanner>

        <ModalFooter
          onCancel={onCancel}
          cancelLabel={texts.dashboard.treasury_role.reset_cta}
          submitLabel={texts.dashboard.treasury_role.fx_create_cta}
          pendingLabel={texts.dashboard.treasury_role.fx_create_loading}
          submitDisabled={!isFxFormValid(formState)}
          submitVariant="dark"
        />
      </PendingFieldset>
    </form>
  );
}
