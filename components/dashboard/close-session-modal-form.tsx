"use client";

import { type FormEvent, useMemo, useState } from "react";

import { PendingFieldset, PendingSubmitButton } from "@/components/ui/pending-form";
import {
  formatLocalizedAmount,
  formatLocalizedAmountInputOnBlur,
  formatLocalizedAmountInputOnFocus,
  parseLocalizedAmount,
  sanitizeLocalizedAmountInput
} from "@/lib/amounts";
import type { DailyCashSessionValidation, DashboardTreasuryCard } from "@/lib/domain/access";
import { texts } from "@/lib/texts";
import { cn } from "@/lib/utils";

type CloseSessionModalFormProps = {
  validation: DailyCashSessionValidation;
  movements: DashboardTreasuryCard["movements"];
  currentUserDisplayName: string;
  submitAction: (formData: FormData) => Promise<unknown>;
  onCancel: () => void;
};

type DraftState = {
  accountId: string;
  accountName: string;
  currencyCode: string;
  openingBalance: number;
  expectedBalance: number;
  declaredBalance: string;
};

function computeDaySummary(movements: DashboardTreasuryCard["movements"]) {
  let ingresos = 0;
  let egresos = 0;
  let transfers = 0;

  for (const m of movements) {
    if (m.transferReference || m.fxOperationReference) {
      transfers++;
    } else if (m.movementType === "ingreso") {
      ingresos += m.amount;
    } else {
      egresos += m.amount;
    }
  }

  return { total: movements.length, ingresos, egresos, transfers };
}

export function CloseSessionModalForm({
  validation,
  movements,
  currentUserDisplayName,
  submitAction,
  onCancel
}: CloseSessionModalFormProps) {
  const now = new Date();
  const timeString = now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });

  const [drafts, setDrafts] = useState<DraftState[]>(
    validation.accounts.map((account) => ({
      accountId: account.accountId,
      accountName: account.accountName,
      currencyCode: account.currencyCode,
      openingBalance: account.openingDeclaredBalance ?? 0,
      expectedBalance: account.expectedBalance,
      declaredBalance: formatLocalizedAmount(account.expectedBalance)
    }))
  );

  const diffs = useMemo(() => {
    return drafts.map((draft) => {
      const parsed = parseLocalizedAmount(draft.declaredBalance);
      const diff = parsed !== null ? parsed - draft.expectedBalance : 0;
      return { accountId: draft.accountId, diff };
    });
  }, [drafts]);

  const hasDifferences = diffs.some((d) => Math.abs(d.diff) >= 0.01);
  const hasNegativeBalances = useMemo(
    () => drafts.some((d) => { const p = parseLocalizedAmount(d.declaredBalance); return p !== null && p < 0; }),
    [drafts]
  );
  const summary = useMemo(() => computeDaySummary(movements), [movements]);

  function updateDraft(accountId: string, value: string) {
    setDrafts((current) =>
      current.map((d) => (d.accountId === accountId ? { ...d, declaredBalance: value } : d))
    );
  }

  function getDiff(accountId: string) {
    return diffs.find((d) => d.accountId === accountId)?.diff ?? 0;
  }

  function formatDiffLabel(diff: number): { label: string; positive: boolean } | null {
    if (Math.abs(diff) < 0.01) return null;
    return {
      label: `${diff > 0 ? "+ " : "− "}$ ${formatLocalizedAmount(Math.abs(diff))}`,
      positive: diff > 0
    };
  }

  const warningText = texts.dashboard.treasury.close_session_warning.replace(
    "{userName}",
    currentUserDisplayName
  );

  return (
    <form
      action={async (formData) => { await submitAction(formData); }}
      className="flex flex-col gap-4"
      onSubmit={(event: FormEvent<HTMLFormElement>) => {
        if (hasNegativeBalances) {
          event.preventDefault();
          return;
        }
        if (hasDifferences) {
          const diffNotes = new FormData(event.currentTarget).get("diff_notes");
          if (!diffNotes || String(diffNotes).trim() === "") {
            event.preventDefault();
          }
        }
      }}
    >
      <PendingFieldset className="flex flex-col gap-4">
        {/* Fecha + Hora */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              {texts.dashboard.treasury.close_session_date_label}
            </p>
            <div className="min-h-11 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
              {validation.sessionDate}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              {texts.dashboard.treasury.close_session_time_label}
            </p>
            <div className="min-h-11 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground">
              {timeString}
            </div>
          </div>
        </div>

        {/* Resumen del día */}
        <div className="grid grid-cols-4 gap-3 rounded-lg border border-border bg-secondary/30 px-4 py-3">
          <div>
            <p className="text-[11px] text-muted-foreground">{texts.dashboard.treasury.close_session_summary_movements}</p>
            <p className="mt-0.5 text-[17px] font-semibold tabular-nums text-foreground">{summary.total}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">{texts.dashboard.treasury.close_session_summary_ingresos}</p>
            <p className="mt-0.5 text-[17px] font-semibold tabular-nums text-emerald-700">
              + {formatLocalizedAmount(summary.ingresos)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">{texts.dashboard.treasury.close_session_summary_egresos}</p>
            <p className="mt-0.5 text-[17px] font-semibold tabular-nums text-red-700">
              − {formatLocalizedAmount(summary.egresos)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">{texts.dashboard.treasury.close_session_summary_transfers}</p>
            <p className="mt-0.5 text-[17px] font-semibold tabular-nums text-foreground">{summary.transfers}</p>
          </div>
        </div>

        {/* Tabla de arqueo */}
        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            {texts.dashboard.treasury.close_session_table_account}{" "}
            <span className="text-destructive" aria-hidden="true">*</span>
          </span>
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-[1.4fr_90px_90px_120px_90px] gap-2 border-b border-border bg-secondary/40 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
              <span>{texts.dashboard.treasury.close_session_table_account}</span>
              <span className="text-right">{texts.dashboard.treasury.close_session_table_opening}</span>
              <span className="text-right">{texts.dashboard.treasury.close_session_table_net_movements}</span>
              <span className="text-right">{texts.dashboard.treasury.close_session_table_real_balance}</span>
              <span className="text-right">{texts.dashboard.treasury.close_session_table_difference}</span>
            </div>
            {drafts.map((draft, index) => {
              const netMovements = draft.expectedBalance - draft.openingBalance;
              const diff = getDiff(draft.accountId);
              const diffLabel = formatDiffLabel(diff);
              const parsedDeclared = parseLocalizedAmount(draft.declaredBalance);
              const isNegative = parsedDeclared !== null && parsedDeclared < 0;

              return (
                <div
                  key={`${draft.accountId}-${draft.currencyCode}`}
                  className={cn(
                    "grid grid-cols-[1.4fr_90px_90px_120px_90px] items-center gap-2 px-3 py-2.5",
                    index < drafts.length - 1 && "border-b border-border"
                  )}
                >
                  <input type="hidden" name="account_id" value={draft.accountId} />
                  <input type="hidden" name="currency_code" value={draft.currencyCode} />
                  <div>
                    <p className="text-[13px] font-semibold text-foreground">{draft.accountName}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {texts.dashboard.treasury.expected_balance_label}:{" "}
                      <span className="font-medium text-foreground">
                        $ {formatLocalizedAmount(draft.expectedBalance)}
                      </span>
                    </p>
                  </div>
                  <p className="text-right text-[13px] tabular-nums text-muted-foreground">
                    $ {formatLocalizedAmount(draft.openingBalance)}
                  </p>
                  <p
                    className={cn(
                      "text-right text-[13px] tabular-nums",
                      netMovements > 0
                        ? "text-emerald-700"
                        : netMovements < 0
                          ? "text-red-700"
                          : "text-muted-foreground"
                    )}
                  >
                    {netMovements === 0
                      ? "—"
                      : `${netMovements > 0 ? "+ " : "− "}$ ${formatLocalizedAmount(Math.abs(netMovements))}`}
                  </p>
                  <div className="flex flex-col gap-1">
                    <input
                      type="text"
                      name="declared_balance"
                      inputMode="decimal"
                      value={draft.declaredBalance}
                      onChange={(e) => updateDraft(draft.accountId, sanitizeLocalizedAmountInput(e.target.value))}
                      onBlur={(e) => updateDraft(draft.accountId, formatLocalizedAmountInputOnBlur(e.target.value))}
                      onFocus={(e) => updateDraft(draft.accountId, formatLocalizedAmountInputOnFocus(e.target.value))}
                      className={cn(
                        "min-h-9 rounded-lg border bg-card px-2 py-1.5 text-right text-[13px] tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20",
                        isNegative ? "border-destructive focus:ring-destructive/20" : "border-border"
                      )}
                    />
                    {isNegative ? (
                      <p className="text-right text-[10px] font-semibold text-destructive">
                        {texts.dashboard.treasury.close_session_negative_balance_error}
                      </p>
                    ) : null}
                  </div>
                  <p
                    className={cn(
                      "text-right text-[13px] font-semibold tabular-nums",
                      diffLabel === null
                        ? "text-muted-foreground/60"
                        : diffLabel.positive
                          ? "text-emerald-700"
                          : "text-red-700"
                    )}
                  >
                    {diffLabel ? diffLabel.label : "—"}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            {texts.dashboard.treasury.close_session_table_helper}
          </p>
        </div>

        {/* Motivo de la diferencia (solo si hay diferencias) */}
        {hasDifferences ? (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="cl-diff-notes"
              className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
            >
              {texts.dashboard.treasury.close_session_diff_notes_label}{" "}
              <span className="text-destructive" aria-hidden="true">*</span>
            </label>
            <textarea
              id="cl-diff-notes"
              name="diff_notes"
              placeholder={texts.dashboard.treasury.close_session_diff_notes_placeholder}
              rows={3}
              required
              className="min-h-[72px] resize-y rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>
        ) : null}

        {/* Observaciones generales */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="cl-notes"
            className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground"
          >
            {texts.dashboard.treasury.close_session_notes_label}
          </label>
          <textarea
            id="cl-notes"
            name="notes"
            placeholder={texts.dashboard.treasury.close_session_notes_placeholder}
            rows={2}
            className="min-h-[56px] resize-y rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
        </div>

        {/* Banner de advertencia */}
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
          <p className="text-[12px] leading-[1.5] text-slate-700">
            <span className="font-bold text-red-700">! </span>
            {warningText.split("**").map((part, i) =>
              i % 2 === 1 ? <strong key={i}>{part}</strong> : part
            )}
          </p>
        </div>

        {/* Botones */}
        <div className="flex gap-2 border-t border-border pt-3">
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 flex-1 rounded-lg border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary"
          >
            {texts.dashboard.treasury.cancel_session_cta}
          </button>
          <PendingSubmitButton
            idleLabel={texts.dashboard.treasury.confirm_close_session_cta}
            pendingLabel={texts.dashboard.treasury.confirm_close_session_loading}
            className="min-h-11 flex-1 rounded-lg bg-destructive px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90"
          />
        </div>
      </PendingFieldset>
    </form>
  );
}
