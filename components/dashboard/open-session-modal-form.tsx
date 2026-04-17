"use client";

import { useMemo, useState } from "react";

import { PendingFieldset, PendingSubmitButton } from "@/components/ui/pending-form";
import {
  formatLocalizedAmount,
  formatLocalizedAmountInputOnBlur,
  formatLocalizedAmountInputOnFocus,
  sanitizeLocalizedAmountInput
} from "@/lib/amounts";
import type { DailyCashSessionValidation } from "@/lib/domain/access";
import { texts } from "@/lib/texts";
import { cn } from "@/lib/utils";

type OpenSessionModalFormProps = {
  validation: DailyCashSessionValidation;
  submitAction: (formData: FormData) => Promise<void>;
  onCancel: () => void;
};

type DraftState = {
  accountId: string;
  accountName: string;
  currencyCode: string;
  previousBalance: number;
  declaredBalance: string;
};

export function OpenSessionModalForm({ validation, submitAction, onCancel }: OpenSessionModalFormProps) {
  const now = new Date();
  const timeString = now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });

  const [drafts, setDrafts] = useState<DraftState[]>(
    validation.accounts.map((account) => ({
      accountId: account.accountId,
      accountName: account.accountName,
      currencyCode: account.currencyCode,
      previousBalance: account.declaredBalance,
      declaredBalance: formatLocalizedAmount(account.declaredBalance)
    }))
  );

  const hasDifferences = useMemo(() => {
    return drafts.some((draft) => {
      const prevStr = formatLocalizedAmount(draft.previousBalance);
      return draft.declaredBalance.trim() !== prevStr.trim() && draft.declaredBalance.trim() !== "";
    });
  }, [drafts]);

  function updateDraft(index: number, value: string) {
    setDrafts((current) =>
      current.map((d, i) => (i === index ? { ...d, declaredBalance: value } : d))
    );
  }

  return (
    <form action={submitAction} className="flex flex-col gap-4">
      <PendingFieldset className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              {texts.dashboard.treasury.opening_eyebrow}
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

        <div className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
            Saldos de apertura por cuenta <span className="text-destructive">*</span>
          </span>
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="grid grid-cols-[1fr_120px_140px] gap-3 border-b border-border bg-secondary/40 px-3 py-2 text-[10px] font-bold uppercase tracking-[0.06em] text-muted-foreground">
              <span>Cuenta</span>
              <span className="text-right">Cierre anterior</span>
              <span className="text-right">Saldo apertura</span>
            </div>
            {drafts.map((draft, index) => (
              <div
                key={`${draft.accountId}-${draft.currencyCode}`}
                className={cn(
                  "grid grid-cols-[1fr_120px_140px] items-center gap-3 px-3 py-2.5",
                  index < drafts.length - 1 && "border-b border-border"
                )}
              >
                <input type="hidden" name="account_id" value={draft.accountId} />
                <input type="hidden" name="currency_code" value={draft.currencyCode} />
                <div>
                  <p className="text-sm font-semibold text-foreground">{draft.accountName}</p>
                  <p className="text-[11px] text-muted-foreground">{draft.currencyCode}</p>
                </div>
                <p className="text-right text-sm tabular-nums text-muted-foreground">
                  {formatLocalizedAmount(draft.previousBalance)}
                </p>
                <input
                  type="text"
                  name="declared_balance"
                  inputMode="decimal"
                  value={draft.declaredBalance}
                  onChange={(e) => updateDraft(index, sanitizeLocalizedAmountInput(e.target.value))}
                  onBlur={(e) => updateDraft(index, formatLocalizedAmountInputOnBlur(e.target.value))}
                  onFocus={(e) => updateDraft(index, formatLocalizedAmountInputOnFocus(e.target.value))}
                  className="min-h-10 rounded-lg border border-border bg-card px-3 py-2 text-right text-sm tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                />
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground">
            Cada saldo viene prellenado con el cierre anterior. Ajustalo solo si hay diferencia física verificada.
          </p>
        </div>

        {hasDifferences ? (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="op-diff-notes" className="text-[11px] font-semibold uppercase tracking-[0.06em] text-muted-foreground">
              Motivo de la diferencia <span className="text-destructive">*</span>
            </label>
            <textarea
              id="op-diff-notes"
              name="diff_notes"
              placeholder="Una o más cuentas tienen saldo de apertura distinto al cierre anterior. Detallá el motivo."
              rows={3}
              className="min-h-[72px] resize-y rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>
        ) : null}

        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="text-[12px] leading-[1.5] text-slate-700">
            <span className="font-bold text-amber-700">! </span>
            Al confirmar, se registra la apertura del día con tu usuario para{" "}
            <strong>todas las cuentas</strong> y se habilita la carga de movimientos. La acción queda en auditoría
            y no puede deshacerse.
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
            idleLabel={texts.dashboard.treasury.confirm_open_session_cta}
            pendingLabel={texts.dashboard.treasury.confirm_open_session_loading}
            className="min-h-11 flex-1 rounded-lg bg-foreground px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
          />
        </div>
      </PendingFieldset>
    </form>
  );
}
