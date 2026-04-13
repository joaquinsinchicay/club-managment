"use client";

import { type FormEvent, type KeyboardEvent, useEffect, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Modal } from "@/components/ui/modal";
import { PageContentHeader } from "@/components/ui/page-content-header";
import { PendingFieldset, PendingSubmitButton, Spinner } from "@/components/ui/pending-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatLocalizedAmount } from "@/lib/amounts";
import type {
  ConsolidationAuditEntry,
  ConsolidationMovement,
  TreasuryAccount,
  TreasuryCategory,
  TreasuryConsolidationDashboard,
  TreasuryCurrencyConfig
} from "@/lib/domain/access";
import { texts } from "@/lib/texts";
import { cn } from "@/lib/utils";

type TreasuryConsolidationCardProps = {
  dashboard: TreasuryConsolidationDashboard;
  selectedMovement: ConsolidationMovement | null;
  selectedAuditEntries: ConsolidationAuditEntry[];
  accounts: TreasuryAccount[];
  categories: TreasuryCategory[];
  currencies: TreasuryCurrencyConfig[];
  updateMovementBeforeConsolidationAction: (formData: FormData) => Promise<void>;
  integrateMatchingMovementAction: (formData: FormData) => Promise<void>;
  executeDailyConsolidationAction: (formData: FormData) => Promise<void>;
};

function EditMovementIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function formatMovementDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function ConsolidationMovementEditForm({
  movement,
  accounts,
  categories,
  currencies,
  consolidationDate,
  submitAction
}: {
  movement: ConsolidationMovement;
  accounts: TreasuryAccount[];
  categories: TreasuryCategory[];
  currencies: TreasuryCurrencyConfig[];
  consolidationDate: string;
  submitAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <form action={submitAction} className="grid gap-4">
      <input type="hidden" name="consolidation_date" value={consolidationDate} />
      <input type="hidden" name="movement_id" value={movement.movementId} />

      <PendingFieldset className="grid gap-4 sm:grid-cols-2">
        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.dashboard.treasury.account_label}</span>
          <select
            name="account_id"
            defaultValue={movement.accountId}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.dashboard.treasury.movement_type_label}</span>
          <select
            name="movement_type"
            defaultValue={movement.movementType}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          >
            <option value="ingreso">{texts.dashboard.treasury.movement_types.ingreso}</option>
            <option value="egreso">{texts.dashboard.treasury.movement_types.egreso}</option>
          </select>
        </label>

        <label className="grid gap-2 text-sm text-foreground sm:col-span-2">
          <span className="font-medium">{texts.dashboard.treasury.category_label}</span>
          <select
            name="category_id"
            defaultValue={movement.categoryId}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          >
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm text-foreground sm:col-span-2">
          <span className="font-medium">{texts.dashboard.treasury.concept_label}</span>
          <input
            type="text"
            name="concept"
            defaultValue={movement.concept}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          />
        </label>

        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.dashboard.treasury.currency_label}</span>
          <select
            name="currency_code"
            defaultValue={movement.currencyCode}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          >
            {currencies.map((currency) => (
              <option key={currency.currencyCode} value={currency.currencyCode}>
                {currency.currencyCode}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.dashboard.treasury.amount_label}</span>
          <input
            type="text"
            name="amount"
            inputMode="decimal"
            defaultValue={formatLocalizedAmount(movement.amount)}
            className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
          />
        </label>

        <div className="sm:col-span-2">
          <PendingSubmitButton
            idleLabel={texts.dashboard.consolidation.save_changes_cta}
            pendingLabel={texts.dashboard.consolidation.save_changes_loading}
            className="min-h-11 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
          />
        </div>
      </PendingFieldset>
    </form>
  );
}

function MovementList({
  title,
  emptyLabel,
  movements,
  selectedMovementId,
  onSelectMovement,
  onEditMovement
}: {
  title: string;
  emptyLabel: string;
  movements: ConsolidationMovement[];
  selectedMovementId?: string;
  onSelectMovement: (movementId: string) => void;
  onEditMovement?: (movement: ConsolidationMovement) => void;
}) {
  function handleRowKeyDown(event: KeyboardEvent<HTMLElement>, movementId: string) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    onSelectMovement(movementId);
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <span className="text-sm text-muted-foreground">{movements.length}</span>
      </div>

      {movements.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <div className="overflow-hidden rounded-[20px] border border-border bg-card">
          <div className="hidden bg-secondary/20 px-4 py-3 md:grid md:grid-cols-[minmax(0,1.7fr)_minmax(180px,0.9fr)_minmax(240px,1fr)_minmax(170px,0.8fr)_88px] md:items-center md:gap-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {texts.dashboard.consolidation.concept_label}
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {texts.dashboard.consolidation.account_label}
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {texts.dashboard.consolidation.detail_label}
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:text-right">
              {texts.dashboard.consolidation.amount_label}
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:text-right">
              {texts.dashboard.consolidation.actions_label}
            </p>
          </div>

          <div className="grid gap-3 bg-card p-3 md:gap-0 md:bg-transparent md:p-0">
            {movements.map((movement, index) => {
              const isSelected = movement.movementId === selectedMovementId;
              const canEdit = movement.status === "pending_consolidation" && Boolean(onEditMovement);

              return (
                <div
                  key={movement.movementId}
                  role="button"
                  tabIndex={0}
                  onClick={() => onSelectMovement(movement.movementId)}
                  onKeyDown={(event) => handleRowKeyDown(event, movement.movementId)}
                  aria-pressed={isSelected}
                  className={cn(
                    "relative rounded-[18px] border border-border bg-card p-4 shadow-soft transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-foreground/30 focus-visible:ring-offset-2 md:grid md:grid-cols-[minmax(0,1.75fr)_minmax(180px,0.8fr)_minmax(220px,1fr)_minmax(170px,0.8fr)_88px] md:items-start md:gap-4 md:rounded-none md:border-x-0 md:border-b-0 md:p-5 md:shadow-none",
                    isSelected && "border-foreground/25 bg-secondary/10 ring-1 ring-foreground/10",
                    index === movements.length - 1 && "md:rounded-b-[20px]"
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute inset-y-4 left-0 w-1 rounded-full transition",
                      isSelected ? "bg-foreground" : "bg-transparent"
                    )}
                  />

                  <div className="min-w-0 space-y-2 pl-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {movement.movementDisplayId}
                    </p>
                    <p
                      className="overflow-hidden text-pretty text-base font-semibold leading-6 text-foreground"
                      style={{
                        display: "-webkit-box",
                        WebkitBoxOrient: "vertical",
                        WebkitLineClamp: 2
                      }}
                    >
                      {movement.concept}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {formatMovementDateTime(movement.createdAt)} · {texts.dashboard.consolidation.created_by_label}{" "}
                      {movement.createdByUserName}
                    </p>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-muted-foreground md:mt-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground md:hidden">
                      {texts.dashboard.consolidation.account_label}
                    </p>
                    <p className="font-medium text-foreground">{movement.accountName}</p>
                    <p>{texts.dashboard.treasury.movement_types[movement.movementType]}</p>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-muted-foreground md:mt-0">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground md:hidden">
                      {texts.dashboard.consolidation.detail_label}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                        {movement.categoryName || texts.dashboard.treasury.detail_uncategorized_category}
                      </span>
                      <StatusBadge
                        label={
                          movement.status === "integrated"
                            ? texts.dashboard.consolidation.status_integrated
                            : texts.dashboard.consolidation.status_pending
                        }
                        tone={movement.status === "integrated" ? "neutral" : "warning"}
                      />
                      {!movement.isValid ? (
                        <StatusBadge label={texts.dashboard.consolidation.status_invalid} tone="danger" />
                      ) : null}
                      {movement.possibleMatch ? (
                        <StatusBadge
                          label={texts.dashboard.consolidation.status_possible_match}
                          tone="success"
                        />
                      ) : null}
                    </div>
                    <p>
                      {movement.movementDate} · {texts.dashboard.treasury.movement_types[movement.movementType]}
                    </p>
                  </div>

                  <div className="mt-4 md:mt-0 md:text-right">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground md:hidden">
                      {texts.dashboard.consolidation.amount_label}
                    </p>
                    <p
                      className={cn(
                        "text-2xl font-semibold tracking-tight md:text-[1.75rem]",
                        movement.movementType === "ingreso" ? "text-success" : "text-destructive"
                      )}
                    >
                      {movement.movementType === "egreso" ? "-" : "+"} {movement.currencyCode}{" "}
                      {formatLocalizedAmount(movement.amount)}
                    </p>
                  </div>

                  <div className="mt-4 flex min-h-10 items-center justify-start md:mt-0 md:justify-end">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground md:hidden">
                      {texts.dashboard.consolidation.actions_label}
                    </p>
                    {canEdit ? (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          onEditMovement?.(movement);
                        }}
                        className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-[18px] border border-border bg-card px-0 py-0 text-foreground transition hover:bg-secondary"
                        aria-label={texts.dashboard.consolidation.edit_cta}
                      >
                        <EditMovementIcon />
                      </button>
                    ) : (
                      <span aria-hidden="true" className="text-xs font-medium text-muted-foreground">
                        -
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

export function TreasuryConsolidationCard({
  dashboard,
  selectedMovement,
  selectedAuditEntries,
  accounts,
  categories,
  currencies,
  updateMovementBeforeConsolidationAction,
  integrateMatchingMovementAction,
  executeDailyConsolidationAction
}: TreasuryConsolidationCardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [selectedDate, setSelectedDate] = useState(dashboard.consolidationDate);
  const [editingMovement, setEditingMovement] = useState<ConsolidationMovement | null>(null);
  const [isDateNavigationPending, startDateNavigationTransition] = useTransition();

  useEffect(() => {
    setSelectedDate(dashboard.consolidationDate);
  }, [dashboard.consolidationDate]);

  useEffect(() => {
    if (!editingMovement) {
      return;
    }

    const editableMovement = dashboard.pendingMovements.find(
      (movement) => movement.movementId === editingMovement.movementId
    );

    if (!editableMovement) {
      setEditingMovement(null);
      return;
    }

    setEditingMovement(editableMovement);
  }, [dashboard.pendingMovements, editingMovement]);

  function handleLoadDateSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const nextDate = selectedDate.trim();

    if (!nextDate) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("date", nextDate);
    nextParams.delete("movement");
    nextParams.delete("feedback");

    startDateNavigationTransition(() => {
      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
    });
  }

  function handleSelectMovement(movementId: string) {
    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set("date", dashboard.consolidationDate);
    nextParams.set("movement", movementId);
    nextParams.delete("feedback");
    router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
  }

  const allMovements = [...dashboard.pendingMovements, ...dashboard.integratedMovements].sort((left, right) => {
    if (left.status !== right.status) {
      return left.status === "pending_consolidation" ? -1 : 1;
    }

    return right.createdAt.localeCompare(left.createdAt);
  });
  const hasMovements = allMovements.length > 0;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      <PageContentHeader
        eyebrow={texts.dashboard.consolidation.eyebrow}
        title={texts.dashboard.consolidation.title}
        description={texts.dashboard.consolidation.description}
        backHref="/dashboard/treasury"
        backLabel={texts.dashboard.consolidation.back_to_treasury_cta}
      />

      <section className="w-full rounded-[20px] border border-border bg-card p-6 sm:p-8">
        <div className="grid gap-6">
          <div className="rounded-xl border border-border bg-secondary/40 p-4">
            <form onSubmit={handleLoadDateSubmit} className="grid gap-4">
              <PendingFieldset
                disabled={isDateNavigationPending}
                className="grid gap-4 sm:grid-cols-[minmax(0,220px)_auto] sm:items-end"
              >
                <label className="grid gap-2 text-sm text-foreground">
                  <span className="font-medium">{texts.dashboard.consolidation.date_label}</span>
                  <input
                    type="date"
                    name="date"
                    value={selectedDate}
                    onChange={(event) => setSelectedDate(event.target.value)}
                    className="min-h-11 rounded-xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                  />
                </label>
                <button
                  type="submit"
                  disabled={!selectedDate.trim() || isDateNavigationPending}
                  aria-disabled={!selectedDate.trim() || isDateNavigationPending}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-70"
                >
                  {isDateNavigationPending ? (
                    <>
                      <Spinner />
                      <span>{texts.dashboard.consolidation.load_loading}</span>
                    </>
                  ) : (
                    <span>{texts.dashboard.consolidation.load_cta}</span>
                  )}
                </button>
              </PendingFieldset>
              <span aria-live="polite" className="text-xs text-muted-foreground">
                {texts.dashboard.consolidation.load_helper}
              </span>
              <p className="text-xs text-muted-foreground">
                {texts.dashboard.consolidation.default_date_hint} {dashboard.defaultDate}
              </p>
            </form>
          </div>

          {dashboard.batch ? (
            <div className="rounded-xl border border-border bg-card p-4">
              <div className="flex flex-wrap items-center gap-3">
                <StatusBadge
                  label={
                    dashboard.batch.status === "completed"
                      ? texts.dashboard.consolidation.batch_completed
                      : dashboard.batch.status === "failed"
                        ? texts.dashboard.consolidation.batch_failed
                        : texts.dashboard.consolidation.batch_pending
                  }
                  tone={
                    dashboard.batch.status === "completed"
                      ? "success"
                      : dashboard.batch.status === "failed"
                        ? "danger"
                        : "warning"
                  }
                />
                <p className="text-sm text-muted-foreground">
                  {texts.dashboard.consolidation.batch_label} {dashboard.batch.consolidationDate}
                </p>
              </div>
            </div>
          ) : null}

          {!hasMovements && dashboard.hasLoadedDate ? (
            <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-5 text-sm text-muted-foreground">
              {texts.dashboard.consolidation.empty}
            </div>
          ) : hasMovements ? (
            <div className="grid gap-6">
              <MovementList
                title={texts.dashboard.consolidation.movements_title}
                emptyLabel={texts.dashboard.consolidation.empty}
                movements={allMovements}
                selectedMovementId={selectedMovement?.movementId}
                onSelectMovement={handleSelectMovement}
                onEditMovement={(movement) => setEditingMovement(movement)}
              />

              {selectedMovement ? (
                <>
                  <section className="rounded-xl border border-border bg-card p-4">
                    <div className="space-y-2">
                      <h2 className="text-lg font-semibold text-foreground">
                        {texts.dashboard.consolidation.detail_title}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {texts.dashboard.consolidation.detail_description}
                      </p>
                    </div>

                    <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
                      <p>
                        {selectedMovement.movementDate} · {selectedMovement.accountName}
                      </p>
                      <p>
                        {selectedMovement.categoryName} ·{" "}
                        {texts.dashboard.treasury.movement_types[selectedMovement.movementType]}
                      </p>
                      <p>{selectedMovement.createdByUserName}</p>
                      <p className="text-base font-semibold text-foreground">
                        {selectedMovement.currencyCode} {formatLocalizedAmount(selectedMovement.amount)}
                      </p>
                    </div>

                    {!selectedMovement.isValid ? (
                      <div className="mt-4 rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
                        <p className="font-semibold">{texts.dashboard.consolidation.invalid_title}</p>
                        <ul className="mt-2 list-disc space-y-1 pl-5">
                          {selectedMovement.validationIssues.map((issue) => (
                            <li key={issue}>
                              {texts.dashboard.feedback[issue as keyof typeof texts.dashboard.feedback] ?? issue}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                  </section>

                  {selectedMovement.possibleMatch ? (
                    <section className="rounded-xl border border-border bg-card p-4">
                      <div className="space-y-2">
                        <h2 className="text-lg font-semibold text-foreground">
                          {texts.dashboard.consolidation.match_title}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {texts.dashboard.consolidation.match_description}
                        </p>
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="rounded-xl border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
                          <p className="font-semibold text-foreground">
                            {texts.dashboard.consolidation.secretaria_side}
                          </p>
                          <p className="mt-2">{selectedMovement.accountName}</p>
                          <p>{selectedMovement.categoryName}</p>
                          <p>{selectedMovement.concept}</p>
                          <p>
                            {selectedMovement.currencyCode} {formatLocalizedAmount(selectedMovement.amount)}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
                          <p className="font-semibold text-foreground">
                            {texts.dashboard.consolidation.tesoreria_side}
                          </p>
                          <p className="mt-2">{selectedMovement.possibleMatch.accountName}</p>
                          <p>{selectedMovement.possibleMatch.categoryName}</p>
                          <p>{selectedMovement.possibleMatch.concept}</p>
                          <p>
                            {selectedMovement.possibleMatch.currencyCode}{" "}
                            {formatLocalizedAmount(selectedMovement.possibleMatch.amount)}
                          </p>
                        </div>
                      </div>

                      {selectedMovement.status === "pending_consolidation" ? (
                        <form action={integrateMatchingMovementAction} className="mt-4">
                          <PendingFieldset className="grid gap-4">
                            <input type="hidden" name="consolidation_date" value={dashboard.consolidationDate} />
                            <input type="hidden" name="secretaria_movement_id" value={selectedMovement.movementId} />
                            <input
                              type="hidden"
                              name="tesoreria_movement_id"
                              value={selectedMovement.possibleMatch.tesoreriaMovementId}
                            />
                            <PendingSubmitButton
                              idleLabel={texts.dashboard.consolidation.integrate_cta}
                              pendingLabel={texts.dashboard.consolidation.integrate_loading}
                              className="min-h-11 rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                            />
                          </PendingFieldset>
                        </form>
                      ) : null}
                    </section>
                  ) : null}

                  <section className="rounded-xl border border-border bg-card p-4">
                    <div className="space-y-2">
                      <h2 className="text-lg font-semibold text-foreground">
                        {texts.dashboard.consolidation.audit_title}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {texts.dashboard.consolidation.audit_description}
                      </p>
                    </div>

                    <div className="mt-4 grid gap-3">
                      {selectedAuditEntries.map((entry) => (
                        <article key={entry.id} className="rounded-xl border border-border bg-secondary/30 p-3">
                          <div className="flex flex-wrap items-center justify-between gap-3">
                            <p className="text-sm font-semibold text-foreground">
                              {texts.dashboard.consolidation.audit_actions[entry.actionType]}
                            </p>
                            <p className="text-xs text-muted-foreground">{entry.performedAt}</p>
                          </div>
                          <p className="mt-1 text-sm text-muted-foreground">{entry.performedByUserName}</p>
                        </article>
                      ))}
                    </div>
                  </section>
                </>
              ) : (
                <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-5 text-sm text-muted-foreground">
                  {texts.dashboard.consolidation.select_movement}
                </div>
              )}

              <form action={executeDailyConsolidationAction} className="rounded-xl border border-border bg-card p-4">
                <input type="hidden" name="consolidation_date" value={dashboard.consolidationDate} />
                <div className="space-y-2">
                  <h2 className="text-lg font-semibold text-foreground">
                    {texts.dashboard.consolidation.execute_title}
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {texts.dashboard.consolidation.execute_description}
                  </p>
                </div>
                <div className="mt-4">
                  <PendingSubmitButton
                    idleLabel={texts.dashboard.consolidation.execute_cta}
                    pendingLabel={texts.dashboard.consolidation.execute_loading}
                    className="min-h-11 rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
                  />
                </div>
              </form>
            </div>
          ) : null}
        </div>
      </section>

      <Modal
        open={editingMovement !== null}
        onClose={() => setEditingMovement(null)}
        title={texts.dashboard.consolidation.edit_title}
        description={texts.dashboard.consolidation.edit_description}
      >
        {editingMovement ? (
          <ConsolidationMovementEditForm
            movement={editingMovement}
            accounts={accounts}
            categories={categories}
            currencies={currencies}
            consolidationDate={dashboard.consolidationDate}
            submitAction={updateMovementBeforeConsolidationAction}
          />
        ) : null}
      </Modal>
    </main>
  );
}
