"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import type { RrhhActionResult } from "@/app/(dashboard)/settings/rrhh/actions";
import {
  formatLocalizedAmountInputOnBlur,
  formatLocalizedAmountInputOnFocus,
  sanitizeLocalizedAmountInput,
} from "@/lib/amounts";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableHeadCell,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import { LinkButton } from "@/components/ui/link-button";
import { Modal } from "@/components/ui/modal";
import { ModalFooter } from "@/components/ui/modal-footer";
import {
  FormField,
  FormFieldLabel,
  FormHelpText,
  FormInput,
} from "@/components/ui/modal-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { triggerClientFeedback } from "@/lib/client-feedback";
import type { StaffContract } from "@/lib/domain/staff-contract";
import type { StaffContractRevision } from "@/lib/domain/staff-contract-revision";
import { texts } from "@/lib/texts";

type ContractDetailViewProps = {
  contract: StaffContract;
  revisions: StaffContractRevision[];
  clubCurrencyCode: string;
  canMutate: boolean;
  createRevisionAction: (formData: FormData) => Promise<RrhhActionResult>;
};

const cdTexts = texts.rrhh.contract_detail;
const scTexts = texts.rrhh.staff_contracts;

function formatAmount(amount: number | null | undefined, currencyCode: string): string {
  if (amount === null || amount === undefined) return "—";
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function ContractDetailView({
  contract,
  revisions,
  clubCurrencyCode,
  canMutate,
  createRevisionAction,
}: ContractDetailViewProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [reviseOpen, setReviseOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [amountInput, setAmountInput] = useState("");

  async function handleSubmit(formData: FormData) {
    setPending(true);
    try {
      const result = await createRevisionAction(formData);
      triggerClientFeedback("settings", result.code);
      if (result.ok) {
        setReviseOpen(false);
        setAmountInput("");
        startTransition(() => router.refresh());
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <LinkButton href="/rrhh/contracts" variant="secondary" size="sm">
          {cdTexts.back_cta}
        </LinkButton>
        {canMutate && contract.status === "vigente" ? (
          <button
            type="button"
            onClick={() => setReviseOpen(true)}
            className={buttonClass({ variant: "primary", size: "sm" })}
          >
            {cdTexts.new_revision_cta}
          </button>
        ) : null}
      </div>

      <header className="flex flex-col gap-1">
        <h1 className="text-h2 font-bold text-foreground">
          {contract.staffMemberName ?? scTexts.unknown_member}
        </h1>
        <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
          <span>{contract.salaryStructureName ?? scTexts.unknown_structure}</span>
          {contract.salaryStructureRole ? (
            <>
              <span>·</span>
              <span>{contract.salaryStructureRole}</span>
            </>
          ) : null}
          {contract.salaryStructureActivityName ? (
            <>
              <span>·</span>
              <span>{contract.salaryStructureActivityName}</span>
            </>
          ) : null}
          <StatusBadge
            tone={contract.status === "vigente" ? "success" : "neutral"}
            label={scTexts.status_options[contract.status]}
          />
        </div>
      </header>

      <section className="grid gap-3 sm:grid-cols-3">
        <Card padding="comfortable">
          <CardHeader eyebrow={cdTexts.card_start_eyebrow} title={contract.startDate} />
        </Card>
        <Card padding="comfortable">
          <CardHeader
            eyebrow={cdTexts.card_end_eyebrow}
            title={contract.endDate ?? cdTexts.card_end_indefinite}
          />
        </Card>
        <Card padding="comfortable">
          <CardHeader
            eyebrow={cdTexts.card_current_amount_eyebrow}
            title={formatAmount(contract.currentAmount, clubCurrencyCode)}
          />
        </Card>
      </section>

      <Card padding="none">
        <CardHeader
          eyebrow={cdTexts.revisions_eyebrow}
          title={cdTexts.revisions_title}
          description={cdTexts.revisions_description}
          divider
        />
        <CardBody>
          {revisions.length === 0 ? (
            <DataTableEmpty
              title={cdTexts.revisions_empty_title}
              description={cdTexts.revisions_empty_description}
            />
          ) : (
            <DataTable
              density="comfortable"
              gridColumns="130px 130px minmax(0,1fr) 140px 120px"
            >
              <DataTableHeader>
                <DataTableHeadCell>{cdTexts.col_effective_from}</DataTableHeadCell>
                <DataTableHeadCell>{cdTexts.col_effective_to}</DataTableHeadCell>
                <DataTableHeadCell>{cdTexts.col_reason}</DataTableHeadCell>
                <DataTableHeadCell align="right">{cdTexts.col_amount}</DataTableHeadCell>
                <DataTableHeadCell>{cdTexts.col_revision_status}</DataTableHeadCell>
              </DataTableHeader>
              <DataTableBody>
                {revisions.map((r) => (
                  <DataTableRow key={r.id} density="comfortable">
                    <DataTableCell>{r.effectiveDate}</DataTableCell>
                    <DataTableCell>{r.endDate ?? "—"}</DataTableCell>
                    <DataTableCell>
                      <span className="text-sm text-foreground">
                        {r.reason ?? <span className="text-muted-foreground">—</span>}
                      </span>
                    </DataTableCell>
                    <DataTableCell align="right">
                      <span className="font-semibold tabular-nums text-foreground">
                        {formatAmount(r.amount, clubCurrencyCode)}
                      </span>
                    </DataTableCell>
                    <DataTableCell>
                      {r.endDate === null ? (
                        <StatusBadge tone="success" label={cdTexts.revision_current_badge} />
                      ) : (
                        <StatusBadge tone="neutral" label={cdTexts.revision_closed_badge} />
                      )}
                    </DataTableCell>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}
        </CardBody>
      </Card>

      <Modal
        open={reviseOpen}
        onClose={() => {
          if (pending) return;
          setReviseOpen(false);
          setAmountInput("");
        }}
        title={cdTexts.new_revision_modal_title}
        description={cdTexts.new_revision_modal_description}
        size="md"
        closeDisabled={pending}
      >
        <form action={handleSubmit} className="grid gap-4">
          <input type="hidden" name="staff_contract_id" value={contract.id} />

          <FormField>
            <FormFieldLabel required>{cdTexts.form_amount_label}</FormFieldLabel>
            <FormInput
              type="text"
              name="amount"
              inputMode="decimal"
              required
              value={amountInput}
              onChange={(e) => setAmountInput(sanitizeLocalizedAmountInput(e.target.value))}
              onBlur={(e) => setAmountInput(formatLocalizedAmountInputOnBlur(e.target.value))}
              onFocus={(e) => setAmountInput(formatLocalizedAmountInputOnFocus(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "-") e.preventDefault();
              }}
              placeholder={cdTexts.form_amount_placeholder}
              className="tabular-nums"
            />
            <FormHelpText>
              {cdTexts.form_amount_helper.replace("{currency}", clubCurrencyCode)}
            </FormHelpText>
          </FormField>

          <FormField>
            <FormFieldLabel required>{cdTexts.form_effective_date_label}</FormFieldLabel>
            <FormInput
              type="date"
              name="effective_date"
              defaultValue={todayIso()}
              required
            />
            <FormHelpText>{cdTexts.form_effective_date_helper}</FormHelpText>
          </FormField>

          <FormField>
            <FormFieldLabel>{cdTexts.form_reason_label}</FormFieldLabel>
            <FormInput
              type="text"
              name="reason"
              placeholder={cdTexts.form_reason_placeholder}
              maxLength={500}
            />
          </FormField>

          <ModalFooter
            onCancel={() => {
              setReviseOpen(false);
              setAmountInput("");
            }}
            cancelLabel={cdTexts.cancel_cta}
            submitLabel={cdTexts.new_revision_submit_cta}
            pendingLabel={cdTexts.submit_pending}
            submitDisabled={amountInput.trim().length === 0}
          />
        </form>
      </Modal>

      <p className="text-xs text-muted-foreground">
        <Link href="/rrhh/contracts" className="hover:underline">
          {cdTexts.back_to_list}
        </Link>
      </p>
    </div>
  );
}
