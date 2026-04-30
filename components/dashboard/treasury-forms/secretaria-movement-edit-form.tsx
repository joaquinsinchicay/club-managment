"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";

import { formatSessionDateLong } from "@/lib/dates";
import { ModalFooter } from "@/components/ui/modal-footer";
import {
  FIELD_LABEL_CLASSNAME,
  FormInput,
  FormSelect,
} from "@/components/ui/modal-form";
import { PendingFieldset } from "@/components/ui/pending-form";
import { useTreasuryData } from "@/lib/contexts/treasury-data-context";
import { texts } from "@/lib/texts";
import { cn } from "@/lib/utils";

import {
  type BaseMovementFormProps,
  DISABLED_CONTROL_CLASSNAME,
  type EditableMovement,
  type MovementFormState,
  type OperationalFormCopy,
  buildEditMovementFormState,
  getDefaultCurrencyCode,
  getRequiredLabel,
  isMovementFormValid,
  normalizeAmountInputOnBlur,
  normalizeAmountInputOnFocus,
  sanitizeAmountInput,
} from "./_shared";
import { CostCenterMultiSelect } from "./cost-center-multiselect";
import { StaffContractField } from "./staff-contract-field";

export function SecretariaMovementEditForm({
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
}: BaseMovementFormProps & {
  movement: EditableMovement;
  copy?: OperationalFormCopy;
  extraHiddenFields?: ReactNode;
  editableMovementDate?: boolean;
  onCancel: () => void;
}) {
  // Fase 4 · T3.2 — datos de dominio desde context (antes 7 props).
  const { accounts, categories, activities, currencies, movementTypes, receiptFormats, staffContracts } =
    useTreasuryData();
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
