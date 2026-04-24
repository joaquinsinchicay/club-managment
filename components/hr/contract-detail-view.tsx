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
import { Avatar } from "@/components/ui/avatar";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DataTableChip } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { Modal } from "@/components/ui/modal";
import { ModalFooter } from "@/components/ui/modal-footer";
import {
  FormBanner,
  FormField,
  FormFieldLabel,
  FormHelpText,
  FormInput,
  FormReadonly,
  FormTextarea,
} from "@/components/ui/modal-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { triggerClientFeedback } from "@/lib/client-feedback";
import type { PayrollSettlement } from "@/lib/domain/payroll-settlement";
import {
  formatContractCode,
  type StaffContract,
} from "@/lib/domain/staff-contract";
import type { StaffContractRevision } from "@/lib/domain/staff-contract-revision";
import type { StaffContractAttachment } from "@/lib/services/staff-contract-attachment-service";
import { texts } from "@/lib/texts";

type ContractDetailViewProps = {
  contract: StaffContract;
  revisions: StaffContractRevision[];
  attachments: StaffContractAttachment[];
  settlements: PayrollSettlement[];
  clubCurrencyCode: string;
  canMutate: boolean;
  createRevisionAction: (formData: FormData) => Promise<RrhhActionResult>;
  finalizeAction: (formData: FormData) => Promise<RrhhActionResult>;
  uploadAttachmentAction: (formData: FormData) => Promise<RrhhActionResult>;
  deleteAttachmentAction: (formData: FormData) => Promise<RrhhActionResult>;
  signAttachmentUrl: (attachmentId: string) => Promise<string | null>;
};

const cdTexts = texts.rrhh.contract_detail;
const scTexts = texts.rrhh.staff_contracts;
const ssTexts = texts.rrhh.salary_structures;

function resolvePaymentTypeLabel(raw: string | null): string | null {
  if (!raw) return null;
  const opts = ssTexts.payment_type_options as Record<string, string>;
  return opts[raw] ?? raw;
}

function resolveRemunerationTypeLabel(raw: string | null): string | null {
  if (!raw) return null;
  const opts = ssTexts.remuneration_type_options as Record<string, string>;
  return opts[raw] ?? raw;
}

const SPANISH_MONTHS = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

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

function formatIsoDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value)}%`;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

type SettlementChipTone = "income" | "warning" | "info" | "neutral";
const SETTLEMENT_TONES: Record<
  PayrollSettlement["status"],
  { tone: SettlementChipTone; labelKey: keyof typeof cdTexts }
> = {
  generada: { tone: "warning", labelKey: "settlements_status_generada" },
  confirmada: { tone: "info", labelKey: "settlements_status_confirmada" },
  pagada: { tone: "income", labelKey: "settlements_status_pagada" },
  anulada: { tone: "neutral", labelKey: "settlements_status_anulada" },
};

export function ContractDetailView({
  contract,
  revisions,
  attachments,
  settlements,
  clubCurrencyCode,
  canMutate,
  createRevisionAction,
  finalizeAction,
  uploadAttachmentAction,
  deleteAttachmentAction,
  signAttachmentUrl,
}: ContractDetailViewProps) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [reviseOpen, setReviseOpen] = useState(false);
  const [revisePending, setRevisePending] = useState(false);
  const [amountInput, setAmountInput] = useState("");
  const [uploadPending, setUploadPending] = useState(false);
  const [finalizeOpen, setFinalizeOpen] = useState(false);
  const [finalizePending, setFinalizePending] = useState(false);

  const contractCode = formatContractCode(contract.id);
  const isVigente = contract.status === "vigente";
  const canNewRevision = canMutate && isVigente;
  const canFinalize = canMutate && isVigente;
  const paymentTypeLabel = resolvePaymentTypeLabel(contract.salaryStructurePaymentType);
  const remunerationTypeLabel = resolveRemunerationTypeLabel(
    contract.salaryStructureRemunerationType,
  );

  const sortedRevisions = [...revisions].sort((a, b) =>
    b.effectiveDate.localeCompare(a.effectiveDate),
  );
  const currentRevision = sortedRevisions.find((r) => r.endDate === null) ?? null;
  const currentDeltaPercent = (() => {
    if (!currentRevision) return null;
    const currentIndex = sortedRevisions.indexOf(currentRevision);
    const previous = sortedRevisions[currentIndex + 1];
    if (!previous || previous.amount === 0) return null;
    return ((currentRevision.amount - previous.amount) / previous.amount) * 100;
  })();

  async function handleReviseSubmit(formData: FormData) {
    setRevisePending(true);
    try {
      const result = await createRevisionAction(formData);
      triggerClientFeedback("settings", result.code);
      if (result.ok) {
        setReviseOpen(false);
        setAmountInput("");
        startTransition(() => router.refresh());
      }
    } finally {
      setRevisePending(false);
    }
  }

  async function handleFinalizeSubmit(formData: FormData) {
    setFinalizePending(true);
    try {
      const result = await finalizeAction(formData);
      triggerClientFeedback("settings", result.code);
      if (result.ok) {
        setFinalizeOpen(false);
        startTransition(() => router.refresh());
      }
    } finally {
      setFinalizePending(false);
    }
  }

  async function handleUpload(formData: FormData) {
    setUploadPending(true);
    try {
      const result = await uploadAttachmentAction(formData);
      triggerClientFeedback("settings", result.code);
      if (result.ok) startTransition(() => router.refresh());
    } finally {
      setUploadPending(false);
    }
  }

  async function handleDelete(attachmentId: string) {
    const formData = new FormData();
    formData.set("attachment_id", attachmentId);
    formData.set("staff_contract_id", contract.id);
    const result = await deleteAttachmentAction(formData);
    triggerClientFeedback("settings", result.code);
    if (result.ok) startTransition(() => router.refresh());
  }

  async function handleDownload(attachmentId: string) {
    const url = await signAttachmentUrl(attachmentId);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  // -------------------------------------------------------------------------
  // Derived copy
  // -------------------------------------------------------------------------

  const headerTitle = isVigente
    ? cdTexts.header_vigente_since_template
        .replace("{code}", contractCode)
        .replace("{date}", formatIsoDate(contract.startDate))
    : cdTexts.header_finalizado_since_template
        .replace("{code}", contractCode)
        .replace("{date}", formatIsoDate(contract.finalizedAt ?? contract.endDate));

  const historyLastChange =
    currentRevision && currentDeltaPercent !== null
      ? cdTexts.history_last_change_template
          .replace("{date}", formatIsoDate(currentRevision.effectiveDate))
          .replace("{deltaPercent}", formatPercent(currentDeltaPercent))
      : cdTexts.history_last_change_initial;

  const currentAmountEyebrow = cdTexts.current_amount_eyebrow_template.replace(
    "{paymentType}",
    paymentTypeLabel ? paymentTypeLabel.toUpperCase() : "—",
  );

  const currentAmountSubtitle = currentRevision
    ? currentDeltaPercent !== null
      ? cdTexts.current_amount_reviewed_with_delta_template
          .replace("{date}", formatIsoDate(currentRevision.effectiveDate))
          .replace("{deltaPercent}", formatPercent(currentDeltaPercent))
      : cdTexts.current_amount_reviewed_on_template.replace(
          "{date}",
          formatIsoDate(currentRevision.effectiveDate),
        )
    : cdTexts.current_amount_empty;

  const divisionsLabel =
    contract.salaryStructureDivisions.length > 0
      ? contract.salaryStructureDivisions.join(" · ")
      : cdTexts.info_value_fallback;

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        <Link href="/rrhh/contracts" className="hover:text-foreground">
          {cdTexts.breadcrumb_root}
        </Link>
        <span aria-hidden="true">·</span>
        <span className="text-foreground">{contractCode}</span>
      </nav>

      {/* Header card */}
      <Card padding="comfortable">
        <div className="flex flex-col gap-5">
          <div className="flex items-start gap-4">
            <Avatar
              name={contract.staffMemberName ?? scTexts.unknown_member}
              size="lg"
              tone="neutral"
            />
            <div className="flex flex-col gap-1">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {headerTitle}
              </p>
              <Link
                href={`/rrhh/staff/${contract.staffMemberId}`}
                className="text-h2 font-bold text-foreground hover:underline"
              >
                {contract.staffMemberName ?? scTexts.unknown_member}
              </Link>
              <div className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
                {contract.salaryStructureRole ? (
                  <span>{contract.salaryStructureRole}</span>
                ) : null}
                {contract.salaryStructureActivityName ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{contract.salaryStructureActivityName}</span>
                  </>
                ) : null}
                {divisionsLabel !== cdTexts.info_value_fallback ? (
                  <>
                    <span aria-hidden="true">·</span>
                    <span>{divisionsLabel}</span>
                  </>
                ) : null}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <StatusBadge
                  tone={isVigente ? "success" : "neutral"}
                  label={scTexts.status_options[contract.status]}
                />
                {paymentTypeLabel ? (
                  <DataTableChip tone="neutral">{paymentTypeLabel}</DataTableChip>
                ) : null}
                {remunerationTypeLabel ? (
                  <DataTableChip tone="neutral">{remunerationTypeLabel}</DataTableChip>
                ) : null}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canNewRevision ? (
              <button
                type="button"
                onClick={() => setReviseOpen(true)}
                className={buttonClass({ variant: "primary", size: "md" })}
              >
                {cdTexts.new_revision_cta_plus}
              </button>
            ) : null}
            <LinkButton
              href={`/rrhh/staff/${contract.staffMemberId}`}
              variant="secondary"
              size="md"
            >
              {cdTexts.view_staff_profile_cta}
            </LinkButton>
            {canFinalize ? (
              <button
                type="button"
                onClick={() => setFinalizeOpen(true)}
                className={buttonClass({ variant: "destructive", size: "md" })}
              >
                {cdTexts.finalize_contract_cta}
              </button>
            ) : null}
          </div>
        </div>
      </Card>

      {/* Two-column layout */}
      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="flex flex-col gap-6">
          {/* Información del contrato */}
          <Card padding="none">
            <CardHeader
              title={cdTexts.info_title}
              description={cdTexts.info_description}
              divider
            />
            <CardBody>
              <dl className="grid gap-4 px-5 py-4 text-sm sm:grid-cols-3">
                <InfoItem label={cdTexts.info_number_label} value={contractCode} />
                <InfoItem
                  label={cdTexts.info_payment_type_label}
                  value={paymentTypeLabel}
                />
                <InfoItem
                  label={cdTexts.info_structure_label}
                  value={contract.salaryStructureName}
                />
                <InfoItem
                  label={cdTexts.info_division_label}
                  value={
                    contract.salaryStructureDivisions.length > 0
                      ? contract.salaryStructureDivisions.join(" · ")
                      : null
                  }
                />
                <InfoItem
                  label={cdTexts.info_role_label}
                  value={contract.salaryStructureRole}
                />
                <InfoItem
                  label={cdTexts.info_start_label}
                  value={formatIsoDate(contract.startDate)}
                />
                <InfoItem
                  label={cdTexts.info_end_label}
                  value={
                    contract.endDate
                      ? formatIsoDate(contract.endDate)
                      : cdTexts.info_end_indefinite
                  }
                />
              </dl>
            </CardBody>
          </Card>

          {/* Historial de revisiones */}
          <Card padding="none">
            <CardHeader
              title={cdTexts.history_title}
              description={historyLastChange}
              action={
                canNewRevision ? (
                  <button
                    type="button"
                    onClick={() => setReviseOpen(true)}
                    className={buttonClass({ variant: "primary", size: "sm" })}
                  >
                    {cdTexts.history_new_cta}
                  </button>
                ) : undefined
              }
              divider
            />
            <CardBody>
              {sortedRevisions.length === 0 ? (
                <EmptyState
                  title={cdTexts.history_empty_title}
                  description={cdTexts.history_empty_description}
                  variant="dashed"
                />
              ) : (
                <ul className="grid gap-2 px-4 py-4">
                  {sortedRevisions.map((revision, index) => {
                    const prior = sortedRevisions[index + 1];
                    const delta =
                      prior && prior.amount !== 0
                        ? ((revision.amount - prior.amount) / prior.amount) * 100
                        : null;
                    const isCurrent = revision.endDate === null;
                    const rangeLabel = isCurrent
                      ? cdTexts.history_range_open_template.replace(
                          "{from}",
                          formatIsoDate(revision.effectiveDate),
                        )
                      : cdTexts.history_range_template
                          .replace("{from}", formatIsoDate(revision.effectiveDate))
                          .replace("{to}", formatIsoDate(revision.endDate));
                    return (
                      <li
                        key={revision.id}
                        className={`flex flex-wrap items-center justify-between gap-3 rounded-card border px-4 py-3 ${
                          isCurrent
                            ? "border-success/30 bg-success/5"
                            : "border-border bg-card"
                        }`}
                      >
                        <div className="flex flex-col gap-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="text-sm font-semibold text-foreground">
                              {rangeLabel}
                            </span>
                            {isCurrent ? (
                              <StatusBadge
                                tone="success"
                                label={cdTexts.history_current_badge}
                              />
                            ) : null}
                            {!prior ? (
                              <DataTableChip tone="neutral">
                                {cdTexts.history_initial_tag}
                              </DataTableChip>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            {delta !== null ? (
                              <span>
                                {cdTexts.history_percent_vs_previous_template.replace(
                                  "{deltaPercent}",
                                  formatPercent(delta),
                                )}
                              </span>
                            ) : null}
                            {revision.reason ? <span>· {revision.reason}</span> : null}
                          </div>
                        </div>
                        <span className="font-semibold tabular-nums text-foreground">
                          {formatAmount(revision.amount, clubCurrencyCode)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>

          {/* Documentos */}
          <Card padding="none">
            <CardHeader
              title={cdTexts.documents_title}
              description={cdTexts.documents_description}
              divider
            />
            <CardBody>
              {canMutate ? (
                <form action={handleUpload} className="mb-4 grid gap-2 px-4 pt-4 sm:grid-cols-[1fr_auto]">
                  <input type="hidden" name="staff_contract_id" value={contract.id} />
                  <input
                    type="file"
                    name="file"
                    required
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.heic"
                    className="min-h-11 w-full rounded-btn border border-border bg-background px-3 py-2 text-sm file:mr-3 file:rounded-btn file:border file:border-border file:bg-secondary file:px-3 file:py-1 file:text-xs file:font-semibold file:text-foreground"
                  />
                  <button
                    type="submit"
                    disabled={uploadPending}
                    className={buttonClass({ variant: "primary", size: "md" })}
                  >
                    {uploadPending ? cdTexts.upload_pending : cdTexts.upload_cta}
                  </button>
                </form>
              ) : null}

              {attachments.length === 0 ? (
                <EmptyState
                  title={cdTexts.documents_empty_title}
                  description={cdTexts.documents_empty_description}
                  variant="dashed"
                />
              ) : (
                <ul className="grid gap-2 px-4 pb-4">
                  {attachments.map((a) => (
                    <li
                      key={a.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border bg-card px-4 py-3"
                    >
                      <div className="grid leading-tight">
                        <span className="text-sm font-medium text-foreground">
                          {a.fileName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {formatBytes(a.sizeBytes)} · {formatIsoDate(a.uploadedAt.slice(0, 10))}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleDownload(a.id)}
                          className={buttonClass({ variant: "secondary", size: "sm" })}
                        >
                          {cdTexts.download_cta}
                        </button>
                        {canMutate ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(a.id)}
                            className={buttonClass({ variant: "destructive", size: "sm" })}
                          >
                            {cdTexts.delete_cta}
                          </button>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </section>

        <aside className="flex flex-col gap-6">
          {/* Monto vigente */}
          <Card padding="comfortable" tone="muted">
            <div className="flex flex-col gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {currentAmountEyebrow}
              </p>
              <p className="text-h1 font-bold tabular-nums text-foreground">
                {formatAmount(contract.currentAmount, clubCurrencyCode)}
              </p>
              <p className="text-sm text-muted-foreground">{currentAmountSubtitle}</p>
              {canNewRevision ? (
                <button
                  type="button"
                  onClick={() => setReviseOpen(true)}
                  className={buttonClass({ variant: "primary", size: "md" })}
                >
                  {cdTexts.new_revision_cta}
                </button>
              ) : null}
            </div>
          </Card>

          {/* Últimas liquidaciones */}
          <Card padding="none">
            <CardHeader
              title={cdTexts.settlements_title}
              description={cdTexts.settlements_description}
              action={
                <Link
                  href="/rrhh/settlements"
                  className="text-xs font-semibold text-foreground hover:underline"
                >
                  {cdTexts.settlements_see_all_cta}
                </Link>
              }
              divider
            />
            <CardBody>
              {settlements.length === 0 ? (
                <EmptyState
                  title={cdTexts.settlements_empty_title}
                  description={cdTexts.settlements_empty_description}
                  variant="dashed"
                />
              ) : (
                <ul className="grid gap-2 px-4 py-4">
                  {settlements.map((s) => {
                    const statusInfo = SETTLEMENT_TONES[s.status];
                    const periodLabel = cdTexts.settlements_period_template
                      .replace("{month}", SPANISH_MONTHS[s.periodMonth - 1] ?? String(s.periodMonth))
                      .replace("{year}", String(s.periodYear));
                    return (
                      <li
                        key={s.id}
                        className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border bg-card px-4 py-3"
                      >
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-semibold text-foreground">
                            {periodLabel}
                          </span>
                          <DataTableChip tone={statusInfo.tone}>
                            {cdTexts[statusInfo.labelKey] as string}
                          </DataTableChip>
                        </div>
                        <span className="font-semibold tabular-nums text-foreground">
                          {formatAmount(s.totalAmount, clubCurrencyCode)}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </CardBody>
          </Card>
        </aside>
      </div>

      {/* New revision modal */}
      <Modal
        open={reviseOpen}
        onClose={() => {
          if (revisePending) return;
          setReviseOpen(false);
          setAmountInput("");
        }}
        title={cdTexts.new_revision_modal_title}
        description={cdTexts.new_revision_modal_description}
        size="md"
        closeDisabled={revisePending}
      >
        <form action={handleReviseSubmit} className="grid gap-4">
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

      {/* Finalize modal */}
      <Modal
        open={finalizeOpen}
        onClose={() => {
          if (finalizePending) return;
          setFinalizeOpen(false);
        }}
        title={cdTexts.finalize_modal_title}
        description={cdTexts.finalize_modal_description}
        size="sm"
        closeDisabled={finalizePending}
      >
        <form action={handleFinalizeSubmit} className="grid gap-4">
          <input type="hidden" name="staff_contract_id" value={contract.id} />
          <FormBanner variant="destructive">{cdTexts.finalize_warning}</FormBanner>
          <FormField>
            <FormFieldLabel>{scTexts.form_member_label}</FormFieldLabel>
            <FormReadonly>{contract.staffMemberName ?? "—"}</FormReadonly>
          </FormField>
          <FormField>
            <FormFieldLabel required>{cdTexts.finalize_end_date_label}</FormFieldLabel>
            <FormInput type="date" name="end_date" defaultValue={todayIso()} required />
            <FormHelpText>{cdTexts.finalize_end_date_helper}</FormHelpText>
          </FormField>
          <FormField>
            <FormFieldLabel>{cdTexts.finalize_reason_label}</FormFieldLabel>
            <FormTextarea
              name="reason"
              rows={3}
              maxLength={500}
              placeholder={cdTexts.finalize_reason_placeholder}
            />
          </FormField>
          <ModalFooter
            onCancel={() => setFinalizeOpen(false)}
            cancelLabel={cdTexts.cancel_cta}
            submitLabel={cdTexts.finalize_modal_submit_cta}
            pendingLabel={cdTexts.submit_pending}
            submitVariant="destructive"
          />
        </form>
      </Modal>
    </div>
  );
}

// ---------------------------------------------------------------------------
// InfoItem — celda label+value para el dl grid de "Información del contrato"
// ---------------------------------------------------------------------------

type InfoItemProps = {
  label: string;
  value: string | null | undefined;
};

function InfoItem({ label, value }: InfoItemProps) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm text-foreground">
        {value && value.length > 0 ? value : cdTexts.info_value_fallback}
      </dd>
    </div>
  );
}
