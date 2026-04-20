"use client";

import { type FormEvent, useEffect, useMemo, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import {
  ConsolidationTransferEditForm,
  SecretariaMovementEditForm
} from "@/components/dashboard/treasury-operation-forms";
import { EditIconButton } from "@/components/ui/edit-icon-button";
import { Modal } from "@/components/ui/modal";
import { BlockingStatusOverlay } from "@/components/ui/overlay";
import { PendingFieldset, PendingSubmitButton, Spinner } from "@/components/ui/pending-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatLocalizedAmount } from "@/lib/amounts";
import type {
  ClubActivity,
  ClubCalendarEvent,
  ConsolidationMovement,
  ConsolidationTransferEdit,
  ReceiptFormat,
  TreasuryAccount,
  TreasuryCategory,
  TreasuryConsolidationDashboard,
  TreasuryCurrencyConfig,
  TreasuryMovementType
} from "@/lib/domain/access";
import { texts } from "@/lib/texts";
import { cn } from "@/lib/utils";

type TreasuryConciliacionTabProps = {
  dashboard: TreasuryConsolidationDashboard;
  accounts: TreasuryAccount[];
  transferSourceAccounts: TreasuryAccount[];
  transferTargetAccounts: TreasuryAccount[];
  categories: TreasuryCategory[];
  activities: ClubActivity[];
  calendarEvents: ClubCalendarEvent[];
  currencies: TreasuryCurrencyConfig[];
  movementTypes: TreasuryMovementType[];
  receiptFormats: ReceiptFormat[];
  updateMovementBeforeConsolidationAction: (formData: FormData) => Promise<void>;
  updateTransferBeforeConsolidationAction: (formData: FormData) => Promise<void>;
  executeDailyConsolidationAction: (formData: FormData) => Promise<void>;
};

function formatMovementDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

function buildEditableTransfer(
  movement: ConsolidationMovement,
  movements: ConsolidationMovement[]
): ConsolidationTransferEdit | null {
  if (!movement.transferReference) return null;

  const related = movements.filter((entry) => entry.transferReference === movement.transferReference);
  const source = related.find((entry) => entry.movementType === "egreso") ?? null;
  const target = related.find((entry) => entry.movementType === "ingreso") ?? null;
  if (!source || !target) return null;

  return {
    movementId: movement.movementId,
    transferReference: movement.transferReference,
    movementDate: movement.movementDate,
    sourceAccountId: source.accountId,
    targetAccountId: target.accountId,
    currencyCode: source.currencyCode,
    concept: source.concept,
    amount: source.amount
  };
}

function KpiTile({
  label,
  value,
  suffix,
  tone
}: {
  label: string;
  value: string;
  suffix: string;
  tone: "default" | "warning" | "success";
}) {
  const valueTone =
    tone === "warning"
      ? "text-amber-700"
      : tone === "success"
        ? "text-success"
        : "text-foreground";

  return (
    <div className="rounded-card border border-border bg-card px-4 py-4">
      <p className="text-eyebrow font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </p>
      <p className={cn("mt-2 text-3xl font-semibold tracking-tight", valueTone)}>{value}</p>
      <p className="mt-1 text-meta text-muted-foreground">{suffix}</p>
    </div>
  );
}

export function TreasuryConciliacionTab({
  dashboard,
  accounts,
  transferSourceAccounts,
  transferTargetAccounts,
  categories,
  activities,
  currencies,
  movementTypes,
  receiptFormats,
  updateMovementBeforeConsolidationAction,
  updateTransferBeforeConsolidationAction,
  executeDailyConsolidationAction
}: TreasuryConciliacionTabProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [selectedDate, setSelectedDate] = useState(dashboard.consolidationDate);
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);
  const [editingMovement, setEditingMovement] = useState<ConsolidationMovement | null>(null);
  const [editingTransfer, setEditingTransfer] = useState<ConsolidationTransferEdit | null>(null);
  const [isEditSubmissionPending, setIsEditSubmissionPending] = useState(false);
  const [isDateNavigationPending, startDateNavigationTransition] = useTransition();

  const pendingOverlayLabel = isEditSubmissionPending
    ? texts.dashboard.consolidation.save_changes_loading
    : null;

  useEffect(() => {
    setSelectedDate(dashboard.consolidationDate);
  }, [dashboard.consolidationDate]);

  useEffect(() => {
    if (!editingMovement) return;
    const updated = dashboard.pendingMovements.find(
      (movement) => movement.movementId === editingMovement.movementId
    );
    if (!updated) {
      setEditingMovement(null);
      return;
    }
    setEditingMovement(updated);
  }, [dashboard.pendingMovements, editingMovement]);

  useEffect(() => {
    if (!editingTransfer) return;
    const updated = dashboard.pendingMovements.find(
      (movement) => movement.movementId === editingTransfer.movementId
    );
    if (!updated) {
      setEditingTransfer(null);
      return;
    }
    const next = buildEditableTransfer(updated, [
      ...dashboard.pendingMovements,
      ...dashboard.integratedMovements
    ]);
    if (!next) {
      setEditingTransfer(null);
      return;
    }
    setEditingTransfer(next);
  }, [dashboard.pendingMovements, dashboard.integratedMovements, editingTransfer]);

  function handleLoadDateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextDate = selectedDate.trim();
    if (!nextDate) return;

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("tab", "conciliacion");
    nextParams.set("date", nextDate);
    nextParams.delete("movement");
    nextParams.delete("feedback");

    startDateNavigationTransition(() => {
      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
    });
  }

  async function handleUpdateMovementBeforeConsolidation(formData: FormData) {
    setIsEditSubmissionPending(true);
    setEditingMovement(null);
    setEditingTransfer(null);
    try {
      await updateMovementBeforeConsolidationAction(formData);
    } finally {
      setIsEditSubmissionPending(false);
    }
  }

  async function handleUpdateTransferBeforeConsolidation(formData: FormData) {
    setIsEditSubmissionPending(true);
    setEditingMovement(null);
    setEditingTransfer(null);
    try {
      await updateTransferBeforeConsolidationAction(formData);
    } finally {
      setIsEditSubmissionPending(false);
    }
  }

  const pendingCount = dashboard.totalPendingCount;
  const pendingArsNet = dashboard.totalPendingArsNet;
  const approvedToday = dashboard.approvedTodayCount;

  const accountChips = useMemo(() => {
    const seen = new Map<string, string>();
    dashboard.pendingMovements.forEach((movement) => {
      if (!seen.has(movement.accountId)) {
        seen.set(movement.accountId, movement.accountName);
      }
    });
    return Array.from(seen.entries()).map(([id, name]) => ({ id, name }));
  }, [dashboard.pendingMovements]);

  const visibleMovements = selectedAccountId
    ? dashboard.pendingMovements.filter((movement) => movement.accountId === selectedAccountId)
    : dashboard.pendingMovements;

  const isSessionOpen = dashboard.sessionStatus === "open";
  const isSessionAutoClosed =
    dashboard.sessionStatus === "closed" && dashboard.sessionCloseType === "auto";
  const autoClosedAtLabel =
    isSessionAutoClosed && dashboard.sessionClosedAt
      ? formatMovementDateTime(dashboard.sessionClosedAt)
      : null;
  const hasPending = pendingCount > 0;
  const canApprove =
    !isSessionOpen && hasPending && dashboard.pendingMovements.every((movement) => movement.isValid);

  return (
    <div className="space-y-4">
      <BlockingStatusOverlay open={pendingOverlayLabel !== null} label={pendingOverlayLabel ?? ""} />

      {/* KPI strip */}
      <div className="grid gap-3 sm:grid-cols-3">
        <KpiTile
          label={texts.dashboard.treasury_role.conciliacion_kpi_pending_label}
          value={String(pendingCount)}
          suffix={texts.dashboard.treasury_role.conciliacion_kpi_pending_suffix}
          tone="warning"
        />
        <KpiTile
          label={texts.dashboard.treasury_role.conciliacion_kpi_amount_label}
          value={`$ ${formatLocalizedAmount(Math.abs(pendingArsNet))}`}
          suffix={texts.dashboard.treasury_role.conciliacion_kpi_amount_suffix}
          tone="default"
        />
        <KpiTile
          label={texts.dashboard.treasury_role.conciliacion_kpi_approved_label}
          value={String(approvedToday)}
          suffix={texts.dashboard.treasury_role.conciliacion_kpi_approved_suffix}
          tone="success"
        />
      </div>

      {/* Movimientos a conciliar */}
      <section className="rounded-card border border-border bg-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="text-sm font-semibold tracking-tight text-foreground">
              {texts.dashboard.treasury_role.conciliacion_movements_title}
            </h3>
            <p className="mt-0.5 text-meta text-muted-foreground">
              {texts.dashboard.treasury_role.conciliacion_movements_subtitle}
            </p>
            {isSessionAutoClosed ? (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <StatusBadge
                  tone="warning"
                  label={texts.dashboard.treasury_role.conciliacion_auto_closed_badge}
                />
                <span className="text-meta text-muted-foreground">
                  {autoClosedAtLabel
                    ? `${texts.dashboard.treasury_role.conciliacion_auto_closed_description} (${autoClosedAtLabel})`
                    : texts.dashboard.treasury_role.conciliacion_auto_closed_description}
                </span>
              </div>
            ) : null}
          </div>
          {canApprove ? (
            <form action={executeDailyConsolidationAction}>
              <input type="hidden" name="consolidation_date" value={dashboard.consolidationDate} />
              <PendingSubmitButton
                idleLabel={texts.dashboard.treasury_role.conciliacion_approve_all_cta}
                pendingLabel={texts.dashboard.consolidation.execute_loading}
                className="inline-flex min-h-11 items-center justify-center rounded-btn border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-slate-50"
              />
            </form>
          ) : null}
        </div>

        {/* Date picker */}
        <form onSubmit={handleLoadDateSubmit} className="mt-4">
          <PendingFieldset
            disabled={isDateNavigationPending}
            className="flex flex-col gap-2 sm:flex-row sm:items-end"
          >
            <label className="flex-1 grid gap-1.5 text-sm text-foreground">
              <span className="text-eyebrow font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {texts.dashboard.treasury_role.conciliacion_date_label}
              </span>
              <input
                type="date"
                name="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="min-h-11 rounded-btn border border-border bg-card px-4 py-2.5 text-sm text-foreground"
              />
            </label>
            <button
              type="submit"
              disabled={!selectedDate.trim() || isDateNavigationPending}
              aria-disabled={!selectedDate.trim() || isDateNavigationPending}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-btn bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isDateNavigationPending ? (
                <>
                  <Spinner />
                  <span>{texts.dashboard.consolidation.load_loading}</span>
                </>
              ) : (
                <span>{texts.dashboard.treasury_role.conciliacion_date_submit_cta}</span>
              )}
            </button>
          </PendingFieldset>
        </form>

        {/* Account filter chips */}
        {!isSessionOpen && accountChips.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setSelectedAccountId(null)}
              className={cn(
                "inline-flex min-h-8 items-center rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                selectedAccountId === null
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-border bg-card text-foreground hover:bg-slate-50"
              )}
            >
              {texts.dashboard.treasury_role.conciliacion_filter_all_accounts}
            </button>
            {accountChips.map((account) => (
              <button
                key={account.id}
                type="button"
                onClick={() => setSelectedAccountId(account.id)}
                className={cn(
                  "inline-flex min-h-8 items-center rounded-full border px-3 py-1.5 text-sm font-semibold transition",
                  selectedAccountId === account.id
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-border bg-card text-foreground hover:bg-slate-50"
                )}
              >
                {account.name}
              </button>
            ))}
          </div>
        ) : null}

        {/* Movement list */}
        <div className="mt-4">
          {isSessionOpen ? (
            <div className="rounded-dialog border border-dashed border-border bg-secondary/30 px-4 py-5 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">
                {texts.dashboard.treasury_role.conciliacion_session_open_title}
              </p>
              <p className="mt-1 text-muted-foreground">
                {texts.dashboard.treasury_role.conciliacion_session_open_description}
              </p>
            </div>
          ) : visibleMovements.length === 0 ? (
            <div className="rounded-dialog border border-dashed border-border bg-secondary/30 px-4 py-5 text-sm text-muted-foreground">
              {texts.dashboard.treasury_role.conciliacion_empty_pending}
            </div>
          ) : (
            <ul className="space-y-2.5">
              {visibleMovements.map((movement) => {
                return (
                  <li
                    key={movement.movementId}
                    className="group rounded-dialog border border-border bg-card p-3.5 transition hover:border-slate-300"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex min-w-0 flex-1 items-start gap-3">
                        <span
                          aria-hidden="true"
                          className={cn(
                            "mt-1.5 size-1.5 shrink-0 rounded-full",
                            movement.movementType === "ingreso" ? "bg-success" : "bg-destructive"
                          )}
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <p className="text-small font-semibold leading-5 text-foreground">
                            {movement.concept}
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            <span className="inline-flex items-center rounded-chip bg-slate-100 px-2 py-0.5 text-eyebrow font-semibold text-slate-600">
                              {movement.accountName}
                            </span>
                            {movement.categoryName ? (
                              <span className="inline-flex items-center rounded-chip bg-slate-100 px-2 py-0.5 text-eyebrow font-semibold text-slate-600">
                                {movement.categoryName}
                              </span>
                            ) : null}
                            {movement.activityName ? (
                              <span className="inline-flex items-center rounded-chip bg-slate-100 px-2 py-0.5 text-eyebrow font-semibold text-slate-600">
                                {movement.activityName}
                              </span>
                            ) : null}
                            {movement.calendarEventTitle ? (
                              <span className="inline-flex items-center rounded-chip bg-slate-100 px-2 py-0.5 text-eyebrow font-semibold text-slate-600">
                                {movement.calendarEventTitle}
                              </span>
                            ) : null}
                          </div>
                          <p className="text-eyebrow text-slate-500">
                            {[
                              movement.movementDisplayId,
                              movement.createdByUserName,
                              movement.receiptNumber
                                ? `${texts.dashboard.treasury.detail_receipt_label} ${movement.receiptNumber}`
                                : null,
                              movement.transferReference
                                ? `${texts.dashboard.treasury.detail_transfer_label} ${movement.transferReference.slice(-6)}`
                                : null,
                              movement.fxOperationReference
                                ? `${texts.dashboard.treasury.detail_fx_label} ${movement.fxOperationReference.slice(-6)}`
                                : null
                            ]
                              .filter(Boolean)
                              .join(" · ")}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 sm:min-w-[140px]">
                        <p
                          className={cn(
                            "text-base font-semibold leading-5 tracking-tight tabular-nums",
                            movement.movementType === "ingreso" ? "text-success" : "text-destructive"
                          )}
                        >
                          {movement.movementType === "egreso" ? "-" : "+"}$ {formatLocalizedAmount(movement.amount)}
                        </p>
                        <p className="text-eyebrow text-slate-500">
                          {formatMovementDateTime(movement.createdAt)}
                        </p>
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-chip px-1.5 py-0.5 text-eyebrow font-semibold uppercase tracking-[0.06em]",
                              movement.status === "integrated"
                                ? "bg-slate-100 text-slate-600"
                                : "bg-amber-100 text-amber-700"
                            )}
                          >
                            {movement.status === "integrated"
                              ? texts.dashboard.treasury_role.conciliacion_status_integrated
                              : texts.dashboard.treasury_role.conciliacion_status_pending}
                          </span>
                          {!movement.isValid ? (
                            <StatusBadge
                              label={texts.dashboard.treasury_role.conciliacion_status_invalid}
                              tone="danger"
                            />
                          ) : null}
                        </div>
                      </div>

                      {movement.status === "pending_consolidation" ? (
                        <div className="shrink-0 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                          <EditIconButton
                            label={texts.dashboard.treasury_role.conciliacion_edit_cta}
                            onClick={() => {
                              const editableTransfer = buildEditableTransfer(movement, [
                                ...dashboard.pendingMovements,
                                ...dashboard.integratedMovements
                              ]);
                              if (editableTransfer) {
                                setEditingMovement(null);
                                setEditingTransfer(editableTransfer);
                                return;
                              }
                              setEditingTransfer(null);
                              setEditingMovement(movement);
                            }}
                          />
                        </div>
                      ) : null}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Edit modal */}
      <Modal
        open={editingMovement !== null || editingTransfer !== null}
        onClose={() => {
          setEditingMovement(null);
          setEditingTransfer(null);
        }}
        title={
          editingTransfer
            ? texts.dashboard.consolidation.edit_transfer_title
            : texts.dashboard.consolidation.edit_title
        }
        description={
          editingTransfer
            ? texts.dashboard.consolidation.edit_transfer_description
            : texts.dashboard.consolidation.edit_description
        }
        closeDisabled={isEditSubmissionPending}
      >
        {editingTransfer ? (
          <ConsolidationTransferEditForm
            sourceAccounts={transferSourceAccounts}
            targetAccounts={transferTargetAccounts}
            currencies={currencies}
            submitAction={handleUpdateTransferBeforeConsolidation}
            submitLabel={texts.dashboard.consolidation.save_changes_cta}
            pendingLabel={texts.dashboard.consolidation.save_changes_loading}
            transfer={editingTransfer}
            extraHiddenFields={
              <input type="hidden" name="consolidation_date" value={dashboard.consolidationDate} />
            }
          />
        ) : editingMovement ? (
          <SecretariaMovementEditForm
            accounts={accounts}
            categories={categories}
            activities={activities}
            currencies={currencies}
            movementTypes={movementTypes}
            receiptFormats={receiptFormats}
            submitAction={handleUpdateMovementBeforeConsolidation}
            submitLabel={texts.dashboard.consolidation.save_changes_cta}
            pendingLabel={texts.dashboard.consolidation.save_changes_loading}
            movement={editingMovement}
            copy={texts.dashboard.consolidation.edit_form}
            editableMovementDate
            extraHiddenFields={
              <input type="hidden" name="consolidation_date" value={dashboard.consolidationDate} />
            }
          />
        ) : null}
      </Modal>
    </div>
  );
}
