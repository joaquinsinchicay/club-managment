"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
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
  DataTableEmpty,
  DataTableHeadCell,
  DataTableHeader,
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
import { PageContentHeader } from "@/components/ui/page-content-header";
import { triggerClientFeedback } from "@/lib/client-feedback";
import type { TreasuryAccount } from "@/lib/domain/access";
import {
  formatPeriodLabel,
  type PayrollSettlement,
  type PayrollSettlementAdjustment,
} from "@/lib/domain/payroll-settlement";
import { texts } from "@/lib/texts";

type Props = {
  settlements: PayrollSettlement[];
  adjustmentsBySettlementId: Record<string, PayrollSettlementAdjustment[]>;
  clubCurrencyCode: string;
  payableAccounts: TreasuryAccount[];
  payAction: (formData: FormData) => Promise<SettlementActionResult>;
  payBatchAction: (formData: FormData) => Promise<SettlementActionResult>;
  returnAction: (formData: FormData) => Promise<SettlementActionResult>;
};

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

function formatIsoDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export function TreasuryPayrollTray({
  settlements,
  adjustmentsBySettlementId: _adjustmentsBySettlementId,
  clubCurrencyCode,
  payableAccounts,
  payAction,
  payBatchAction,
  returnAction,
}: Props) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  const [search, setSearch] = useState("");
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const [paying, setPaying] = useState<PayrollSettlement | null>(null);
  const [payingBulk, setPayingBulk] = useState(false);
  const [returning, setReturning] = useState<PayrollSettlement | null>(null);

  const [payPending, setPayPending] = useState(false);
  const [payBulkPending, setPayBulkPending] = useState(false);
  const [returnPending, setReturnPending] = useState(false);

  const availablePeriods = useMemo(() => {
    const set = new Set<string>();
    for (const s of settlements) {
      set.add(formatPeriodLabel(s.periodYear, s.periodMonth));
    }
    return Array.from(set).sort().reverse();
  }, [settlements]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return settlements.filter((s) => {
      if (periodFilter !== "all") {
        const label = formatPeriodLabel(s.periodYear, s.periodMonth);
        if (label !== periodFilter) return false;
      }
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
  }, [settlements, search, periodFilter]);

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

  const subtitleCounts = tTexts.subtitle_counts
    .replace("{count}", String(totalPending))
    .replace("{total}", formatAmount(totalPendingAmount, clubCurrencyCode));

  return (
    <div className="flex flex-col gap-6">
      <PageContentHeader
        eyebrow={tTexts.page_eyebrow}
        title={tTexts.page_title}
        description={tTexts.page_description}
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">{subtitleCounts}</p>
      </div>

      {/* Search + period filter */}
      <div className="rounded-card border border-border bg-card px-4 py-3">
        <input
          type="search"
          placeholder={tTexts.search_placeholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full rounded-btn border border-border bg-background px-3 py-2 text-sm"
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            <ChipButton
              active={periodFilter === "all"}
              onClick={() => setPeriodFilter("all")}
            >
              {tTexts.filter_period_all}
            </ChipButton>
            {availablePeriods.map((p) => (
              <ChipButton
                key={p}
                active={periodFilter === p}
                onClick={() => setPeriodFilter(p)}
              >
                {p}
              </ChipButton>
            ))}
          </div>
        </div>
      </div>

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

      {/* Tray table */}
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
        <DataTable
          density="compact"
          gridColumns="32px 90px minmax(0,1.2fr) minmax(0,1.2fr) 130px 130px 200px"
        >
          <DataTableHeader>
            <DataTableHeadCell>
              <input
                type="checkbox"
                aria-label={tTexts.select_all_label}
                checked={allSelected}
                onChange={toggleAll}
                disabled={selectableIds.length === 0}
                className="size-4 rounded border-border text-foreground focus:ring-foreground"
              />
            </DataTableHeadCell>
            <DataTableHeadCell>{tTexts.col_period}</DataTableHeadCell>
            <DataTableHeadCell>{tTexts.col_member}</DataTableHeadCell>
            <DataTableHeadCell>{tTexts.col_structure}</DataTableHeadCell>
            <DataTableHeadCell align="right">{tTexts.col_total}</DataTableHeadCell>
            <DataTableHeadCell>{tTexts.col_approved_at}</DataTableHeadCell>
            <DataTableHeadCell />
          </DataTableHeader>
          <DataTableBody>
            {filtered.map((s) => (
              <DataTableRow key={s.id} density="compact" hoverReveal>
                <DataTableCell>
                  <input
                    type="checkbox"
                    aria-label={`${tTexts.select_row_label} ${s.id}`}
                    checked={selectedIds.includes(s.id)}
                    onChange={() => toggleSelection(s.id)}
                    className="size-4 rounded border-border text-foreground focus:ring-foreground"
                  />
                </DataTableCell>
                <DataTableCell>
                  <span className="font-mono text-xs">
                    {formatPeriodLabel(s.periodYear, s.periodMonth)}
                  </span>
                </DataTableCell>
                <DataTableCell>
                  {s.staffMemberId ? (
                    <Link
                      href={`/treasury/staff/${s.staffMemberId}`}
                      className="font-medium text-foreground hover:underline"
                    >
                      {s.staffMemberName ?? "—"}
                    </Link>
                  ) : (
                    <span className="font-medium text-foreground">
                      {s.staffMemberName ?? "—"}
                    </span>
                  )}
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
                  <span className="font-semibold text-foreground">
                    {formatAmount(s.totalAmount, clubCurrencyCode)}
                  </span>
                </DataTableCell>
                <DataTableCell>
                  <span className="text-xs text-muted-foreground">
                    {formatIsoDate(s.approvedAt)}
                  </span>
                </DataTableCell>
                <DataTableCell align="right">
                  <DataTableActions>
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
                  </DataTableActions>
                </DataTableCell>
              </DataTableRow>
            ))}
          </DataTableBody>
        </DataTable>
      )}

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

      {/* Return to "generada" (US-41) */}
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
