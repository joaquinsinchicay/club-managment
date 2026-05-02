"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { RrhhActionResult } from "@/app/(dashboard)/settings/rrhh/actions";
import {
  formatLocalizedAmountInputOnBlur,
  formatLocalizedAmountInputOnFocus,
  sanitizeLocalizedAmountInput,
} from "@/lib/amounts";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ChipButton } from "@/components/ui/chip";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHeadCell,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import { LinkButton } from "@/components/ui/link-button";
import {
  FormField,
  FormFieldLabel,
  FormHelpText,
  FormInput,
  FormSelect,
  FormTextarea,
} from "@/components/ui/modal-form";
import { triggerClientFeedback } from "@/lib/client-feedback";
import type { StaffContract } from "@/lib/domain/staff-contract";
import {
  SALARY_REVISION_ADJUSTMENT_TYPES,
  type SalaryRevisionAdjustmentType,
} from "@/lib/domain/staff-contract-revision";
import { rrhh as txtRrhh } from "@/lib/texts";

type BulkRevisionFormProps = {
  contracts: StaffContract[];
  clubCurrencyCode: string;
  bulkAction: (formData: FormData) => Promise<RrhhActionResult>;
};

const brTexts = txtRrhh.bulk_revision;

function formatAmount(amount: number | null, currencyCode: string): string {
  if (amount === null) return "—";
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function parseLocalized(value: string): number | null {
  const normalized = value.replace(/\./g, "").replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function computeNewAmount(
  current: number,
  type: SalaryRevisionAdjustmentType,
  value: number,
): number {
  switch (type) {
    case "percent":
      return Math.round(current * (1 + value / 100) * 100) / 100;
    case "fixed":
      return Math.round((current + value) * 100) / 100;
    case "set":
      return value;
  }
}

export function BulkRevisionForm({
  contracts,
  clubCurrencyCode,
  bulkAction,
}: BulkRevisionFormProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [roleFilter, setRoleFilter] = useState<string>("");
  const [activityFilter, setActivityFilter] = useState<string>("");
  const [structureFilter, setStructureFilter] = useState<string>("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const [adjustmentType, setAdjustmentType] =
    useState<SalaryRevisionAdjustmentType>("percent");
  const [valueInput, setValueInput] = useState("");
  const [effectiveDate, setEffectiveDate] = useState(todayIso());
  const [reason, setReason] = useState("");
  const [pending, setPending] = useState(false);

  const availableRoles = useMemo(() => {
    const set = new Set<string>();
    contracts.forEach((c) => {
      if (c.salaryStructureRole) set.add(c.salaryStructureRole);
    });
    return Array.from(set).sort();
  }, [contracts]);

  const availableActivities = useMemo(() => {
    const map = new Map<string, string>();
    contracts.forEach((c) => {
      if (c.salaryStructureActivityId && c.salaryStructureActivityName) {
        map.set(c.salaryStructureActivityId, c.salaryStructureActivityName);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [contracts]);

  const availableStructures = useMemo(() => {
    const map = new Map<string, string>();
    contracts.forEach((c) => {
      if (c.salaryStructureId && c.salaryStructureName) {
        map.set(c.salaryStructureId, c.salaryStructureName);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [contracts]);

  const filtered = useMemo(() => {
    return contracts.filter((c) => {
      if (c.status !== "vigente") return false;
      if (roleFilter && c.salaryStructureRole !== roleFilter) return false;
      if (activityFilter && c.salaryStructureActivityId !== activityFilter) return false;
      if (structureFilter && c.salaryStructureId !== structureFilter) return false;
      return true;
    });
  }, [contracts, roleFilter, activityFilter, structureFilter]);

  const parsedValue = parseLocalized(valueInput);

  function toggleSelection(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selected.size === filtered.length && filtered.length > 0) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map((c) => c.id)));
    }
  }

  async function handleSubmit() {
    if (selected.size === 0 || parsedValue === null || !reason.trim()) return;

    const formData = new FormData();
    Array.from(selected).forEach((id) => formData.append("contract_ids", id));
    formData.set("adjustment_type", adjustmentType);
    formData.set("value", valueInput);
    formData.set("effective_date", effectiveDate);
    formData.set("reason", reason);

    setPending(true);
    try {
      const result = await bulkAction(formData);
      triggerClientFeedback("settings", result.code);
      if (result.ok) {
        setSelected(new Set());
        setValueInput("");
        setReason("");
        startTransition(() => router.refresh());
      }
    } finally {
      setPending(false);
    }
  }

  const canSubmit =
    selected.size > 0 &&
    parsedValue !== null &&
    parsedValue !== 0 &&
    reason.trim().length > 0 &&
    effectiveDate;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <LinkButton href="/rrhh/contracts" variant="secondary" size="sm">
          {brTexts.back_cta}
        </LinkButton>
      </div>

      <header className="flex flex-col gap-1">
        <h1 className="text-h2 font-bold text-foreground">{brTexts.title}</h1>
        <p className="text-sm text-muted-foreground">{brTexts.description}</p>
      </header>

      <Card padding="comfortable">
        <CardHeader eyebrow={brTexts.filters_eyebrow} title={brTexts.filters_title} />
        <CardBody>
          <div className="grid gap-3 sm:grid-cols-3">
            <FormField>
              <FormFieldLabel>{brTexts.filter_role_label}</FormFieldLabel>
              <FormSelect value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
                <option value="">{brTexts.filter_role_all}</option>
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </FormSelect>
            </FormField>
            <FormField>
              <FormFieldLabel>{brTexts.filter_activity_label}</FormFieldLabel>
              <FormSelect
                value={activityFilter}
                onChange={(e) => setActivityFilter(e.target.value)}
              >
                <option value="">{brTexts.filter_activity_all}</option>
                {availableActivities.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </FormSelect>
            </FormField>
            <FormField>
              <FormFieldLabel>{brTexts.filter_structure_label}</FormFieldLabel>
              <FormSelect
                value={structureFilter}
                onChange={(e) => setStructureFilter(e.target.value)}
              >
                <option value="">{brTexts.filter_structure_all}</option>
                {availableStructures.map(([id, name]) => (
                  <option key={id} value={id}>
                    {name}
                  </option>
                ))}
              </FormSelect>
            </FormField>
          </div>
        </CardBody>
      </Card>

      <Card padding="none">
        <CardHeader
          eyebrow={brTexts.selection_eyebrow}
          title={brTexts.selection_title.replace("{count}", String(selected.size))}
          action={
            filtered.length > 0 ? (
              <ChipButton onClick={toggleAll}>
                {selected.size === filtered.length
                  ? brTexts.deselect_all_cta
                  : brTexts.select_all_cta}
              </ChipButton>
            ) : undefined
          }
          divider
        />
        <CardBody>
          {filtered.length === 0 ? (
            <DataTableEmpty
              title={brTexts.empty_title}
              description={brTexts.empty_description}
            />
          ) : (
            <DataTable
              density="comfortable"
              gridColumns="48px minmax(0,1fr) minmax(0,1fr) 140px 140px"
            >
              <DataTableHeader>
                <DataTableHeadCell />
                <DataTableHeadCell>{brTexts.col_member}</DataTableHeadCell>
                <DataTableHeadCell>{brTexts.col_structure}</DataTableHeadCell>
                <DataTableHeadCell align="right">{brTexts.col_current}</DataTableHeadCell>
                <DataTableHeadCell align="right">{brTexts.col_preview}</DataTableHeadCell>
              </DataTableHeader>
              <DataTableBody>
                {filtered.map((c) => {
                  const isSelected = selected.has(c.id);
                  const preview =
                    isSelected && parsedValue !== null && c.currentAmount !== null
                      ? computeNewAmount(c.currentAmount, adjustmentType, parsedValue)
                      : null;
                  return (
                    <DataTableRow key={c.id} density="comfortable">
                      <DataTableCell>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelection(c.id)}
                          className="size-4 rounded border-border text-foreground focus:ring-foreground"
                        />
                      </DataTableCell>
                      <DataTableCell>
                        <span className="font-medium text-foreground">
                          {c.staffMemberName ?? "—"}
                        </span>
                      </DataTableCell>
                      <DataTableCell>
                        <span className="grid leading-tight">
                          <span className="text-sm text-foreground">
                            {c.salaryStructureName ?? "—"}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {c.salaryStructureRole ?? ""}
                            {c.salaryStructureActivityName
                              ? ` · ${c.salaryStructureActivityName}`
                              : ""}
                          </span>
                        </span>
                      </DataTableCell>
                      <DataTableCell align="right">
                        <span className="tabular-nums font-semibold text-foreground">
                          {formatAmount(c.currentAmount, clubCurrencyCode)}
                        </span>
                      </DataTableCell>
                      <DataTableCell align="right">
                        <span className="tabular-nums text-muted-foreground">
                          {formatAmount(preview, clubCurrencyCode)}
                        </span>
                      </DataTableCell>
                    </DataTableRow>
                  );
                })}
              </DataTableBody>
            </DataTable>
          )}
        </CardBody>
      </Card>

      <Card padding="comfortable">
        <CardHeader eyebrow={brTexts.adjust_eyebrow} title={brTexts.adjust_title} />
        <CardBody>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField>
              <FormFieldLabel required>{brTexts.form_adjustment_type_label}</FormFieldLabel>
              <FormSelect
                value={adjustmentType}
                onChange={(e) =>
                  setAdjustmentType(e.target.value as SalaryRevisionAdjustmentType)
                }
              >
                {SALARY_REVISION_ADJUSTMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {brTexts.adjustment_type_options[t]}
                  </option>
                ))}
              </FormSelect>
              <FormHelpText>{brTexts.form_adjustment_type_helper}</FormHelpText>
            </FormField>
            <FormField>
              <FormFieldLabel required>{brTexts.form_value_label}</FormFieldLabel>
              <FormInput
                type="text"
                inputMode="decimal"
                value={valueInput}
                onChange={(e) => setValueInput(sanitizeLocalizedAmountInput(e.target.value))}
                onBlur={(e) => setValueInput(formatLocalizedAmountInputOnBlur(e.target.value))}
                onFocus={(e) => setValueInput(formatLocalizedAmountInputOnFocus(e.target.value))}
                placeholder={
                  adjustmentType === "percent"
                    ? brTexts.form_value_placeholder_percent
                    : brTexts.form_value_placeholder_amount
                }
                className="tabular-nums"
              />
              <FormHelpText>
                {adjustmentType === "percent"
                  ? brTexts.form_value_helper_percent
                  : brTexts.form_value_helper_amount.replace("{currency}", clubCurrencyCode)}
              </FormHelpText>
            </FormField>
          </div>

          <div className="mt-4 grid gap-4">
            <FormField>
              <FormFieldLabel required>{brTexts.form_effective_date_label}</FormFieldLabel>
              <FormInput
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                required
              />
              <FormHelpText>{brTexts.form_effective_date_helper}</FormHelpText>
            </FormField>
            <FormField>
              <FormFieldLabel required>{brTexts.form_reason_label}</FormFieldLabel>
              <FormTextarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder={brTexts.form_reason_placeholder}
                maxLength={500}
              />
              <FormHelpText>{brTexts.form_reason_helper}</FormHelpText>
            </FormField>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canSubmit || pending}
              className={buttonClass({ variant: "primary", size: "md" })}
            >
              {pending ? brTexts.submit_pending : brTexts.submit_cta}
            </button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
