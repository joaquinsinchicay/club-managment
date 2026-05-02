"use client";

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
} from "@/components/ui/modal-form";
import { PendingFieldset } from "@/components/ui/pending-form";
import { formatLocalizedAmount } from "@/lib/amounts";
import type { DailyCashSessionValidation } from "@/lib/domain/access";
import {
  type SessionBalanceDraftBase,
  useSessionBalanceDraft,
} from "@/lib/hooks/use-session-balance-draft";
import { dashboard as txtDashboard } from "@/lib/texts";

type OpenSessionModalFormProps = {
  validation: DailyCashSessionValidation;
  submitAction: (formData: FormData) => Promise<unknown>;
  onCancel: () => void;
};

type OpenDraft = SessionBalanceDraftBase;

export function OpenSessionModalForm({ validation, submitAction, onCancel }: OpenSessionModalFormProps) {
  const now = new Date();
  const timeString = now.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });

  const initial: OpenDraft[] = validation.accounts.map((account) => ({
    accountId: account.accountId,
    accountName: account.accountName,
    currencyCode: account.currencyCode,
    referenceBalance: account.declaredBalance,
    declaredBalance: formatLocalizedAmount(account.declaredBalance),
  }));

  const { drafts, updateDraft, hasDifferences } = useSessionBalanceDraft<OpenDraft>(initial);

  const warningText = txtDashboard.treasury.open_session_warning;

  return (
    <form
      action={async (formData) => {
        await submitAction(formData);
      }}
      className="flex flex-col gap-4"
    >
      <PendingFieldset className="flex flex-col gap-4">
        {/* Fecha + Hora */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <FormFieldLabel>{txtDashboard.treasury.open_session_date_label}</FormFieldLabel>
            <FormReadonly>{validation.sessionDate}</FormReadonly>
          </div>
          <div className="flex flex-col gap-2">
            <FormFieldLabel>{txtDashboard.treasury.open_session_time_label}</FormFieldLabel>
            <FormReadonly>{timeString}</FormReadonly>
          </div>
        </div>

        {/* Tabla de saldos de apertura */}
        <div className="flex flex-col gap-2">
          <FormSection required>
            {txtDashboard.treasury.open_session_balances_label}
          </FormSection>
          <DataTable density="compact" gridColumns="1fr 120px 160px">
            <DataTableHeader>
              <DataTableHeadCell>{txtDashboard.treasury.open_session_table_account}</DataTableHeadCell>
              <DataTableHeadCell align="right">{txtDashboard.treasury.open_session_table_prev}</DataTableHeadCell>
              <DataTableHeadCell align="right">{txtDashboard.treasury.open_session_table_opening}</DataTableHeadCell>
            </DataTableHeader>
            <DataTableBody>
              {drafts.map((draft) => (
                <DataTableRow key={`${draft.accountId}-${draft.currencyCode}`} density="compact">
                  <input type="hidden" name="account_id" value={draft.accountId} />
                  <input type="hidden" name="currency_code" value={draft.currencyCode} />
                  <DataTableCell>
                    <p className="text-sm font-semibold text-foreground">{draft.accountName}</p>
                    <p className="text-xs text-muted-foreground">{draft.currencyCode}</p>
                  </DataTableCell>
                  <DataTableCell align="right">
                    <p className="text-sm tabular-nums text-muted-foreground">
                      $ {formatLocalizedAmount(draft.referenceBalance)}
                    </p>
                  </DataTableCell>
                  <DataTableCell align="right">
                    <SessionBalanceInput
                      value={draft.declaredBalance}
                      onChange={(next) => updateDraft(draft.accountId, next)}
                    />
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
          <FormHelpText>{txtDashboard.treasury.open_session_table_helper}</FormHelpText>
        </div>

        <ConfirmDifferencesSection
          visible={hasDifferences}
          id="op-diff-notes"
          label={txtDashboard.treasury.open_session_diff_notes_label}
          placeholder={txtDashboard.treasury.open_session_diff_notes_placeholder}
        />

        <FormBanner variant="warning">
          <InlineBold text={warningText} />
        </FormBanner>

        <ModalFooter
          onCancel={onCancel}
          cancelLabel={txtDashboard.treasury.cancel_session_cta}
          submitLabel={txtDashboard.treasury.confirm_open_session_cta}
          pendingLabel={txtDashboard.treasury.confirm_open_session_loading}
        />
      </PendingFieldset>
    </form>
  );
}
