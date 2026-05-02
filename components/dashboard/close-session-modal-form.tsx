"use client";

import { type FormEvent, useMemo } from "react";

import { ConfirmDifferencesSection } from "@/components/dashboard/confirm-differences-section";
import { SessionBalanceInput } from "@/components/dashboard/session-balance-input";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableHeader,
  DataTableHeadCell,
  DataTableRow,
} from "@/components/ui/data-table";
import { InlineBold } from "@/components/ui/inline-bold";
import { ModalFooter } from "@/components/ui/modal-footer";
import {
  FormBanner,
  FormFieldLabel,
  FormHelpText,
  FormReadonly,
  FormSection,
  FormTextarea,
} from "@/components/ui/modal-form";
import { PendingFieldset } from "@/components/ui/pending-form";
import { formatLocalizedAmount, parseLocalizedAmount } from "@/lib/amounts";
import type { DailyCashSessionValidation, DashboardTreasuryCard } from "@/lib/domain/access";
import {
  type SessionBalanceDraftBase,
  useSessionBalanceDraft,
} from "@/lib/hooks/use-session-balance-draft";
import { dashboard as txtDashboard } from "@/lib/texts";
import { cn } from "@/lib/utils";

type CloseSessionModalFormProps = {
  validation: DailyCashSessionValidation;
  movements: DashboardTreasuryCard["movements"];
  currentUserDisplayName: string;
  submitAction: (formData: FormData) => Promise<unknown>;
  onCancel: () => void;
};

type CloseDraft = SessionBalanceDraftBase & {
  openingBalance: number;
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

  const initial: CloseDraft[] = validation.accounts.map((account) => ({
    accountId: account.accountId,
    accountName: account.accountName,
    currencyCode: account.currencyCode,
    referenceBalance: account.expectedBalance,
    openingBalance: account.openingDeclaredBalance ?? 0,
    declaredBalance: formatLocalizedAmount(account.expectedBalance),
  }));

  const { drafts, updateDraft, hasDifferences, hasNegativeBalances } =
    useSessionBalanceDraft<CloseDraft>(initial);

  const summary = useMemo(() => computeDaySummary(movements), [movements]);

  function getDiff(accountId: string): number {
    const draft = drafts.find((d) => d.accountId === accountId);
    if (!draft) return 0;
    const parsed = parseLocalizedAmount(draft.declaredBalance);
    return parsed !== null ? parsed - draft.referenceBalance : 0;
  }

  function formatDiffLabel(diff: number): { label: string; positive: boolean } | null {
    if (Math.abs(diff) < 0.01) return null;
    return {
      label: `${diff > 0 ? "+ " : "− "}$ ${formatLocalizedAmount(Math.abs(diff))}`,
      positive: diff > 0
    };
  }

  const warningText = txtDashboard.treasury.close_session_warning.replace(
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
            <FormFieldLabel>{txtDashboard.treasury.close_session_date_label}</FormFieldLabel>
            <FormReadonly>{validation.sessionDate}</FormReadonly>
          </div>
          <div className="flex flex-col gap-2">
            <FormFieldLabel>{txtDashboard.treasury.close_session_time_label}</FormFieldLabel>
            <FormReadonly>{timeString}</FormReadonly>
          </div>
        </div>

        {/* Resumen del día */}
        <div className="grid grid-cols-4 gap-3 rounded-card border border-border bg-secondary-subtle px-4 py-3">
          <div>
            <p className="text-xs text-muted-foreground">{txtDashboard.treasury.close_session_summary_movements}</p>
            <p className="mt-0.5 text-h4 font-semibold tabular-nums text-foreground">{summary.total}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{txtDashboard.treasury.close_session_summary_ingresos}</p>
            <p className="mt-0.5 text-h4 font-semibold tabular-nums text-success">
              + {formatLocalizedAmount(summary.ingresos)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{txtDashboard.treasury.close_session_summary_egresos}</p>
            <p className="mt-0.5 text-h4 font-semibold tabular-nums text-ds-red-700">
              − {formatLocalizedAmount(summary.egresos)}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">{txtDashboard.treasury.close_session_summary_transfers}</p>
            <p className="mt-0.5 text-h4 font-semibold tabular-nums text-foreground">{summary.transfers}</p>
          </div>
        </div>

        {/* Tabla de arqueo */}
        <div className="flex flex-col gap-2">
          <FormSection required>
            {txtDashboard.treasury.close_session_table_account}
          </FormSection>
          <DataTable density="compact" gridColumns="1.4fr 90px 90px 140px 100px">
            <DataTableHeader>
              <DataTableHeadCell>{txtDashboard.treasury.close_session_table_account}</DataTableHeadCell>
              <DataTableHeadCell align="right">{txtDashboard.treasury.close_session_table_opening}</DataTableHeadCell>
              <DataTableHeadCell align="right">{txtDashboard.treasury.close_session_table_net_movements}</DataTableHeadCell>
              <DataTableHeadCell align="right">{txtDashboard.treasury.close_session_table_real_balance}</DataTableHeadCell>
              <DataTableHeadCell align="right">{txtDashboard.treasury.close_session_table_difference}</DataTableHeadCell>
            </DataTableHeader>
            <DataTableBody>
              {drafts.map((draft) => {
                const netMovements = draft.referenceBalance - draft.openingBalance;
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
                        {txtDashboard.treasury.expected_balance_label}:{" "}
                        <span className="font-medium text-foreground">
                          $ {formatLocalizedAmount(draft.referenceBalance)}
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
                      <SessionBalanceInput
                        value={draft.declaredBalance}
                        onChange={(next) => updateDraft(draft.accountId, next)}
                        errorText={
                          isNegative
                            ? txtDashboard.treasury.close_session_negative_balance_error
                            : undefined
                        }
                      />
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
          <FormHelpText>{txtDashboard.treasury.close_session_table_helper}</FormHelpText>
        </div>

        <ConfirmDifferencesSection
          visible={hasDifferences}
          id="cl-diff-notes"
          label={txtDashboard.treasury.close_session_diff_notes_label}
          placeholder={txtDashboard.treasury.close_session_diff_notes_placeholder}
        />

        {/* Observaciones generales */}
        <div className="flex flex-col gap-2">
          <FormFieldLabel>{txtDashboard.treasury.close_session_notes_label}</FormFieldLabel>
          <FormTextarea
            id="cl-notes"
            name="notes"
            placeholder={txtDashboard.treasury.close_session_notes_placeholder}
            rows={2}
          />
        </div>

        <FormBanner variant="destructive">
          <InlineBold text={warningText} />
        </FormBanner>

        <ModalFooter
          onCancel={onCancel}
          cancelLabel={txtDashboard.treasury.cancel_session_cta}
          submitLabel={txtDashboard.treasury.confirm_close_session_cta}
          pendingLabel={txtDashboard.treasury.confirm_close_session_loading}
          submitVariant="destructive"
        />
      </PendingFieldset>
    </form>
  );
}
