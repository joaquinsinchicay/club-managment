"use client";

import Link from "next/link";

import { AppHeader } from "@/components/navigation/app-header";
import { CardShell } from "@/components/ui/card-shell";
import { PendingFieldset, PendingSubmitButton } from "@/components/ui/pending-form";
import type { SessionContext } from "@/lib/auth/service";
import type {
  ConsolidationAuditEntry,
  ConsolidationMovement,
  TreasuryAccount,
  TreasuryCategory,
  TreasuryConsolidationDashboard,
  TreasuryCurrencyConfig
} from "@/lib/domain/access";
import { texts } from "@/lib/texts";

type TreasuryConsolidationCardProps = {
  context: SessionContext;
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

function StatusBadge({ label, tone }: { label: string; tone: "amber" | "green" | "neutral" | "red" }) {
  const toneClassName =
    tone === "green"
      ? "bg-emerald-100 text-emerald-800"
      : tone === "red"
        ? "bg-rose-100 text-rose-800"
        : tone === "amber"
          ? "bg-amber-100 text-amber-800"
          : "bg-secondary text-foreground";

  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] ${toneClassName}`}
    >
      {label}
    </span>
  );
}

function MovementList({
  title,
  emptyLabel,
  movements,
  selectedMovementId,
  consolidationDate
}: {
  title: string;
  emptyLabel: string;
  movements: ConsolidationMovement[];
  selectedMovementId?: string;
  consolidationDate: string;
}) {
  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold text-foreground">{title}</h2>
        <span className="text-sm text-muted-foreground">{movements.length}</span>
      </div>

      {movements.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
          {emptyLabel}
        </div>
      ) : (
        <div className="grid gap-3">
          {movements.map((movement) => (
            <Link
              key={movement.movementId}
              href={`/dashboard/treasury?date=${encodeURIComponent(consolidationDate)}&movement=${encodeURIComponent(
                movement.movementId
              )}`}
              className={`rounded-2xl border p-4 transition ${
                movement.movementId === selectedMovementId
                  ? "border-foreground bg-card"
                  : "border-border bg-secondary/40 hover:bg-secondary/60"
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="text-sm font-semibold text-foreground">{movement.concept}</p>
                    <StatusBadge
                      label={
                        movement.status === "integrated"
                          ? texts.dashboard.consolidation.status_integrated
                          : texts.dashboard.consolidation.status_pending
                      }
                      tone={movement.status === "integrated" ? "neutral" : "amber"}
                    />
                    {!movement.isValid ? (
                      <StatusBadge label={texts.dashboard.consolidation.status_invalid} tone="red" />
                    ) : null}
                    {movement.possibleMatch ? (
                      <StatusBadge label={texts.dashboard.consolidation.status_possible_match} tone="green" />
                    ) : null}
                  </div>
                  <div className="grid gap-1 text-sm text-muted-foreground">
                    <p>
                      {movement.movementDate} · {movement.accountName}
                    </p>
                    <p>
                      {movement.categoryName} · {texts.dashboard.treasury.movement_types[movement.movementType]} ·{" "}
                      {movement.createdByUserName}
                    </p>
                  </div>
                </div>
                <p className="text-base font-semibold text-foreground">
                  {movement.currencyCode} {movement.amount.toFixed(2)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export function TreasuryConsolidationCard({
  context,
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
  return (
    <div className="min-h-screen">
      <AppHeader context={context} />

      <main className="mx-auto w-full max-w-6xl px-4 py-10">
        <CardShell
          eyebrow={texts.dashboard.consolidation.eyebrow}
          title={texts.dashboard.consolidation.title}
          description={texts.dashboard.consolidation.description}
          className="max-w-6xl"
        >
          <div className="grid gap-6">
            <div className="rounded-2xl border border-border bg-secondary/40 p-4">
              <form method="get" className="grid gap-4 sm:grid-cols-[minmax(0,220px)_auto] sm:items-end">
                <label className="grid gap-2 text-sm text-foreground">
                  <span className="font-medium">{texts.dashboard.consolidation.date_label}</span>
                  <input
                    type="date"
                    name="date"
                    defaultValue={dashboard.consolidationDate}
                    className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                  />
                </label>
                <button
                  type="submit"
                  className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                >
                  {texts.dashboard.consolidation.load_cta}
                </button>
              </form>
              <p className="mt-3 text-xs text-muted-foreground">
                {texts.dashboard.consolidation.default_date_hint} {dashboard.defaultDate}
              </p>
            </div>

            {dashboard.batch ? (
              <div className="rounded-2xl border border-border bg-card p-4">
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
                        ? "green"
                        : dashboard.batch.status === "failed"
                          ? "red"
                          : "amber"
                    }
                  />
                  <p className="text-sm text-muted-foreground">
                    {texts.dashboard.consolidation.batch_label} {dashboard.batch.consolidationDate}
                  </p>
                </div>
              </div>
            ) : null}

            {dashboard.pendingMovements.length === 0 && dashboard.integratedMovements.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-5 text-sm text-muted-foreground">
                {texts.dashboard.consolidation.empty}
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
                <div className="grid gap-6">
                  <MovementList
                    title={texts.dashboard.consolidation.pending_title}
                    emptyLabel={texts.dashboard.consolidation.empty_pending}
                    movements={dashboard.pendingMovements}
                    selectedMovementId={selectedMovement?.movementId}
                    consolidationDate={dashboard.consolidationDate}
                  />

                  <MovementList
                    title={texts.dashboard.consolidation.integrated_title}
                    emptyLabel={texts.dashboard.consolidation.empty_integrated}
                    movements={dashboard.integratedMovements}
                    selectedMovementId={selectedMovement?.movementId}
                    consolidationDate={dashboard.consolidationDate}
                  />

                  <form action={executeDailyConsolidationAction} className="rounded-2xl border border-border bg-card p-4">
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
                        className="min-h-11 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
                      />
                    </div>
                  </form>
                </div>

                <div className="grid gap-6">
                  {selectedMovement ? (
                    <>
                      <section className="rounded-2xl border border-border bg-card p-4">
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
                            {selectedMovement.currencyCode} {selectedMovement.amount.toFixed(2)}
                          </p>
                        </div>

                        {!selectedMovement.isValid ? (
                          <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-800">
                            <p className="font-semibold">{texts.dashboard.consolidation.invalid_title}</p>
                            <ul className="mt-2 list-disc space-y-1 pl-5">
                              {selectedMovement.validationIssues.map((issue) => (
                                <li key={issue}>{texts.dashboard.feedback[issue as keyof typeof texts.dashboard.feedback] ?? issue}</li>
                              ))}
                            </ul>
                          </div>
                        ) : null}

                        {selectedMovement.status === "pending_consolidation" ? (
                          <form action={updateMovementBeforeConsolidationAction} className="mt-4 grid gap-4">
                            <PendingFieldset className="grid gap-4">
                              <input type="hidden" name="consolidation_date" value={dashboard.consolidationDate} />
                              <input type="hidden" name="movement_id" value={selectedMovement.movementId} />

                              <label className="grid gap-2 text-sm text-foreground">
                                <span className="font-medium">{texts.dashboard.treasury.account_label}</span>
                                <select
                                  name="account_id"
                                  defaultValue={selectedMovement.accountId}
                                  className="min-h-11 rounded-2xl border border-border bg-secondary/20 px-4 py-3 text-sm text-foreground"
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
                                  defaultValue={selectedMovement.movementType}
                                  className="min-h-11 rounded-2xl border border-border bg-secondary/20 px-4 py-3 text-sm text-foreground"
                                >
                                  <option value="ingreso">{texts.dashboard.treasury.movement_types.ingreso}</option>
                                  <option value="egreso">{texts.dashboard.treasury.movement_types.egreso}</option>
                                </select>
                              </label>

                              <label className="grid gap-2 text-sm text-foreground">
                                <span className="font-medium">{texts.dashboard.treasury.category_label}</span>
                                <select
                                  name="category_id"
                                  defaultValue={selectedMovement.categoryId}
                                  className="min-h-11 rounded-2xl border border-border bg-secondary/20 px-4 py-3 text-sm text-foreground"
                                >
                                  {categories.map((category) => (
                                    <option key={category.id} value={category.id}>
                                      {category.name}
                                    </option>
                                  ))}
                                </select>
                              </label>

                              <label className="grid gap-2 text-sm text-foreground">
                                <span className="font-medium">{texts.dashboard.treasury.concept_label}</span>
                                <input
                                  type="text"
                                  name="concept"
                                  defaultValue={selectedMovement.concept}
                                  className="min-h-11 rounded-2xl border border-border bg-secondary/20 px-4 py-3 text-sm text-foreground"
                                />
                              </label>

                              <label className="grid gap-2 text-sm text-foreground">
                                <span className="font-medium">{texts.dashboard.treasury.currency_label}</span>
                                <select
                                  name="currency_code"
                                  defaultValue={selectedMovement.currencyCode}
                                  className="min-h-11 rounded-2xl border border-border bg-secondary/20 px-4 py-3 text-sm text-foreground"
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
                                  type="number"
                                  name="amount"
                                  min="0.01"
                                  step="0.01"
                                  defaultValue={selectedMovement.amount}
                                  className="min-h-11 rounded-2xl border border-border bg-secondary/20 px-4 py-3 text-sm text-foreground"
                                />
                              </label>

                              <PendingSubmitButton
                                idleLabel={texts.dashboard.consolidation.save_changes_cta}
                                pendingLabel={texts.dashboard.consolidation.save_changes_loading}
                                className="min-h-11 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
                              />
                            </PendingFieldset>
                          </form>
                        ) : null}
                      </section>

                      {selectedMovement.possibleMatch ? (
                        <section className="rounded-2xl border border-border bg-card p-4">
                          <div className="space-y-2">
                            <h2 className="text-lg font-semibold text-foreground">
                              {texts.dashboard.consolidation.match_title}
                            </h2>
                            <p className="text-sm text-muted-foreground">
                              {texts.dashboard.consolidation.match_description}
                            </p>
                          </div>

                          <div className="mt-4 grid gap-4 sm:grid-cols-2">
                            <div className="rounded-2xl border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
                              <p className="font-semibold text-foreground">
                                {texts.dashboard.consolidation.secretaria_side}
                              </p>
                              <p className="mt-2">{selectedMovement.accountName}</p>
                              <p>{selectedMovement.categoryName}</p>
                              <p>{selectedMovement.concept}</p>
                              <p>
                                {selectedMovement.currencyCode} {selectedMovement.amount.toFixed(2)}
                              </p>
                            </div>
                            <div className="rounded-2xl border border-border bg-secondary/30 p-3 text-sm text-muted-foreground">
                              <p className="font-semibold text-foreground">
                                {texts.dashboard.consolidation.tesoreria_side}
                              </p>
                              <p className="mt-2">{selectedMovement.possibleMatch.accountName}</p>
                              <p>{selectedMovement.possibleMatch.categoryName}</p>
                              <p>{selectedMovement.possibleMatch.concept}</p>
                              <p>
                                {selectedMovement.possibleMatch.currencyCode}{" "}
                                {selectedMovement.possibleMatch.amount.toFixed(2)}
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
                                  className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                                />
                              </PendingFieldset>
                            </form>
                          ) : null}
                        </section>
                      ) : null}

                      <section className="rounded-2xl border border-border bg-card p-4">
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
                            <article key={entry.id} className="rounded-2xl border border-border bg-secondary/30 p-3">
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
                    <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-5 text-sm text-muted-foreground">
                      {texts.dashboard.consolidation.select_movement}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </CardShell>
      </main>
    </div>
  );
}
