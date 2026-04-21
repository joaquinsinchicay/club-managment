"use client";

import { useMemo, useState } from "react";

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
import type { DailyCashSessionValidation } from "@/lib/domain/access";
import { texts } from "@/lib/texts";

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
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-2">
            <FormFieldLabel>{texts.dashboard.treasury.open_session_date_label}</FormFieldLabel>
            <FormReadonly>{validation.sessionDate}</FormReadonly>
          </div>
          <div className="flex flex-col gap-2">
            <FormFieldLabel>{texts.dashboard.treasury.open_session_time_label}</FormFieldLabel>
            <FormReadonly>{timeString}</FormReadonly>
          </div>
        </div>

        {/* Tabla de saldos de apertura */}
        <div className="flex flex-col gap-2">
          <FormSection required>
            {texts.dashboard.treasury.open_session_balances_label}
          </FormSection>
          <DataTable density="compact" gridColumns="1fr 120px 160px">
            <DataTableHeader>
              <DataTableHeadCell>{texts.dashboard.treasury.open_session_table_account}</DataTableHeadCell>
              <DataTableHeadCell align="right">{texts.dashboard.treasury.open_session_table_prev}</DataTableHeadCell>
              <DataTableHeadCell align="right">{texts.dashboard.treasury.open_session_table_opening}</DataTableHeadCell>
            </DataTableHeader>
            <DataTableBody>
              {drafts.map((draft, index) => (
                <DataTableRow key={`${draft.accountId}-${draft.currencyCode}`} density="compact">
                  <input type="hidden" name="account_id" value={draft.accountId} />
                  <input type="hidden" name="currency_code" value={draft.currencyCode} />
                  <DataTableCell>
                    <p className="text-sm font-semibold text-foreground">{draft.accountName}</p>
                    <p className="text-xs text-muted-foreground">{draft.currencyCode}</p>
                  </DataTableCell>
                  <DataTableCell align="right">
                    <p className="text-sm tabular-nums text-muted-foreground">
                      $ {formatLocalizedAmount(draft.previousBalance)}
                    </p>
                  </DataTableCell>
                  <DataTableCell align="right">
                    <FormInput
                      type="text"
                      name="declared_balance"
                      inputMode="decimal"
                      value={draft.declaredBalance}
                      onChange={(e) => updateDraft(index, sanitizeLocalizedAmountInput(e.target.value))}
                      onBlur={(e) => updateDraft(index, formatLocalizedAmountInputOnBlur(e.target.value))}
                      onFocus={(e) => updateDraft(index, formatLocalizedAmountInputOnFocus(e.target.value))}
                      className="text-right tabular-nums"
                    />
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
          <FormHelpText>{texts.dashboard.treasury.open_session_table_helper}</FormHelpText>
        </div>

        {/* Motivo de la diferencia (condicional) */}
        {hasDifferences ? (
          <div className="flex flex-col gap-2">
            <FormFieldLabel required>
              {texts.dashboard.treasury.open_session_diff_notes_label}
            </FormFieldLabel>
            <FormTextarea
              id="op-diff-notes"
              name="diff_notes"
              placeholder={texts.dashboard.treasury.open_session_diff_notes_placeholder}
              rows={3}
              required
            />
          </div>
        ) : null}

        <FormBanner variant="warning">
          {warningText.split("**").map((part, i) =>
            i % 2 === 1 ? <strong key={i}>{part}</strong> : part
          )}
        </FormBanner>

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
