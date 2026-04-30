"use client";

import { useMemo, useState } from "react";

import type { SettlementActionResult } from "@/app/(dashboard)/rrhh/settlements/actions";
import { Button, buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { ChipButton } from "@/components/ui/chip";
import {
  DataTable,
  DataTableActions,
  DataTableAmount,
  DataTableBody,
  DataTableCell,
  DataTableChip,
  DataTableEmpty,
  DataTableHeadCell,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
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
  FormSection,
  FormSelect,
  FormTextarea,
} from "@/components/ui/modal-form";
import { Badge } from "@/components/ui/badge";
import { triggerClientFeedback } from "@/lib/client-feedback";
import { useServerAction } from "@/lib/hooks/use-server-action";
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
import { getSettlementStatusTone } from "@/lib/labels";
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
  approveAction: (formData: FormData) => Promise<SettlementActionResult>;
  approveBulkAction: (formData: FormData) => Promise<SettlementActionResult>;
  returnAction: (formData: FormData) => Promise<SettlementActionResult>;
  annulAction: (formData: FormData) => Promise<SettlementActionResult>;
  payAction: (formData: FormData) => Promise<SettlementActionResult>;
  payBatchAction: (formData: FormData) => Promise<SettlementActionResult>;
};

type StatusFilter = "all" | PayrollSettlementStatus;

type PeriodValue = { year: number; month: number };

const sTexts = texts.rrhh.settlements;

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: sTexts.filter_all },
  { value: "generada", label: sTexts.filter_generada },
  { value: "aprobada_rrhh", label: sTexts.filter_aprobada_rrhh },
  { value: "pagada", label: sTexts.filter_pagada },
  { value: "anulada", label: sTexts.filter_anulada },
];

const MONTH_LABELS_LONG = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function formatPeriodLong(year: number, month: number): string {
  return `${MONTH_LABELS_LONG[month - 1]} ${year}`;
}

function shiftPeriod(p: PeriodValue, delta: number): PeriodValue {
  const totalMonths = p.year * 12 + (p.month - 1) + delta;
  return {
    year: Math.floor(totalMonths / 12),
    month: (((totalMonths % 12) + 12) % 12) + 1,
  };
}

function findLatestPeriod(settlements: PayrollSettlement[]): PeriodValue | null {
  let latest: PeriodValue | null = null;
  for (const s of settlements) {
    if (
      !latest ||
      s.periodYear > latest.year ||
      (s.periodYear === latest.year && s.periodMonth > latest.month)
    ) {
      latest = { year: s.periodYear, month: s.periodMonth };
    }
  }
  return latest;
}

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

// settlementStatusTone movido a lib/labels.ts → getSettlementStatusTone (Fase 4 · T1.2).

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
  approveAction,
  approveBulkAction,
  returnAction,
  annulAction,
  payAction,
  payBatchAction,
}: SettlementsListProps) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [periodFilter, setPeriodFilter] = useState<PeriodValue>(
    () => findLatestPeriod(settlements) ?? currentPeriodYearMonth(),
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [generateOpen, setGenerateOpen] = useState(false);
  const [editingDetail, setEditingDetail] = useState<PayrollSettlement | null>(null);
  const [approvingOne, setApprovingOne] = useState<PayrollSettlement | null>(null);
  const [approvingBulk, setApprovingBulk] = useState(false);
  const [returning, setReturning] = useState<PayrollSettlement | null>(null);
  const [annulling, setAnnulling] = useState<PayrollSettlement | null>(null);
  const [paying, setPaying] = useState<PayrollSettlement | null>(null);
  const [payingBulk, setPayingBulk] = useState(false);

  // Fase 4 · T3.3 — Antes 7 `useState` de pending + helper `runAction`
  // local. Ahora cada flow usa una instancia de useServerAction (encapsula
  // pending + triggerClientFeedback + router.refresh).
  const generate = useServerAction<SettlementActionResult>("dashboard");
  const approve = useServerAction<SettlementActionResult>("dashboard");
  const approveBulk = useServerAction<SettlementActionResult>("dashboard");
  const returnFlow = useServerAction<SettlementActionResult>("dashboard");
  const annul = useServerAction<SettlementActionResult>("dashboard");
  const pay = useServerAction<SettlementActionResult>("dashboard");
  const payBulk = useServerAction<SettlementActionResult>("dashboard");

  const genPending = generate.isPending;
  const approvePending = approve.isPending;
  const bulkPending = approveBulk.isPending;
  const returnPending = returnFlow.isPending;
  const annulPending = annul.isPending;
  const payPending = pay.isPending;
  const payBulkPending = payBulk.isPending;

  const settlementsForPeriod = useMemo(
    () =>
      settlements.filter(
        (s) =>
          s.periodYear === periodFilter.year && s.periodMonth === periodFilter.month,
      ),
    [settlements, periodFilter],
  );

  const countsByStatus = useMemo(() => {
    const map = new Map<PayrollSettlementStatus, number>();
    for (const s of settlementsForPeriod) {
      map.set(s.status, (map.get(s.status) ?? 0) + 1);
    }
    return map;
  }, [settlementsForPeriod]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return settlementsForPeriod.filter((s) => {
      if (statusFilter !== "all" && s.status !== statusFilter) return false;
      if (!q) return true;
      const periodLabel = formatPeriodLabel(s.periodYear, s.periodMonth);
      return (
        (s.staffMemberName ?? "").toLowerCase().includes(q) ||
        (s.salaryStructureName ?? "").toLowerCase().includes(q) ||
        (s.salaryStructureRole ?? "").toLowerCase().includes(q) ||
        (s.salaryStructureActivityName ?? "").toLowerCase().includes(q) ||
        periodLabel.toLowerCase().includes(q)
      );
    });
  }, [settlementsForPeriod, search, statusFilter]);

  const periodLabelLong = formatPeriodLong(periodFilter.year, periodFilter.month);

  const selectableIds = useMemo(
    () =>
      filtered
        .filter((s) => s.status === "generada" || s.status === "aprobada_rrhh")
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
  const selectionMode: "none" | "approve" | "pay" | "mixed" = (() => {
    if (selectedSettlements.length === 0) return "none";
    const allGenerada = selectedSettlements.every((s) => s.status === "generada");
    const allAprobadaRrhh = selectedSettlements.every((s) => s.status === "aprobada_rrhh");
    if (allGenerada) return "approve";
    if (allAprobadaRrhh) return "pay";
    return "mixed";
  })();

  function toggleSelection(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
    );
  }
  function toggleAll() {
    setSelectedIds((prev) => (prev.length === selectableIds.length ? [] : selectableIds));
  }

  const subtitleCounts = sTexts.subtitle_counts
    .replace("{generada}", String(countsByStatus.get("generada") ?? 0))
    .replace("{aprobada_rrhh}", String(countsByStatus.get("aprobada_rrhh") ?? 0))
    .replace("{pagada}", String(countsByStatus.get("pagada") ?? 0))
    .replace("{anulada}", String(countsByStatus.get("anulada") ?? 0));

  return (
    <div className="flex flex-col gap-4">
      {/* Section header — matches Contratos pattern */}
      <header className="flex flex-col gap-1">
        <h2 className="text-h2 font-bold text-foreground">{sTexts.page_title}</h2>
        <p className="text-sm text-muted-foreground">{sTexts.page_description}</p>
      </header>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{subtitleCounts}</p>
        {canOperate ? (
          <Button variant="primary" size="sm" onClick={() => setGenerateOpen(true)}>
            {sTexts.generate_cta}
          </Button>
        ) : null}
      </div>

      {/* Search card with chips + period select */}
      <div className="rounded-card border border-border bg-card px-4 py-3">
        <input
          type="search"
          placeholder={sTexts.search_placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-btn border border-border bg-background px-3 py-2 text-sm"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {STATUS_FILTERS.map((f) => {
              const count =
                f.value === "all"
                  ? settlementsForPeriod.length
                  : countsByStatus.get(f.value as PayrollSettlementStatus) ?? 0;
              return (
                <ChipButton
                  key={f.value}
                  active={statusFilter === f.value}
                  onClick={() => setStatusFilter(f.value)}
                >
                  {f.label} · {count}
                </ChipButton>
              );
            })}
          </div>
          <div className="inline-flex items-center gap-1 rounded-chip border border-border bg-card px-1 py-0.5 text-xs font-semibold text-foreground">
            <button
              type="button"
              aria-label={sTexts.period_picker_aria_prev}
              onClick={() => setPeriodFilter((p) => shiftPeriod(p, -1))}
              className="inline-flex size-7 items-center justify-center rounded-full hover:bg-secondary"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span className="px-2 tabular-nums">{periodLabelLong}</span>
            <button
              type="button"
              aria-label={sTexts.period_picker_aria_next}
              onClick={() => setPeriodFilter((p) => shiftPeriod(p, 1))}
              className="inline-flex size-7 items-center justify-center rounded-full hover:bg-secondary"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </div>
        </div>
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
            {selectionMode === "approve" ? (
              <Button variant="primary" size="sm" onClick={() => setApprovingBulk(true)}>
                {sTexts.bulk_approve_cta}
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
        settlementsForPeriod.length === 0 ? (
          <DataTableEmpty
            title={sTexts.period_empty_title_template.replace("{period}", periodLabelLong)}
            description={sTexts.period_empty_description}
            action={
              canOperate ? (
                <Button variant="primary" size="sm" onClick={() => setGenerateOpen(true)}>
                  {sTexts.empty_cta}
                </Button>
              ) : undefined
            }
          />
        ) : (
          <DataTableEmpty
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
              const selectable = s.status === "generada" || s.status === "aprobada_rrhh";
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
                      <span className="ml-2 text-eyebrow font-semibold uppercase text-ds-amber-700">
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
                    <div className="flex flex-col items-start gap-0.5">
                      <Badge
                        tone={getSettlementStatusTone(s.status)}
                        label={sTexts.status_options[s.status]}
                      />
                      {s.status === "generada" && s.returnedByRole ? (
                        <span className="text-eyebrow font-medium text-ds-amber-700">
                          {sTexts.returned_by_template.replace(
                            "{role}",
                            sTexts.returned_role_options[s.returnedByRole],
                          )}
                        </span>
                      ) : null}
                    </div>
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
                              onClick={() => setApprovingOne(s)}
                              className={buttonClass({ variant: "primary", size: "sm" })}
                            >
                              {sTexts.action_approve}
                            </button>
                          </>
                        ) : null}
                        {s.status === "aprobada_rrhh" ? (
                          <>
                            <button
                              type="button"
                              onClick={() => setPaying(s)}
                              className={buttonClass({ variant: "primary", size: "sm" })}
                            >
                              {sTexts.action_pay}
                            </button>
                            <button
                              type="button"
                              onClick={() => setReturning(s)}
                              className={buttonClass({ variant: "secondary", size: "sm" })}
                            >
                              {sTexts.action_return}
                            </button>
                          </>
                        ) : null}
                        {(s.status === "generada" || s.status === "aprobada_rrhh") ? (
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
          action={async (fd) => {
            await generate.runAction(generateAction, fd, (result) => {
              setGenerateOpen(false);
              const d = result.data as
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
            });
          }}
          className="grid gap-4"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField>
              <FormFieldLabel required>{sTexts.generate_month_label}</FormFieldLabel>
              <FormSelect
                name="month"
                defaultValue={String(currentPeriodYearMonth().month)}
                required
              >
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
                defaultValue={currentPeriodYearMonth().year}
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
            addAdjustmentAction={addAdjustmentAction}
            deleteAdjustmentAction={deleteAdjustmentAction}
            updateHoursOrNotesAction={updateHoursOrNotesAction}
          />
        ) : null}
      </Modal>

      {/* Approve one (US-40) */}
      <Modal
        open={approvingOne !== null}
        onClose={() => !approvePending && setApprovingOne(null)}
        title={sTexts.approve_modal_title}
        size="sm"
        closeDisabled={approvePending}
      >
        {approvingOne ? (
          <form
            action={async (fd) => {
              await approve.runAction(approveAction, fd, () => setApprovingOne(null));
            }}
            className="grid gap-4"
          >
            <input type="hidden" name="settlement_id" value={approvingOne.id} />
            {approvingOne.totalAmount === 0 ? (
              <>
                <FormBanner variant="warning">{sTexts.approve_zero_warning}</FormBanner>
                <input type="hidden" name="approve_zero" value="true" />
              </>
            ) : null}
            <FormField>
              <FormFieldLabel>{sTexts.col_member}</FormFieldLabel>
              <FormReadonly>
                {approvingOne.staffMemberName ?? "—"} ·{" "}
                {formatPeriodLabel(approvingOne.periodYear, approvingOne.periodMonth)}
              </FormReadonly>
            </FormField>
            <FormField>
              <FormFieldLabel>{sTexts.col_total}</FormFieldLabel>
              <FormReadonly>
                {formatAmount(approvingOne.totalAmount, clubCurrencyCode)}
              </FormReadonly>
            </FormField>
            <ModalFooter
              onCancel={() => setApprovingOne(null)}
              cancelLabel={sTexts.cancel_cta}
              submitLabel={sTexts.approve_submit_cta}
              pendingLabel={sTexts.submit_pending}
            />
          </form>
        ) : null}
      </Modal>

      {/* Approve bulk (US-40) */}
      <Modal
        open={approvingBulk}
        onClose={() => !bulkPending && setApprovingBulk(false)}
        title={sTexts.bulk_modal_title}
        description={sTexts.bulk_modal_description}
        size="md"
        closeDisabled={bulkPending}
      >
        <form
          action={async (fd) => {
            await approveBulk.runAction(approveBulkAction, fd, () => {
              setApprovingBulk(false);
              setSelectedIds([]);
            });
          }}
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
              name="approve_zero"
              value="true"
              label={sTexts.bulk_approve_zero_label}
              description={sTexts.bulk_approve_zero_description}
            />
          ) : null}
          <ModalFooter
            onCancel={() => setApprovingBulk(false)}
            cancelLabel={sTexts.cancel_cta}
            submitLabel={sTexts.bulk_submit_cta}
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
            action={async (fd) => {
              await returnFlow.runAction(returnAction, fd, () => setReturning(null));
            }}
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
            action={async (fd) => {
              await pay.runAction(payAction, fd, () => setPaying(null));
            }}
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
          action={async (fd) => {
            await payBulk.runAction(payBatchAction, fd, () => {
              setPayingBulk(false);
              setSelectedIds([]);
            });
          }}
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
            action={async (fd) => {
              await annul.runAction(annulAction, fd, () => setAnnulling(null));
            }}
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
  addAdjustmentAction: (formData: FormData) => Promise<SettlementActionResult>;
  deleteAdjustmentAction: (formData: FormData) => Promise<SettlementActionResult>;
  updateHoursOrNotesAction: (formData: FormData) => Promise<SettlementActionResult>;
};

function SettlementDetailBody({
  settlement,
  adjustments,
  clubCurrencyCode,
  addAdjustmentAction,
  deleteAdjustmentAction,
  updateHoursOrNotesAction,
}: SettlementDetailBodyProps) {
  // Fase 4 · T3.3 — antes runAction local + setPending. Ahora useServerAction.
  const { isPending: pending, runAction } = useServerAction<SettlementActionResult>("dashboard");

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
          action={async (fd) => {
            await runAction(updateHoursOrNotesAction, fd);
          }}
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
        <FormSection>{sTexts.adjustments_section_title}</FormSection>

        {adjustments.length === 0 ? (
          <DataTableEmpty title={sTexts.adjustments_empty} />
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
                    <DataTableAmount
                      type={a.type === "descuento" ? "egreso" : "ingreso"}
                      currencyCode={clubCurrencyCode}
                      amount={a.amount}
                    />
                  </DataTableCell>
                  <DataTableCell align="right">
                    <DataTableActions>
                      <form
                        action={async (fd) => {
                          await runAction(deleteAdjustmentAction, fd);
                        }}
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
          onSubmit={(fd) => {
            void runAction(addAdjustmentAction, fd);
          }}
        />
      </section>

      {/* Notes */}
      <form
        action={async (fd) => {
          await runAction(updateHoursOrNotesAction, fd);
        }}
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
    <Card padding="compact">
      <CardBody>
        <form
          action={(fd) => onSubmit(fd)}
          className="grid gap-3 sm:grid-cols-[110px_minmax(0,1fr)_130px_auto] sm:items-end"
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
      </CardBody>
    </Card>
  );
}
