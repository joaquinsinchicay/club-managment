"use client";

import { useMemo, useState } from "react";

import { ModalFooter } from "@/components/ui/modal-footer";
import { PendingFieldset } from "@/components/ui/pending-form";
import {
  formatLocalizedAmount,
  formatLocalizedAmountInputOnBlur,
  formatLocalizedAmountInputOnFocus,
  parseLocalizedAmount,
  sanitizeLocalizedAmountInput
} from "@/lib/amounts";
import type { DailyCashSessionValidation } from "@/lib/domain/access";
import { texts } from "@/lib/texts";
import { cn } from "@/lib/utils";

type OpenSessionModalFormProps = {
  validation: DailyCashSessionValidation;
  submitAction: (formData: FormData) => Promise<unknown>;
  onCancel: () => void;
};

type DraftState = {
  accountId: string;
  accountName: string;
  currencyCode: string;
  previousBalance: number;
  declaredBalance: string;
};

const LABEL_CLASSNAME = "text-meta font-semibold uppercase tracking-[0.06em] text-muted-foreground";
const READONLY_INPUT_CLASSNAME = "min-h-11 rounded-card border border-border bg-secondary/40 px-3 py-2 text-sm text-muted-foreground";

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
      const declared = parseLocalizedAmount(draft.declaredBalance);
      return declared !== null && Math.abs(declared - draft.previousBalance) >= 0.01;
    });
  }, [drafts]);

  function updateDraft(index: number, value: string) {
    setDrafts((current) =>
      current.map((d, i) => (i === index ? { ...d, declaredBalance: value } : d))
    );
  }

  const warningText = texts.dashboard.treasury.open_session_warning;

  return (
    <form
      action={async (formData) => {
        await submitAction(formData);
      }}
      className="flex flex-col gap-4"
    >
      <PendingFieldset className="flex flex-col gap-4">
        {/* Fecha + Hora */}
        <div className="grid grid-cols-2 gap-3">
          <div className="flex flex-col gap-1.5">
            <p className={LABEL_CLASSNAME}>{texts.dashboard.treasury.open_session_date_label}</p>
            <div className={READONLY_INPUT_CLASSNAME}>{validation.sessionDate}</div>
          </div>
          <div className="flex flex-col gap-1.5">
            <p className={LABEL_CLASSNAME}>{texts.dashboard.treasury.open_session_time_label}</p>
            <div className={READONLY_INPUT_CLASSNAME}>{timeString}</div>
          </div>
        </div>

        {/* Tabla de saldos de apertura */}
        <div className="flex flex-col gap-1.5">
          <span className={LABEL_CLASSNAME}>
            {texts.dashboard.treasury.open_session_balances_label}{" "}
            <span className="text-destructive" aria-hidden="true">*</span>
          </span>
          <div className="overflow-hidden rounded-card border border-border">
            <div className="grid grid-cols-[1fr_120px_140px] gap-3 border-b border-border bg-secondary/40 px-3 py-2 text-eyebrow font-bold uppercase tracking-[0.06em] text-muted-foreground">
              <span>{texts.dashboard.treasury.open_session_table_account}</span>
              <span className="text-right">{texts.dashboard.treasury.open_session_table_prev}</span>
              <span className="text-right">{texts.dashboard.treasury.open_session_table_opening}</span>
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
                  <p className="text-[13px] font-semibold text-foreground">{draft.accountName}</p>
                  <p className="text-meta text-muted-foreground">{draft.currencyCode}</p>
                </div>
                <p className="text-right text-[13px] tabular-nums text-muted-foreground">
                  $ {formatLocalizedAmount(draft.previousBalance)}
                </p>
                <input
                  type="text"
                  name="declared_balance"
                  inputMode="decimal"
                  value={draft.declaredBalance}
                  onChange={(e) => updateDraft(index, sanitizeLocalizedAmountInput(e.target.value))}
                  onBlur={(e) => updateDraft(index, formatLocalizedAmountInputOnBlur(e.target.value))}
                  onFocus={(e) => updateDraft(index, formatLocalizedAmountInputOnFocus(e.target.value))}
                  className="min-h-10 rounded-card border border-border bg-card px-3 py-2 text-right text-[13px] tabular-nums text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/20"
                />
              </div>
            ))}
          </div>
          <p className="text-meta text-muted-foreground">
            {texts.dashboard.treasury.open_session_table_helper}
          </p>
        </div>

        {/* Motivo de la diferencia (condicional) */}
        {hasDifferences ? (
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="op-diff-notes"
              className={LABEL_CLASSNAME}
            >
              {texts.dashboard.treasury.open_session_diff_notes_label}{" "}
              <span className="text-destructive" aria-hidden="true">*</span>
            </label>
            <textarea
              id="op-diff-notes"
              name="diff_notes"
              placeholder={texts.dashboard.treasury.open_session_diff_notes_placeholder}
              rows={3}
              required
              className="min-h-[72px] resize-y rounded-card border border-border bg-card px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-foreground/20"
            />
          </div>
        ) : null}

        {/* Banner de advertencia */}
        <div className="rounded-card border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="text-[12px] leading-[1.5] text-slate-700">
            <span className="font-bold text-amber-700">! </span>
            {warningText.split("**").map((part, i) =>
              i % 2 === 1 ? <strong key={i}>{part}</strong> : part
            )}
          </p>
        </div>

        <ModalFooter
          onCancel={onCancel}
          cancelLabel={texts.dashboard.treasury.cancel_session_cta}
          submitLabel={texts.dashboard.treasury.confirm_open_session_cta}
          pendingLabel={texts.dashboard.treasury.confirm_open_session_loading}
        />
      </PendingFieldset>
    </form>
  );
}
