"use client";

import { useMemo, useState } from "react";

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
  submitAction: (formData: FormData) => Promise<void>;
  onCancel: () => void;
};

type DraftState = {
  accountId: string;
  accountName: string;
  currencyCode: string;
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

export function CloseSessionModalForm({ validation, movements, submitAction, onCancel }: CloseSessionModalFormProps) {
  const now = new Date();
  const timeString = now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });

  const [drafts, setDrafts] = useState<DraftState[]>(
    validation.accounts.map((account) => ({
      accountId: account.accountId,
      accountName: account.accountName,
      currencyCode: account.currencyCode,
      expectedBalance: account.expectedBalance,
      declaredBalance: formatLocalizedAmount(account.expectedBalance)
    }))
  );

  const [notes, setNotes] = useState("");

  const diffs = useMemo(() => {
    return drafts.map((draft) => {
      const parsed = parseLocalizedAmount(draft.declaredBalance);
      const diff = parsed !== null ? parsed - draft.expectedBalance : 0;
      return { accountId: draft.accountId, diff };
    });
  }, [drafts]);

  const hasDifferences = diffs.some((d) => Math.abs(d.diff) >= 0.01);

  const summary = useMemo(() => computeDaySummary(movements), [movements]);

  function updateDraft(index: number, value: string) {
    setDrafts((current) =>
      current.map((d, i) => (i === index ? { ...d, declaredBalance: value } : d))
    );
  }

  function formatDiff(diff: number) {
    if (Math.abs(diff) < 0.01) return null;
    return { label: `${diff > 0 ? "+ " : "− "}$ ${formatLocalizedAmount(Math.abs(diff))}`, positive: diff > 0 };
  }

  return (
    <form action={submitAction} className="flex flex-col gap-4">
      <PendingFieldset className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              {texts.dashboard.treasury.closing_eyebrow}
            </label>
            <input
              type="text"
              value={validation.sessionDate}
              readOnly
              aria-readonly="true"
              className="min-h-11 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Hora
            </label>
            <input
              type="text"
              value={timeString}
              readOnly
              aria-readonly="true"
              className="min-h-11 rounded-lg border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground"
            />
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3 rounded-lg border border-border bg-secondary/30 px-4 py-3">
          <div>
            <p className="text-[11px] text-muted-foreground">Movimientos</p>
            <p className="mt-0.5 text-[17px] font-semibold tabular-nums text-foreground">{summary.total}</p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Ingresos</p>
            <p className="mt-0.5 text-[17px] font-semibold tabular-nums text-emerald-700">
              + {formatLocalizedAmount(summary.ingresos)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Egresos</p>
            <p className="mt-0.5 text-[17px] font-semibold tabular-nums text-red-700">
              − {formatLocalizedAmount(summary.egresos)}
            </p>
          </div>
          <div>
            <p className="text-[11px] text-muted-foreground">Transferencias</p>
            <p className="mt-0.5 text-[17px] font-semibold tabular-nums text-foreground">{summary.transfers}</p>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Arqueo por cuenta <span className="text-destructive">*</span>
          </span>
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-[1.4fr_90px_90px_120px_90px] gap-2 border-b border-border bg-secondary/40 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
              <span>Cuenta</span>
              <span className="text-right">Apertura</span>
              <span className="text-right">Mov. netos</span>
              <span className="text-right">Saldo real</span>
              <span className="text-right">Diferencia</span>
            </div>
            {drafts.map((draft, index) => {
              const diffResult = formatDiff(diffs[index]?.diff ?? 0);
              const netMovements = draft.expectedBalance - (validation.accounts[index]?.declaredBalance ?? draft.expectedBalance);

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
                      Esperado: <span className="font-medium text-foreground">{formatLocalizedAmount(draft.expectedBalance)}</span>
                    </p>
                  </div>
                  <p className="text-right text-[13px] tabular-nums text-muted-foreground">
                    {formatLocalizedAmount(validation.accounts[index]?.declaredBalance ?? 0)}
                  </p>
                  <p className={cn(
                    "text-right text-[13px] tabular-nums",
                    netMovements > 0 ? "text-emerald-700" : netMovements < 0 ? "text-red-700" : "text-muted-foreground"
                  )}>
                    {netMovements === 0 ? "—" : `${netMovements > 0 ? "+ " : "− "}${formatLocalizedAmount(Math.abs(netMovements))}`}
                  </p>
                  <input
                    type="text"
                    name="declared_balance"
                    inputMode="decimal"
                    value={draft.declaredBalance}
                    onChange={(e) => updateDraft(index, sanitizeLocalizedAmountInput(e.target.value))}
                    onBlur={(e) => updateDraft(index, formatLocalizedAmountInputOnBlur(e.target.value))}
                    onFocus={(e) => updateDraft(index, formatLocalizedAmountInputOnFocus(e.target.value))}
                    className="min-h-9 rounded-lg border border-border bg-card px-2 py-1.5 text-right text-[13px] tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                  />
                  <p className={cn(
                    "text-right text-[13px] font-semibold tabular-nums",
                    diffResult === null ? "text-muted-foreground/60" : diffResult.positive ? "text-emerald-700" : "text-red-700"
                  )}>
                    {diffResult ? diffResult.label : "—"}
                  </p>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Ingresá el saldo físico verificado. La diferencia con el saldo esperado se calcula en vivo.
          </p>
        </div>

        {hasDifferences ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="cl-diff-notes" className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Motivo de la diferencia <span className="text-destructive">*</span>
            </label>
            <textarea
              id="cl-diff-notes"
              name="diff_notes"
              placeholder="Una o más cuentas presentan diferencias de arqueo. Detallá el motivo (faltante, sobrante, gasto no registrado, etc.)"
              rows={3}
              className="min-h-[72px] resize-y rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-1.5">
          <label htmlFor="cl-notes" className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Observaciones generales
          </label>
          <textarea
            id="cl-notes"
            name="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Opcional"
            rows={2}
            className="min-h-[56px] resize-y rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/20"
          />
        </div>

        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5">
          <p className="text-[12px] leading-[1.5] text-slate-700">
            <span className="font-bold text-red-700">! </span>
            Al confirmar, se cierra la jornada para <strong>todas las cuentas</strong>, se bloquea la carga de
            movimientos y queda registrado el arqueo. La acción no puede deshacerse.
          </p>
        </div>

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
