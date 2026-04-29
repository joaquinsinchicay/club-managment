"use client";

import { type FormEvent, useMemo, useState } from "react";

import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeader,
  DataTableHeadCell,
  DataTableRow,
} from "@/components/ui/data-table";
import { ModalFooter } from "@/components/ui/modal-footer";
import {
  FormBanner,
  FormFieldLabel,
  FormHelpText,
  FormInput,
  FormReadonly,
  FormSection,
  FormTextarea,
} from "@/components/ui/modal-form";
import { PendingFieldset } from "@/components/ui/pending-form";
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
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <FormFieldLabel>{texts.dashboard.treasury.close_session_date_label}</FormFieldLabel>
            <FormReadonly>{validation.sessionDate}</FormReadonly>
          </div>
          <div className="flex flex-col gap-2">
            <FormFieldLabel>{texts.dashboard.treasury.close_session_time_label}</FormFieldLabel>
            <FormReadonly>{timeString}</FormReadonly>
          </div>
        </div>

        {/* Resumen del día */}
        <div className="grid grid-cols-4 gap-3 rounded-card border border-border bg-secondary/30 px-4 py-3">
          <div>
            <p className="text-xs text-muted-foreground">{texts.dashboard.treasury.close_session_summary_movements}</p>
            <p className="mt-0.5 text-h4 font-semibold tabular-nums text-foreground">{summary.total}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{texts.dashboard.treasury.close_session_summary_ingresos}</p>
            <p className="mt-0.5 text-h4 font-semibold tabular-nums text-success">
              + {formatLocalizedAmount(summary.ingresos)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{texts.dashboard.treasury.close_session_summary_egresos}</p>
            <p className="mt-0.5 text-h4 font-semibold tabular-nums text-ds-red-700">
              − {formatLocalizedAmount(summary.egresos)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{texts.dashboard.treasury.close_session_summary_transfers}</p>
            <p className="mt-0.5 text-h4 font-semibold tabular-nums text-foreground">{summary.transfers}</p>
          </div>
        </div>

        {/* Tabla de arqueo */}
        <div className="flex flex-col gap-2">
          <FormSection required>
            {texts.dashboard.treasury.close_session_table_account}
          </FormSection>
          <DataTable density="compact" gridColumns="1.4fr 90px 90px 140px 100px">
            <DataTableHeader>
              <DataTableHeadCell>{texts.dashboard.treasury.close_session_table_account}</DataTableHeadCell>
              <DataTableHeadCell align="right">{texts.dashboard.treasury.close_session_table_opening}</DataTableHeadCell>
              <DataTableHeadCell align="right">{texts.dashboard.treasury.close_session_table_net_movements}</DataTableHeadCell>
              <DataTableHeadCell align="right">{texts.dashboard.treasury.close_session_table_real_balance}</DataTableHeadCell>
              <DataTableHeadCell align="right">{texts.dashboard.treasury.close_session_table_difference}</DataTableHeadCell>
            </DataTableHeader>
            <DataTableBody>
              {drafts.map((draft) => {
                const netMovements = draft.expectedBalance - draft.openingBalance;
                const diff = getDiff(draft.accountId);
                const diffLabel = formatDiffLabel(diff);
                const parsedDeclared = parseLocalizedAmount(draft.declaredBalance);
                const isNegative = parsedDeclared !== null && parsedDeclared < 0;

                return (
                  <DataTableRow key={`${draft.accountId}-${draft.currencyCode}`} density="compact">
                    <input type="hidden" name="account_id" value={draft.accountId} />
                    <input type="hidden" name="currency_code" value={draft.currencyCode} />
                    <DataTableCell>
                      <p className="text-sm font-semibold text-foreground">{draft.accountName}</p>
                      <p className="text-xs text-muted-foreground">
                        {texts.dashboard.treasury.expected_balance_label}:{" "}
                        <span className="font-medium text-foreground">
                          $ {formatLocalizedAmount(draft.expectedBalance)}
                        </span>
                      </p>
                    </DataTableCell>
                    <DataTableCell align="right">
                      <p className="text-sm tabular-nums text-muted-foreground">
                        $ {formatLocalizedAmount(draft.openingBalance)}
                      </p>
                    </DataTableCell>
                    <DataTableCell align="right">
                      <p
                        className={cn(
                          "text-sm tabular-nums",
                          netMovements > 0
                            ? "text-ds-green-700"
                            : netMovements < 0
                              ? "text-ds-red-700"
                              : "text-muted-foreground"
                        )}
                      >
                        {netMovements === 0
                          ? "—"
                          : `${netMovements > 0 ? "+ " : "− "}$ ${formatLocalizedAmount(Math.abs(netMovements))}`}
                      </p>
                    </DataTableCell>
                    <DataTableCell align="right">
                      <div className="flex flex-col gap-1">
                        <FormInput
                          type="text"
                          name="declared_balance"
                          inputMode="decimal"
                          value={draft.declaredBalance}
                          onChange={(e) => updateDraft(draft.accountId, sanitizeLocalizedAmountInput(e.target.value))}
                          onBlur={(e) => updateDraft(draft.accountId, formatLocalizedAmountInputOnBlur(e.target.value))}
                          onFocus={(e) => updateDraft(draft.accountId, formatLocalizedAmountInputOnFocus(e.target.value))}
                          className={cn(
                            "text-right tabular-nums",
                            isNegative && "border-destructive focus:ring-destructive/20"
                          )}
                        />
                        {isNegative ? (
                          <p className="text-right text-xs font-medium text-destructive">
                            {texts.dashboard.treasury.close_session_negative_balance_error}
                          </p>
                        ) : null}
                      </div>
                    </DataTableCell>
                    <DataTableCell align="right">
                      <p
                        className={cn(
                          "text-sm font-semibold tabular-nums",
                          diffLabel === null
                            ? "text-muted-foreground/60"
                            : diffLabel.positive
                              ? "text-ds-green-700"
                              : "text-ds-red-700"
                        )}
                      >
                        {diffLabel ? diffLabel.label : "—"}
                      </p>
                    </DataTableCell>
                  </DataTableRow>
                );
              })}
            </DataTableBody>
          </DataTable>
          <FormHelpText>{texts.dashboard.treasury.close_session_table_helper}</FormHelpText>
        </div>

        {/* Motivo de la diferencia (solo si hay diferencias) */}
        {hasDifferences ? (
          <div className="flex flex-col gap-2">
            <FormFieldLabel required>
              {texts.dashboard.treasury.close_session_diff_notes_label}
            </FormFieldLabel>
            <FormTextarea
              id="cl-diff-notes"
              name="diff_notes"
              placeholder={texts.dashboard.treasury.close_session_diff_notes_placeholder}
              rows={3}
              required
            />
          </div>
        ) : null}

        {/* Observaciones generales */}
        <div className="flex flex-col gap-2">
          <FormFieldLabel>{texts.dashboard.treasury.close_session_notes_label}</FormFieldLabel>
          <FormTextarea
            id="cl-notes"
            name="notes"
            placeholder={texts.dashboard.treasury.close_session_notes_placeholder}
            rows={2}
          />
        </div>

        <FormBanner variant="destructive">
          {warningText.split("**").map((part, i) =>
            i % 2 === 1 ? <strong key={i}>{part}</strong> : part
          )}
        </FormBanner>

        <ModalFooter
          onCancel={onCancel}
          cancelLabel={texts.dashboard.treasury.cancel_session_cta}
          submitLabel={texts.dashboard.treasury.confirm_close_session_cta}
          pendingLabel={texts.dashboard.treasury.confirm_close_session_loading}
          submitVariant="destructive"
        />
      </PendingFieldset>
    </form>
  );
}
