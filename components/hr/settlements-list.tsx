"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { SettlementActionResult } from "@/app/(dashboard)/rrhh/settlements/actions";
import { Button, buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ChipButton } from "@/components/ui/chip";
import {
  DataTable,
  DataTableActions,
  DataTableBody,
  DataTableCell,
  DataTableChip,
  DataTableHeadCell,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { ModalFooter } from "@/components/ui/modal-footer";
import {
  FormBanner,
  FormCheckboxCard,
  FormField,
  FormFieldLabel,
  FormHelpText,
  FormInput,
  FormReadonly,
  FormSelect,
  FormTextarea,
} from "@/components/ui/modal-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { triggerClientFeedback } from "@/lib/client-feedback";
import type { TreasuryAccount } from "@/lib/domain/access";
import {
  PAYROLL_ADJUSTMENT_TYPES,
  currentPeriodYearMonth,
  formatPeriodLabel,
  type PayrollAdjustmentType,
  type PayrollSettlement,
  type PayrollSettlementAdjustment,
  type PayrollSettlementStatus,
} from "@/lib/domain/payroll-settlement";
import { texts } from "@/lib/texts";

type SettlementsListProps = {
  settlements: PayrollSettlement[];
  adjustmentsBySettlementId: Record<string, PayrollSettlementAdjustment[]>;
  clubCurrencyCode: string;
  canOperate: boolean;
  payableAccounts: TreasuryAccount[];
  generateAction: (formData: FormData) => Promise<SettlementActionResult>;
  addAdjustmentAction: (formData: FormData) => Promise<SettlementActionResult>;
  deleteAdjustmentAction: (formData: FormData) => Promise<SettlementActionResult>;
  updateHoursOrNotesAction: (formData: FormData) => Promise<SettlementActionResult>;
  confirmAction: (formData: FormData) => Promise<SettlementActionResult>;
  confirmBulkAction: (formData: FormData) => Promise<SettlementActionResult>;
  annulAction: (formData: FormData) => Promise<SettlementActionResult>;
  payAction: (formData: FormData) => Promise<SettlementActionResult>;
  payBatchAction: (formData: FormData) => Promise<SettlementActionResult>;
};

type StatusFilter = "all" | PayrollSettlementStatus;

const sTexts = texts.rrhh.settlements;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: sTexts.filter_all },
  { value: "generada", label: sTexts.filter_generada },
  { value: "confirmada", label: sTexts.filter_confirmada },
  { value: "pagada", label: sTexts.filter_pagada },
  { value: "anulada", label: sTexts.filter_anulada },
];

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

function settlementStatusTone(status: PayrollSettlementStatus) {
  if (status === "generada") return "warning" as const;
  if (status === "confirmada") return "accent" as const;
  if (status === "pagada") return "success" as const;
  return "neutral" as const;
}

export function SettlementsList({
  settlements,
  adjustmentsBySettlementId,
  clubCurrencyCode,
  canOperate,
  payableAccounts,
  generateAction,
  addAdjustmentAction,
  deleteAdjustmentAction,
  updateHoursOrNotesAction,
  confirmAction,
  confirmBulkAction,
  annulAction,
  payAction,
  payBatchAction,
}: SettlementsListProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<string>("all"); // "YYYY-MM"
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [generateOpen, setGenerateOpen] = useState(false);
  const [editingDetail, setEditingDetail] = useState<PayrollSettlement | null>(null);
  const [confirmingOne, setConfirmingOne] = useState<PayrollSettlement | null>(null);
  const [confirmingBulk, setConfirmingBulk] = useState(false);
  const [annulling, setAnnulling] = useState<PayrollSettlement | null>(null);
  const [paying, setPaying] = useState<PayrollSettlement | null>(null);
  const [payingBulk, setPayingBulk] = useState(false);

  const [genPending, setGenPending] = useState(false);
  const [confirmPending, setConfirmPending] = useState(false);
  const [bulkPending, setBulkPending] = useState(false);
  const [annulPending, setAnnulPending] = useState(false);
  const [payPending, setPayPending] = useState(false);
  const [payBulkPending, setPayBulkPending] = useState(false);

  const availablePeriods = useMemo(() => {
    const set = new Set<string>();
    for (const s of settlements) {
      set.add(formatPeriodLabel(s.periodYear, s.periodMonth));
    }
    return Array.from(set).sort().reverse();
  }, [settlements]);

  const filtered = useMemo(() => {
    return settlements.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (periodFilter !== "all") {
        const label = formatPeriodLabel(s.periodYear, s.periodMonth);
        if (label !== periodFilter) return false;
      }
      return true;
    });
  }, [settlements, statusFilter, periodFilter]);

  const selectableIds = useMemo(
    () =>
      filtered
        .filter((s) => s.status === "generada" || s.status === "confirmada")
        .map((s) => s.id),
    [filtered],
  );
  const allSelected =
    selectableIds.length > 0 && selectedIds.length === selectableIds.length;

  const selectedSettlements = useMemo(
    () => filtered.filter((s) => selectedIds.includes(s.id)),
    [filtered, selectedIds],
  );
  const selectedHasZero = selectedSettlements.some((s) => s.totalAmount === 0);
  const selectedTotal = selectedSettlements.reduce((acc, s) => acc + s.totalAmount, 0);
  const selectionMode: "none" | "confirm" | "pay" | "mixed" = (() => {
    if (selectedSettlements.length === 0) return "none";
    const allGenerada = selectedSettlements.every((s) => s.status === "generada");
    const allConfirmada = selectedSettlements.every((s) => s.status === "confirmada");
    if (allGenerada) return "confirm";
    if (allConfirmada) return "pay";
    return "mixed";
  })();

  async function runAction(
    action: (fd: FormData) => Promise<SettlementActionResult>,
    formData: FormData,
    onSuccess: (data?: unknown) => void,
    setPending: (v: boolean) => void,
  ) {
    setPending(true);
    try {
      const result = await action(formData);
      triggerClientFeedback("dashboard", result.code);
      if (result.ok) {
        onSuccess(result.data);
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

  const { year: curYear, month: curMonth } = currentPeriodYearMonth();

  return (
    <div className="grid gap-6">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div className="grid gap-1">
          <span className="text-eyebrow uppercase text-muted-foreground">
            {sTexts.page_eyebrow}
          </span>
          <h1 className="text-h2 font-semibold tracking-tight text-foreground">
            {sTexts.page_title}
          </h1>
          <p className="text-sm text-muted-foreground">{sTexts.page_description}</p>
        </div>
        {canOperate ? (
          <Button variant="primary" onClick={() => setGenerateOpen(true)}>
            {sTexts.generate_cta}
          </Button>
        ) : null}
      </header>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <ChipButton
            key={f.value}
            active={statusFilter === f.value}
            onClick={() => setStatusFilter(f.value)}
          >
            {f.label}
          </ChipButton>
        ))}
        <select
          value={periodFilter}
          onChange={(e) => setPeriodFilter(e.target.value)}
          className="inline-flex items-center rounded-chip border border-border bg-card px-3 py-1 text-xs font-semibold text-foreground hover:bg-secondary"
        >
          <option value="all">{sTexts.filter_period_all}</option>
          {availablePeriods.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>

      {/* Bulk bar */}
      {canOperate && selectedIds.length > 0 ? (
        <Card
          tone="muted"
          padding="none"
          className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
        >
          <span className="text-sm font-medium text-foreground">
            {sTexts.bulk_selected_prefix}
            {selectedIds.length} ·{" "}
            {formatAmount(selectedTotal, clubCurrencyCode)}
            {selectionMode === "mixed" ? (
              <span className="ml-2 text-xs text-ds-amber-700">{sTexts.bulk_mixed_note}</span>
            ) : null}
          </span>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={() => setSelectedIds([])}>
              {sTexts.bulk_clear_cta}
            </Button>
            {selectionMode === "confirm" ? (
              <Button variant="primary" size="sm" onClick={() => setConfirmingBulk(true)}>
                {sTexts.bulk_confirm_cta}
              </Button>
            ) : null}
            {selectionMode === "pay" ? (
              <Button variant="primary" size="sm" onClick={() => setPayingBulk(true)}>
                {sTexts.bulk_pay_cta}
              </Button>
            ) : null}
          </div>
        </Card>
      ) : null}

      {/* Table */}
      {filtered.length === 0 ? (
        settlements.length === 0 ? (
          <EmptyState
            variant="dashed"
            title={sTexts.empty_title}
            description={sTexts.empty_description}
            action={
              canOperate ? (
                <Button variant="primary" onClick={() => setGenerateOpen(true)}>
                  {sTexts.empty_cta}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <EmptyState
            variant="dashed"
            title={sTexts.empty_filter_title}
            description={sTexts.empty_filter_description}
          />
        )
      ) : (
        <DataTable
          density="compact"
          gridColumns="32px 90px minmax(0,1.2fr) minmax(0,1.2fr) 120px 140px 110px 180px"
        >
          <DataTableHeader>
            <DataTableHeadCell>
              <input
                type="checkbox"
                aria-label={sTexts.select_all_label}
                checked={allSelected}
                onChange={toggleAll}
                disabled={selectableIds.length === 0}
                className="size-4 rounded border-border text-foreground focus:ring-foreground"
              />
            </DataTableHeadCell>
            <DataTableHeadCell>{sTexts.col_period}</DataTableHeadCell>
            <DataTableHeadCell>{sTexts.col_member}</DataTableHeadCell>
            <DataTableHeadCell>{sTexts.col_structure}</DataTableHeadCell>
            <DataTableHeadCell align="right">{sTexts.col_base}</DataTableHeadCell>
            <DataTableHeadCell align="right">{sTexts.col_total}</DataTableHeadCell>
            <DataTableHeadCell>{sTexts.col_status}</DataTableHeadCell>
            <DataTableHeadCell />
          </DataTableHeader>
          <DataTableBody>
            {filtered.map((s) => {
              const selectable = s.status === "generada" || s.status === "confirmada";
              return (
                <DataTableRow key={s.id} density="compact" hoverReveal>
                  <DataTableCell>
                    {selectable ? (
                      <input
                        type="checkbox"
                        aria-label={`${sTexts.select_row_label} ${s.id}`}
                        checked={selectedIds.includes(s.id)}
                        onChange={() => toggleSelection(s.id)}
                        className="size-4 rounded border-border text-foreground focus:ring-foreground"
                      />
                    ) : null}
                  </DataTableCell>
                  <DataTableCell>
                    <span className="font-mono text-xs">
                      {formatPeriodLabel(s.periodYear, s.periodMonth)}
                    </span>
                  </DataTableCell>
                  <DataTableCell>
                    <span className="font-medium text-foreground">
                      {s.staffMemberName ?? "—"}
                    </span>
                  </DataTableCell>
                  <DataTableCell>
                    <span className="grid leading-tight">
                      <span className="text-foreground">{s.salaryStructureName ?? "—"}</span>
                      <span className="text-xs text-muted-foreground">
                        {s.salaryStructureRole ?? ""}
                        {s.salaryStructureActivityName
                          ? ` · ${s.salaryStructureActivityName}`
                          : ""}
                      </span>
                    </span>
                  </DataTableCell>
                  <DataTableCell align="right">
                    {formatAmount(s.baseAmount, clubCurrencyCode)}
                    {s.requiresHoursInput ? (
                      <span className="ml-2 text-[10px] font-semibold uppercase text-ds-amber-700">
                        {sTexts.requires_hours_badge}
                      </span>
                    ) : null}
                  </DataTableCell>
                  <DataTableCell align="right">
                    <span className="font-semibold text-foreground">
                      {formatAmount(s.totalAmount, clubCurrencyCode)}
                    </span>
                  </DataTableCell>
                  <DataTableCell>
                    <StatusBadge
                      tone={settlementStatusTone(s.status)}
                      label={sTexts.status_options[s.status]}
                    />
                  </DataTableCell>
                  <DataTableCell align="right">
                    {canOperate ? (
                      <DataTableActions>
                        {s.status === "generada" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setEditingDetail(s)}
                              className={buttonClass({ variant: "secondary", size: "sm" })}
                            >
                              {sTexts.action_detail}
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmingOne(s)}
                              className={buttonClass({ variant: "primary", size: "sm" })}
                            >
                              {sTexts.action_confirm}
                            </button>
                          </>
                        ) : null}
                        {s.status === "confirmada" ? (
                          <button
                            type="button"
                            onClick={() => setPaying(s)}
                            className={buttonClass({ variant: "primary", size: "sm" })}
                          >
                            {sTexts.action_pay}
                          </button>
                        ) : null}
                        {(s.status === "generada" || s.status === "confirmada") ? (
                          <button
                            type="button"
                            onClick={() => setAnnulling(s)}
                            className={buttonClass({ variant: "destructive", size: "sm" })}
                          >
                            {sTexts.action_annul}
                          </button>
                        ) : null}
                        {s.status === "pagada" ? (
                          <button
                            type="button"
                            onClick={() => setAnnulling(s)}
                            className={buttonClass({ variant: "destructive", size: "sm" })}
                            title={sTexts.action_annul_paid_tooltip}
                          >
                            {sTexts.action_annul}
                          </button>
                        ) : null}
                      </DataTableActions>
                    ) : null}
                  </DataTableCell>
                </DataTableRow>
              );
            })}
          </DataTableBody>
        </DataTable>
      )}

      {/* Generate modal */}
      <Modal
        open={generateOpen}
        onClose={() => !genPending && setGenerateOpen(false)}
        title={sTexts.generate_modal_title}
        description={sTexts.generate_modal_description}
        size="sm"
        closeDisabled={genPending}
      >
        <form
          action={(fd) =>
            runAction(
              generateAction,
              fd,
              (data) => {
                setGenerateOpen(false);
                const d = data as
                  | {
                      generatedCount: number;
                      skippedCount: number;
                      errorCount: number;
                    }
                  | undefined;
                if (d) {
                  // Leave a second informative toast when skipped/errors is non-zero
                  if (d.skippedCount > 0 || d.errorCount > 0) {
                    triggerClientFeedback(
                      "dashboard",
                      d.errorCount > 0 ? "settlement_partial" : "settlement_generated",
                    );
                  }
                }
              },
              setGenPending,
            )
          }
          className="grid gap-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField>
              <FormFieldLabel required>{sTexts.generate_month_label}</FormFieldLabel>
              <FormSelect name="month" defaultValue={String(curMonth)} required>
                {Array.from({ length: 12 }).map((_, i) => (
                  <option key={i + 1} value={String(i + 1)}>
                    {String(i + 1).padStart(2, "0")}
                  </option>
                ))}
              </FormSelect>
            </FormField>
            <FormField>
              <FormFieldLabel required>{sTexts.generate_year_label}</FormFieldLabel>
              <FormInput
                type="number"
                name="year"
                defaultValue={curYear}
                min={2024}
                max={2100}
                required
              />
            </FormField>
          </div>
          <FormHelpText>{sTexts.generate_helper}</FormHelpText>
          <ModalFooter
            onCancel={() => setGenerateOpen(false)}
            cancelLabel={sTexts.cancel_cta}
            submitLabel={sTexts.generate_submit_cta}
            pendingLabel={sTexts.submit_pending}
          />
        </form>
      </Modal>

      {/* Detail / edit (adjust + hours + notes) */}
      <Modal
        open={editingDetail !== null}
        onClose={() => setEditingDetail(null)}
        title={sTexts.detail_modal_title}
        description={sTexts.detail_modal_description}
        size="lg"
      >
        {editingDetail ? (
          <SettlementDetailBody
            settlement={editingDetail}
            adjustments={adjustmentsBySettlementId[editingDetail.id] ?? []}
            clubCurrencyCode={clubCurrencyCode}
            onClose={() => setEditingDetail(null)}
            addAdjustmentAction={addAdjustmentAction}
            deleteAdjustmentAction={deleteAdjustmentAction}
            updateHoursOrNotesAction={updateHoursOrNotesAction}
          />
        ) : null}
      </Modal>

      {/* Confirm one */}
      <Modal
        open={confirmingOne !== null}
        onClose={() => !confirmPending && setConfirmingOne(null)}
        title={sTexts.confirm_modal_title}
        size="sm"
        closeDisabled={confirmPending}
      >
        {confirmingOne ? (
          <form
            action={(fd) =>
              runAction(
                confirmAction,
                fd,
                () => setConfirmingOne(null),
                setConfirmPending,
              )
            }
            className="grid gap-4"
          >
            <input type="hidden" name="settlement_id" value={confirmingOne.id} />
            {confirmingOne.totalAmount === 0 ? (
              <>
                <FormBanner variant="warning">{sTexts.confirm_zero_warning}</FormBanner>
                <input type="hidden" name="confirm_zero" value="true" />
              </>
            ) : null}
            <FormField>
              <FormFieldLabel>{sTexts.col_member}</FormFieldLabel>
              <FormReadonly>
                {confirmingOne.staffMemberName ?? "—"} ·{" "}
                {formatPeriodLabel(confirmingOne.periodYear, confirmingOne.periodMonth)}
              </FormReadonly>
            </FormField>
            <FormField>
              <FormFieldLabel>{sTexts.col_total}</FormFieldLabel>
              <FormReadonly>
                {formatAmount(confirmingOne.totalAmount, clubCurrencyCode)}
              </FormReadonly>
            </FormField>
            <ModalFooter
              onCancel={() => setConfirmingOne(null)}
              cancelLabel={sTexts.cancel_cta}
              submitLabel={sTexts.confirm_submit_cta}
              pendingLabel={sTexts.submit_pending}
            />
          </form>
        ) : null}
      </Modal>

      {/* Confirm bulk */}
      <Modal
        open={confirmingBulk}
        onClose={() => !bulkPending && setConfirmingBulk(false)}
        title={sTexts.bulk_modal_title}
        description={sTexts.bulk_modal_description}
        size="md"
        closeDisabled={bulkPending}
      >
        <form
          action={(fd) =>
            runAction(
              confirmBulkAction,
              fd,
              () => {
                setConfirmingBulk(false);
                setSelectedIds([]);
              },
              setBulkPending,
            )
          }
          className="grid gap-4"
        >
          {selectedSettlements.map((s) => (
            <input
              key={s.id}
              type="hidden"
              name="settlement_ids"
              value={s.id}
            />
          ))}
          <Card padding="compact" tone="muted">
            <CardBody>
              <div className="grid gap-1 text-sm">
                <span>
                  <strong>{sTexts.bulk_summary_count}:</strong> {selectedSettlements.length}
                </span>
                <span>
                  <strong>{sTexts.bulk_summary_total}:</strong>{" "}
                  {formatAmount(selectedTotal, clubCurrencyCode)}
                </span>
              </div>
            </CardBody>
          </Card>
          {selectedHasZero ? (
            <FormCheckboxCard
              name="confirm_zero"
              value="true"
              label={sTexts.bulk_confirm_zero_label}
              description={sTexts.bulk_confirm_zero_description}
            />
          ) : null}
          <ModalFooter
            onCancel={() => setConfirmingBulk(false)}
            cancelLabel={sTexts.cancel_cta}
            submitLabel={sTexts.bulk_submit_cta}
            pendingLabel={sTexts.submit_pending}
          />
        </form>
      </Modal>

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
              <FormSelect name="account_id" defaultValue="" required>
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
                defaultValue={new Date().toISOString().slice(0, 10)}
                required
              />
            </FormField>
            <FormField>
              <FormFieldLabel>{sTexts.pay_receipt_label}</FormFieldLabel>
              <FormInput
                type="text"
                name="receipt_number"
                maxLength={120}
                placeholder={sTexts.pay_receipt_placeholder}
              />
            </FormField>
            <FormField>
              <FormFieldLabel>{sTexts.pay_notes_label}</FormFieldLabel>
              <FormTextarea
                name="notes"
                rows={3}
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

      {/* Pay (bulk) */}
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
                  <strong>{sTexts.bulk_summary_count}:</strong> {selectedSettlements.length}
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
            <FormSelect name="account_id" defaultValue="" required>
              <option value="" disabled>
                {sTexts.pay_account_placeholder}
              </option>
              {payableAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </FormSelect>
          </FormField>
          <FormField>
            <FormFieldLabel required>{sTexts.pay_date_label}</FormFieldLabel>
            <FormInput
              type="date"
              name="payment_date"
              defaultValue={new Date().toISOString().slice(0, 10)}
              required
            />
          </FormField>
          <FormField>
            <FormFieldLabel>{sTexts.pay_bulk_notes_label}</FormFieldLabel>
            <FormTextarea name="notes" rows={3} maxLength={500} />
            <FormHelpText>{sTexts.pay_bulk_notes_helper}</FormHelpText>
          </FormField>
          <FormBanner variant="warning">{sTexts.pay_bulk_warning}</FormBanner>
          <ModalFooter
            onCancel={() => setPayingBulk(false)}
            cancelLabel={sTexts.cancel_cta}
            submitLabel={sTexts.pay_bulk_submit_cta}
            pendingLabel={sTexts.submit_pending}
          />
        </form>
      </Modal>

      {/* Annul */}
      <Modal
        open={annulling !== null}
        onClose={() => !annulPending && setAnnulling(null)}
        title={sTexts.annul_modal_title}
        description={sTexts.annul_modal_description}
        size="sm"
        closeDisabled={annulPending}
      >
        {annulling ? (
          <form
            action={(fd) =>
              runAction(annulAction, fd, () => setAnnulling(null), setAnnulPending)
            }
            className="grid gap-4"
          >
            <input type="hidden" name="settlement_id" value={annulling.id} />
            {annulling.status === "pagada" ? (
              <FormBanner variant="warning">{sTexts.annul_paid_warning}</FormBanner>
            ) : (
              <FormBanner variant="destructive">{sTexts.annul_warning}</FormBanner>
            )}
            <FormField>
              <FormFieldLabel>{sTexts.form_reason_label}</FormFieldLabel>
              <FormTextarea
                name="reason"
                rows={3}
                maxLength={500}
                placeholder={sTexts.form_reason_placeholder}
              />
            </FormField>
            <ModalFooter
              onCancel={() => setAnnulling(null)}
              cancelLabel={sTexts.cancel_cta}
              submitLabel={sTexts.annul_submit_cta}
              pendingLabel={sTexts.submit_pending}
              submitVariant="destructive"
            />
          </form>
        ) : null}
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Detail body (edit hours + notes + CRUD adjustments)
// ---------------------------------------------------------------------------

type SettlementDetailBodyProps = {
  settlement: PayrollSettlement;
  adjustments: PayrollSettlementAdjustment[];
  clubCurrencyCode: string;
  onClose: () => void;
  addAdjustmentAction: (formData: FormData) => Promise<SettlementActionResult>;
  deleteAdjustmentAction: (formData: FormData) => Promise<SettlementActionResult>;
  updateHoursOrNotesAction: (formData: FormData) => Promise<SettlementActionResult>;
};

function SettlementDetailBody({
  settlement,
  adjustments,
  clubCurrencyCode,
  onClose,
  addAdjustmentAction,
  deleteAdjustmentAction,
  updateHoursOrNotesAction,
}: SettlementDetailBodyProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [pending, setPending] = useState(false);

  async function runAction(
    action: (fd: FormData) => Promise<SettlementActionResult>,
    formData: FormData,
  ) {
    setPending(true);
    try {
      const result = await action(formData);
      triggerClientFeedback("dashboard", result.code);
      if (result.ok) startTransition(() => router.refresh());
    } finally {
      setPending(false);
    }
  }

  const isHourly =
    settlement.remunerationType === "por_hora" ||
    settlement.remunerationType === "por_clase";

  return (
    <div className="grid gap-5">
      <Card padding="compact" tone="muted">
        <CardHeader
          eyebrow={`${formatPeriodLabel(settlement.periodYear, settlement.periodMonth)}`}
          title={settlement.staffMemberName ?? "—"}
          description={
            (settlement.salaryStructureName ?? "") +
            (settlement.salaryStructureRole ? ` · ${settlement.salaryStructureRole}` : "")
          }
        />
        <CardBody>
          <div className="grid gap-1 text-sm">
            <span>
              <strong>{sTexts.col_base}:</strong>{" "}
              {formatAmount(settlement.baseAmount, clubCurrencyCode)}
            </span>
            <span>
              <strong>{sTexts.adjustments_total_label}:</strong>{" "}
              {formatAmount(settlement.adjustmentsTotal, clubCurrencyCode)}
            </span>
            <span className="text-lg font-semibold text-foreground">
              <strong>{sTexts.col_total}:</strong>{" "}
              {formatAmount(settlement.totalAmount, clubCurrencyCode)}
            </span>
          </div>
        </CardBody>
      </Card>

      {isHourly ? (
        <form
          action={(fd) => runAction(updateHoursOrNotesAction, fd)}
          className="grid gap-3"
        >
          <input type="hidden" name="settlement_id" value={settlement.id} />
          <div className="grid gap-4 sm:grid-cols-2">
            {settlement.remunerationType === "por_hora" ? (
              <FormField>
                <FormFieldLabel>{sTexts.hours_worked_label}</FormFieldLabel>
                <FormInput
                  type="number"
                  name="hours_worked"
                  inputMode="decimal"
                  min="0"
                  step="0.25"
                  defaultValue={settlement.hoursWorked}
                />
              </FormField>
            ) : (
              <FormField>
                <FormFieldLabel>{sTexts.classes_worked_label}</FormFieldLabel>
                <FormInput
                  type="number"
                  name="classes_worked"
                  inputMode="numeric"
                  min="0"
                  step="1"
                  defaultValue={settlement.classesWorked}
                />
              </FormField>
            )}
            <div className="flex items-end">
              <button
                type="submit"
                disabled={pending}
                className={buttonClass({ variant: "secondary" })}
              >
                {sTexts.save_hours_cta}
              </button>
            </div>
          </div>
          <FormHelpText>{sTexts.hours_helper}</FormHelpText>
        </form>
      ) : null}

      {/* Adjustments */}
      <section className="grid gap-2">
        <header className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {sTexts.adjustments_section_title}
          </p>
        </header>

        {adjustments.length === 0 ? (
          <p className="text-xs text-muted-foreground">{sTexts.adjustments_empty}</p>
        ) : (
          <DataTable density="compact" gridColumns="100px minmax(0,1fr) 110px 40px">
            <DataTableHeader>
              <DataTableHeadCell>{sTexts.adjustments_col_type}</DataTableHeadCell>
              <DataTableHeadCell>{sTexts.adjustments_col_concept}</DataTableHeadCell>
              <DataTableHeadCell align="right">{sTexts.adjustments_col_amount}</DataTableHeadCell>
              <DataTableHeadCell />
            </DataTableHeader>
            <DataTableBody>
              {adjustments.map((a) => (
                <DataTableRow key={a.id} density="compact" hoverReveal>
                  <DataTableCell>
                    <DataTableChip
                      tone={a.type === "descuento" ? "expense" : "income"}
                    >
                      {sTexts.adjustment_type_options[a.type]}
                    </DataTableChip>
                  </DataTableCell>
                  <DataTableCell>{a.concept}</DataTableCell>
                  <DataTableCell align="right">
                    <span
                      className={
                        a.type === "descuento"
                          ? "font-semibold text-destructive"
                          : "font-semibold text-foreground"
                      }
                    >
                      {a.type === "descuento" ? "−" : "+"}
                      {formatAmount(a.amount, clubCurrencyCode)}
                    </span>
                  </DataTableCell>
                  <DataTableCell align="right">
                    <DataTableActions>
                      <form
                        action={(fd) => runAction(deleteAdjustmentAction, fd)}
                        className="inline"
                      >
                        <input type="hidden" name="settlement_id" value={settlement.id} />
                        <input type="hidden" name="adjustment_id" value={a.id} />
                        <button
                          type="submit"
                          disabled={pending}
                          className={buttonClass({ variant: "destructive", size: "sm" })}
                          aria-label={sTexts.adjustment_delete_cta}
                        >
                          ×
                        </button>
                      </form>
                    </DataTableActions>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}

        <AddAdjustmentForm
          settlementId={settlement.id}
          onSubmit={(fd) => runAction(addAdjustmentAction, fd)}
        />
      </section>

      {/* Notes */}
      <form
        action={(fd) => runAction(updateHoursOrNotesAction, fd)}
        className="grid gap-3"
      >
        <input type="hidden" name="settlement_id" value={settlement.id} />
        <FormField>
          <FormFieldLabel>{sTexts.notes_label}</FormFieldLabel>
          <FormTextarea
            name="notes"
            rows={3}
            maxLength={500}
            defaultValue={settlement.notes ?? ""}
            placeholder={sTexts.notes_placeholder}
          />
        </FormField>
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={pending}
            className={buttonClass({ variant: "secondary" })}
          >
            {sTexts.save_notes_cta}
          </button>
        </div>
      </form>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className={buttonClass({ variant: "secondary" })}
        >
          {sTexts.close_cta}
        </button>
      </div>
    </div>
  );
}

type AddAdjustmentFormProps = {
  settlementId: string;
  onSubmit: (fd: FormData) => void;
};

function AddAdjustmentForm({ settlementId, onSubmit }: AddAdjustmentFormProps) {
  const [type, setType] = useState<PayrollAdjustmentType>("adicional");

  return (
    <form
      action={(fd) => onSubmit(fd)}
      className="grid gap-3 rounded-card border border-border bg-card p-3 sm:grid-cols-[110px_minmax(0,1fr)_130px_auto] sm:items-end"
    >
      <input type="hidden" name="settlement_id" value={settlementId} />
      <FormField>
        <FormFieldLabel required>{sTexts.adjustments_col_type}</FormFieldLabel>
        <FormSelect
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as PayrollAdjustmentType)}
          required
        >
          {PAYROLL_ADJUSTMENT_TYPES.map((t) => (
            <option key={t} value={t}>
              {sTexts.adjustment_type_options[t]}
            </option>
          ))}
        </FormSelect>
      </FormField>
      <FormField>
        <FormFieldLabel required>{sTexts.adjustments_col_concept}</FormFieldLabel>
        <FormInput type="text" name="concept" maxLength={200} required />
      </FormField>
      <FormField>
        <FormFieldLabel required>{sTexts.adjustments_col_amount}</FormFieldLabel>
        <FormInput
          type="number"
          name="amount"
          inputMode="decimal"
          min="0.01"
          step="0.01"
          required
        />
      </FormField>
      <button type="submit" className={buttonClass({ variant: "primary" })}>
        {sTexts.adjustment_add_cta}
      </button>
    </form>
  );
}
