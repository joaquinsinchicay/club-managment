"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { SettlementActionResult } from "@/app/(dashboard)/rrhh/settlements/actions";
import { Avatar } from "@/components/ui/avatar";
import { Button, buttonClass } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import {
  DataTable,
  DataTableActions,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableRow,
} from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { ModalFooter } from "@/components/ui/modal-footer";
import {
  FormField,
  FormFieldLabel,
  FormHelpText,
  FormInput,
  FormReadonly,
  FormSelect,
  FormTextarea,
} from "@/components/ui/modal-form";
import { triggerClientFeedback } from "@/lib/client-feedback";
import type { TreasuryAccount } from "@/lib/domain/access";
import {
  formatPeriodLabel,
  type PayrollSettlement,
  type PayrollSettlementAdjustment,
} from "@/lib/domain/payroll-settlement";
import { formatContractCode } from "@/lib/domain/staff-contract";
import {
  buildPayrollCsvFileName,
  formatPayrollPendingCsv,
} from "@/lib/services/treasury-payroll-csv";
import { texts } from "@/lib/texts";

type Props = {
  settlements: PayrollSettlement[];
  adjustmentsBySettlementId: Record<string, PayrollSettlementAdjustment[]>;
  approverNamesByUserId: Record<string, string>;
  clubCurrencyCode: string;
  payableAccounts: TreasuryAccount[];
  payAction: (formData: FormData) => Promise<SettlementActionResult>;
  payBatchAction: (formData: FormData) => Promise<SettlementActionResult>;
  returnAction: (formData: FormData) => Promise<SettlementActionResult>;
};

type SortKey =
  | "period_desc"
  | "period_asc"
  | "amount_desc"
  | "amount_asc"
  | "approved_desc"
  | "approved_asc"
  | "staff_asc"
  | "staff_desc";

const tTexts = texts.dashboard.treasury.payroll;
const sTexts = texts.rrhh.settlements;

function formatAmount(amount: number | null | undefined, currencyCode: string): string {
  if (amount === null || amount === undefined) return "—";
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

function formatIsoDateShort(iso: string | null): string {
  if (!iso) return "—";
  const [, m, d] = iso.slice(0, 10).split("-");
  if (!m || !d) return iso;
  return `${d}/${m}`;
}

function daysSince(iso: string | null): number | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return null;
  return Math.floor((Date.now() - t) / (24 * 60 * 60 * 1000));
}

function templateFill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));
}

export function TreasuryPayrollTab({
  settlements,
  adjustmentsBySettlementId,
  approverNamesByUserId,
  clubCurrencyCode,
  payableAccounts,
  payAction,
  payBatchAction,
  returnAction,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [staffFilter, setStaffFilter] = useState<string>("all");
  const [structureFilter, setStructureFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("period_desc");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const [paying, setPaying] = useState<PayrollSettlement | null>(null);
  const [payingBulk, setPayingBulk] = useState(false);
  const [returning, setReturning] = useState<PayrollSettlement | null>(null);

  const [payPending, setPayPending] = useState(false);
  const [payBulkPending, setPayBulkPending] = useState(false);
  const [returnPending, setReturnPending] = useState(false);

  const availablePeriods = useMemo(() => {
    const set = new Set<string>();
    for (const s of settlements) set.add(formatPeriodLabel(s.periodYear, s.periodMonth));
    return Array.from(set).sort().reverse();
  }, [settlements]);

  const availableStaff = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of settlements) {
      if (s.staffMemberId && s.staffMemberName) {
        map.set(s.staffMemberId, s.staffMemberName);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [settlements]);

  const availableStructures = useMemo(() => {
    const map = new Map<string, string>();
    for (const s of settlements) {
      if (s.salaryStructureId && s.salaryStructureName) {
        map.set(s.salaryStructureId, s.salaryStructureName);
      }
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [settlements]);

  const filtered = useMemo(() => {
    const list = settlements.filter((s) => {
      if (periodFilter !== "all") {
        if (formatPeriodLabel(s.periodYear, s.periodMonth) !== periodFilter) return false;
      }
      if (staffFilter !== "all" && s.staffMemberId !== staffFilter) return false;
      if (structureFilter !== "all" && s.salaryStructureId !== structureFilter) return false;
      return true;
    });

    const sorted = [...list];
    sorted.sort((a, b) => {
      switch (sortKey) {
        case "period_asc":
          return (
            a.periodYear - b.periodYear ||
            a.periodMonth - b.periodMonth ||
            (a.staffMemberName ?? "").localeCompare(b.staffMemberName ?? "", "es")
          );
        case "period_desc":
          return (
            b.periodYear - a.periodYear ||
            b.periodMonth - a.periodMonth ||
            (a.staffMemberName ?? "").localeCompare(b.staffMemberName ?? "", "es")
          );
        case "amount_desc":
          return b.totalAmount - a.totalAmount;
        case "amount_asc":
          return a.totalAmount - b.totalAmount;
        case "approved_desc":
          return (b.approvedAt ?? "").localeCompare(a.approvedAt ?? "");
        case "approved_asc":
          return (a.approvedAt ?? "").localeCompare(b.approvedAt ?? "");
        case "staff_asc":
          return (a.staffMemberName ?? "").localeCompare(b.staffMemberName ?? "", "es");
        case "staff_desc":
          return (b.staffMemberName ?? "").localeCompare(a.staffMemberName ?? "", "es");
        default:
          return 0;
      }
    });
    return sorted;
  }, [settlements, periodFilter, staffFilter, structureFilter, sortKey]);

  const selectableIds = useMemo(() => filtered.map((s) => s.id), [filtered]);
  const allSelected =
    selectableIds.length > 0 && selectedIds.length === selectableIds.length;
  const selectedSettlements = useMemo(
    () => filtered.filter((s) => selectedIds.includes(s.id)),
    [filtered, selectedIds],
  );
  const selectedTotal = selectedSettlements.reduce((acc, s) => acc + s.totalAmount, 0);

  const totalPending = settlements.length;
  const totalPendingAmount = settlements.reduce((acc, s) => acc + s.totalAmount, 0);
  const hasFilters =
    periodFilter !== "all" || staffFilter !== "all" || structureFilter !== "all";

  async function runAction(
    action: (fd: FormData) => Promise<SettlementActionResult>,
    formData: FormData,
    onSuccess: () => void,
    setPending: (v: boolean) => void,
  ) {
    setPending(true);
    try {
      const result = await action(formData);
      triggerClientFeedback("dashboard", result.code);
      if (result.ok) {
        onSuccess();
        startTransition(() => router.refresh());
      }
    } finally {
      setPending(false);
    }
  }

  function toggleSelection(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }
  function toggleAll() {
    setSelectedIds((prev) => (prev.length === selectableIds.length ? [] : selectableIds));
  }
  function clearFilters() {
    setPeriodFilter("all");
    setStaffFilter("all");
    setStructureFilter("all");
  }

  function handleExport() {
    const csv = formatPayrollPendingCsv(filtered, clubCurrencyCode, approverNamesByUserId);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = buildPayrollCsvFileName();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <span className="text-eyebrow uppercase text-muted-foreground">
            {tTexts.header_eyebrow}
          </span>
          <h2 className="text-lg font-semibold text-foreground">{tTexts.header_title}</h2>
          <p className="text-sm text-muted-foreground">{tTexts.header_description}</p>
        </div>
        <Button variant="secondary" size="sm" onClick={handleExport} disabled={totalPending === 0}>
          {tTexts.export_cta}
        </Button>
      </header>

      <p className="text-sm text-muted-foreground">
        {templateFill(tTexts.summary_template, {
          count: totalPending,
          total: formatAmount(totalPendingAmount, clubCurrencyCode),
        })}
      </p>

      {/* Filters card */}
      {settlements.length > 0 ? (
        <Card padding="compact">
          <CardBody>
            <div className="grid gap-3 sm:grid-cols-3">
              <FormField>
                <FormFieldLabel>{tTexts.filter_period_label}</FormFieldLabel>
                <FormSelect
                  value={periodFilter}
                  onChange={(e) => setPeriodFilter(e.target.value)}
                >
                  <option value="all">{tTexts.filter_all_period}</option>
                  {availablePeriods.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </FormSelect>
              </FormField>
              <FormField>
                <FormFieldLabel>{tTexts.filter_staff_label}</FormFieldLabel>
                <FormSelect
                  value={staffFilter}
                  onChange={(e) => setStaffFilter(e.target.value)}
                >
                  <option value="all">{tTexts.filter_all_staff}</option>
                  {availableStaff.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </FormSelect>
              </FormField>
              <FormField>
                <FormFieldLabel>{tTexts.filter_structure_label}</FormFieldLabel>
                <FormSelect
                  value={structureFilter}
                  onChange={(e) => setStructureFilter(e.target.value)}
                >
                  <option value="all">{tTexts.filter_all_structure}</option>
                  {availableStructures.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </FormSelect>
              </FormField>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-sm">
              <span className="text-muted-foreground">
                {templateFill(tTexts.filter_count_template, {
                  shown: filtered.length,
                  total: settlements.length,
                })}
                {hasFilters ? (
                  <>
                    {" · "}
                    <button
                      type="button"
                      onClick={clearFilters}
                      className="font-medium text-foreground hover:underline"
                    >
                      {tTexts.filter_clear_cta}
                    </button>
                  </>
                ) : null}
              </span>
              <label className="flex items-center gap-2 text-muted-foreground">
                <span>{tTexts.sort_label}</span>
                <FormSelect
                  value={sortKey}
                  onChange={(e) => setSortKey(e.target.value as SortKey)}
                  className="min-w-[200px]"
                >
                  <option value="period_desc">{tTexts.sort_period_desc}</option>
                  <option value="period_asc">{tTexts.sort_period_asc}</option>
                  <option value="amount_desc">{tTexts.sort_amount_desc}</option>
                  <option value="amount_asc">{tTexts.sort_amount_asc}</option>
                  <option value="approved_desc">{tTexts.sort_approved_desc}</option>
                  <option value="approved_asc">{tTexts.sort_approved_asc}</option>
                  <option value="staff_asc">{tTexts.sort_staff_asc}</option>
                  <option value="staff_desc">{tTexts.sort_staff_desc}</option>
                </FormSelect>
              </label>
            </div>
          </CardBody>
        </Card>
      ) : null}

      {/* Bulk action bar */}
      {selectedIds.length > 0 ? (
        <Card
          padding="none"
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        >
          <span className="text-sm font-medium text-foreground">
            {tTexts.bulk_selected_prefix}
            {selectedIds.length} · {formatAmount(selectedTotal, clubCurrencyCode)}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setSelectedIds([])}>
              {tTexts.bulk_clear_cta}
            </Button>
            <Button variant="primary" size="sm" onClick={() => setPayingBulk(true)}>
              {tTexts.bulk_pay_cta}
            </Button>
          </div>
        </Card>
      ) : null}

      {/* Tray */}
      {filtered.length === 0 ? (
        <DataTableEmpty
          title={settlements.length === 0 ? tTexts.empty_title : tTexts.empty_filter_title}
          description={
            settlements.length === 0
              ? tTexts.empty_description
              : tTexts.empty_filter_description
          }
        />
      ) : (
        <div className="flex items-center gap-2 px-1">
          <input
            type="checkbox"
            aria-label={tTexts.select_all_label}
            checked={allSelected}
            onChange={toggleAll}
            disabled={selectableIds.length === 0}
            className="size-4 rounded border-border text-foreground focus:ring-foreground"
          />
          <span className="text-xs text-muted-foreground">{tTexts.select_all_label}</span>
        </div>
      )}

      {filtered.length > 0 ? (
        <DataTable density="compact">
          <DataTableBody>
            {filtered.map((s) => {
              const aging = daysSince(s.approvedAt);
              const agingTone =
                aging === null ? null : aging > 14 ? "expense" : aging > 7 ? "warning" : null;
              const approverName = s.approvedByUserId
                ? approverNamesByUserId[s.approvedByUserId] ?? null
                : null;
              const adjustments = adjustmentsBySettlementId[s.id] ?? [];
              const isExpanded = expandedId === s.id;
              return (
                <DataTableRow key={s.id} useGrid={false}>
                  <div className="flex w-full flex-col gap-2">
                    <div className="flex w-full items-start gap-3">
                      <input
                        type="checkbox"
                        aria-label={`${tTexts.select_row_label} ${s.id}`}
                        checked={selectedIds.includes(s.id)}
                        onChange={() => toggleSelection(s.id)}
                        className="mt-1 size-4 rounded border-border text-foreground focus:ring-foreground"
                      />
                      <Avatar
                        name={s.staffMemberName ?? "—"}
                        size="md"
                        tone="neutral"
                        shape="circle"
                      />
                      <div className="flex flex-1 flex-col gap-0.5">
                        <div className="flex flex-wrap items-center gap-2">
                          {s.staffMemberId ? (
                            <Link
                              href={`/treasury/staff/${s.staffMemberId}`}
                              className="text-sm font-semibold text-foreground hover:underline"
                            >
                              {s.staffMemberName ?? "—"}
                            </Link>
                          ) : (
                            <span className="text-sm font-semibold text-foreground">
                              {s.staffMemberName ?? "—"}
                            </span>
                          )}
                          {agingTone ? (
                            <Chip tone={agingTone} size="sm">
                              {templateFill(tTexts.row_aging_days_template, {
                                days: aging ?? 0,
                              })}
                            </Chip>
                          ) : null}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          <span className="font-mono font-medium text-foreground">
                            {formatContractCode(s.contractId)}
                          </span>
                          {s.salaryStructureRole ? ` · ${s.salaryStructureRole}` : ""}
                          {s.salaryStructureName && s.salaryStructureName !== s.salaryStructureRole
                            ? ` · ${s.salaryStructureName}`
                            : ""}
                          {s.salaryStructureActivityName
                            ? ` · ${s.salaryStructureActivityName}`
                            : ""}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {templateFill(tTexts.row_period_template, {
                            period: formatPeriodLabel(s.periodYear, s.periodMonth),
                          })}
                          {" · "}
                          {approverName
                            ? templateFill(tTexts.row_approved_template, {
                                date: formatIsoDateShort(s.approvedAt),
                                approver: approverName,
                              })
                            : templateFill(tTexts.row_approved_template_no_user, {
                                date: formatIsoDateShort(s.approvedAt),
                              })}
                        </span>
                        {s.notes ? (
                          <p className="text-xs italic text-muted-foreground">
                            &ldquo;{s.notes}&rdquo;
                          </p>
                        ) : null}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className="text-base font-semibold text-foreground">
                          {formatAmount(s.totalAmount, clubCurrencyCode)}
                        </span>
                        <span className="text-eyebrow uppercase tracking-wide text-muted-foreground">
                          {clubCurrencyCode}
                        </span>
                      </div>
                      <DataTableActions reveal={false}>
                        <button
                          type="button"
                          onClick={() => setPaying(s)}
                          className={buttonClass({ variant: "primary", size: "sm" })}
                        >
                          {tTexts.action_pay}
                        </button>
                        <button
                          type="button"
                          onClick={() => setReturning(s)}
                          className={buttonClass({ variant: "secondary", size: "sm" })}
                        >
                          {tTexts.action_return}
                        </button>
                        <button
                          type="button"
                          onClick={() => setExpandedId(isExpanded ? null : s.id)}
                          aria-label={
                            isExpanded
                              ? tTexts.detail_collapse_label
                              : tTexts.detail_expand_label
                          }
                          aria-expanded={isExpanded}
                          className="inline-flex size-8 items-center justify-center rounded-card border border-border bg-card text-foreground hover:bg-secondary-readonly"
                        >
                          <span aria-hidden="true">{isExpanded ? "˄" : "˅"}</span>
                        </button>
                      </DataTableActions>
                    </div>

                    {isExpanded ? (
                      <div className="ml-12 rounded-card border border-border bg-secondary-subtle px-4 py-3">
                        <p className="text-eyebrow uppercase tracking-wide text-muted-foreground">
                          {tTexts.detail_adjustments_title}
                        </p>
                        {adjustments.length === 0 ? (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {tTexts.detail_no_adjustments}
                          </p>
                        ) : (
                          <ul className="mt-2 grid gap-1 text-xs text-foreground">
                            {adjustments.map((a) => (
                              <li key={a.id} className="flex items-baseline justify-between gap-2">
                                <span>{a.concept}</span>
                                <span className="font-medium">
                                  {formatAmount(a.amount, clubCurrencyCode)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ) : null}
                  </div>
                </DataTableRow>
              );
            })}
          </DataTableBody>
        </DataTable>
      ) : null}

      {/* Pay (single) */}
      <Modal
        open={paying !== null}
        onClose={() => !payPending && setPaying(null)}
        title={sTexts.pay_modal_title}
        description={sTexts.pay_modal_description}
        size="md"
        closeDisabled={payPending}
      >
        {paying ? (
          <form
            action={(fd) =>
              runAction(payAction, fd, () => setPaying(null), setPayPending)
            }
            className="grid gap-4"
          >
            <input type="hidden" name="settlement_id" value={paying.id} />
            <FormField>
              <FormFieldLabel>{sTexts.col_member}</FormFieldLabel>
              <FormReadonly>
                {paying.staffMemberName ?? "—"} ·{" "}
                {formatPeriodLabel(paying.periodYear, paying.periodMonth)}
              </FormReadonly>
            </FormField>
            <FormField>
              <FormFieldLabel>{sTexts.pay_amount_label}</FormFieldLabel>
              <FormReadonly>{formatAmount(paying.totalAmount, clubCurrencyCode)}</FormReadonly>
            </FormField>
            <FormField>
              <FormFieldLabel required>{sTexts.pay_account_label}</FormFieldLabel>
              <FormSelect name="account_id" required defaultValue="">
                <option value="" disabled>
                  {sTexts.pay_account_placeholder}
                </option>
                {payableAccounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </FormSelect>
              <FormHelpText>{sTexts.pay_account_helper}</FormHelpText>
            </FormField>
            <FormField>
              <FormFieldLabel required>{sTexts.pay_date_label}</FormFieldLabel>
              <FormInput
                type="date"
                name="payment_date"
                required
                defaultValue={new Date().toISOString().slice(0, 10)}
              />
            </FormField>
            <FormField>
              <FormFieldLabel>{sTexts.pay_receipt_label}</FormFieldLabel>
              <FormInput
                type="text"
                name="receipt_number"
                maxLength={50}
                placeholder={sTexts.pay_receipt_placeholder}
              />
            </FormField>
            <FormField>
              <FormFieldLabel>{sTexts.pay_notes_label}</FormFieldLabel>
              <FormTextarea
                name="notes"
                rows={2}
                maxLength={500}
                placeholder={sTexts.pay_notes_placeholder}
              />
            </FormField>
            <ModalFooter
              onCancel={() => setPaying(null)}
              cancelLabel={sTexts.cancel_cta}
              submitLabel={sTexts.pay_submit_cta}
              pendingLabel={sTexts.submit_pending}
            />
          </form>
        ) : null}
      </Modal>

      {/* Pay bulk */}
      <Modal
        open={payingBulk}
        onClose={() => !payBulkPending && setPayingBulk(false)}
        title={sTexts.pay_bulk_modal_title}
        description={sTexts.pay_bulk_modal_description}
        size="md"
        closeDisabled={payBulkPending}
      >
        <form
          action={(fd) =>
            runAction(
              payBatchAction,
              fd,
              () => {
                setPayingBulk(false);
                setSelectedIds([]);
              },
              setPayBulkPending,
            )
          }
          className="grid gap-4"
        >
          {selectedSettlements.map((s) => (
            <input key={s.id} type="hidden" name="settlement_ids" value={s.id} />
          ))}
          <Card padding="compact" tone="muted">
            <CardBody>
              <div className="grid gap-1 text-sm">
                <span>
                  <strong>{sTexts.bulk_summary_count}:</strong>{" "}
                  {selectedSettlements.length}
                </span>
                <span>
                  <strong>{sTexts.bulk_summary_total}:</strong>{" "}
                  {formatAmount(selectedTotal, clubCurrencyCode)}
                </span>
              </div>
            </CardBody>
          </Card>
          <FormField>
            <FormFieldLabel required>{sTexts.pay_account_label}</FormFieldLabel>
            <FormSelect name="account_id" required defaultValue="">
              <option value="" disabled>
                {sTexts.pay_account_placeholder}
              </option>
              {payableAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </FormSelect>
            <FormHelpText>{sTexts.pay_account_helper}</FormHelpText>
          </FormField>
          <FormField>
            <FormFieldLabel required>{sTexts.pay_date_label}</FormFieldLabel>
            <FormInput
              type="date"
              name="payment_date"
              required
              defaultValue={new Date().toISOString().slice(0, 10)}
            />
          </FormField>
          <FormField>
            <FormFieldLabel>{sTexts.pay_bulk_notes_label}</FormFieldLabel>
            <FormTextarea
              name="notes"
              rows={2}
              maxLength={500}
              placeholder={sTexts.pay_notes_placeholder}
            />
            <FormHelpText>{sTexts.pay_bulk_notes_helper}</FormHelpText>
          </FormField>
          <ModalFooter
            onCancel={() => setPayingBulk(false)}
            cancelLabel={sTexts.cancel_cta}
            submitLabel={sTexts.pay_bulk_submit_cta}
            pendingLabel={sTexts.submit_pending}
          />
        </form>
      </Modal>

      {/* Return to "generada" (US-70) */}
      <Modal
        open={returning !== null}
        onClose={() => !returnPending && setReturning(null)}
        title={sTexts.return_modal_title}
        description={sTexts.return_modal_description}
        size="sm"
        closeDisabled={returnPending}
      >
        {returning ? (
          <form
            action={(fd) =>
              runAction(returnAction, fd, () => setReturning(null), setReturnPending)
            }
            className="grid gap-4"
          >
            <input type="hidden" name="settlement_id" value={returning.id} />
            <FormField>
              <FormFieldLabel>{sTexts.col_member}</FormFieldLabel>
              <FormReadonly>
                {returning.staffMemberName ?? "—"} ·{" "}
                {formatPeriodLabel(returning.periodYear, returning.periodMonth)}
              </FormReadonly>
            </FormField>
            <FormField>
              <FormFieldLabel required>{sTexts.return_reason_label}</FormFieldLabel>
              <FormTextarea
                name="reason"
                rows={3}
                required
                maxLength={500}
                placeholder={sTexts.return_reason_placeholder}
              />
            </FormField>
            <ModalFooter
              onCancel={() => setReturning(null)}
              cancelLabel={sTexts.cancel_cta}
              submitLabel={sTexts.return_submit_cta}
              pendingLabel={sTexts.submit_pending}
            />
          </form>
        ) : null}
      </Modal>
    </div>
  );
}
