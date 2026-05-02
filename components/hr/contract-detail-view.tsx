"use client";

import Link from "next/link";

import type { RrhhActionResult } from "@/app/(dashboard)/settings/rrhh/actions";
import { CurrentAmountCard } from "@/components/hr/contract-detail/current-amount-card";
import { DocumentsCard } from "@/components/hr/contract-detail/documents-card";
import { FinalizeModal } from "@/components/hr/contract-detail/finalize-modal";
import { ContractHeaderCard } from "@/components/hr/contract-detail/header-card";
import { ContractInfoCard } from "@/components/hr/contract-detail/info-card";
import { RecentSettlementsCard } from "@/components/hr/contract-detail/recent-settlements-card";
import { ReviseModal } from "@/components/hr/contract-detail/revise-modal";
import { RevisionsHistoryCard } from "@/components/hr/contract-detail/revisions-history-card";
import {
  formatIsoDate,
  formatPercent,
  resolvePaymentTypeLabel,
} from "@/lib/contract-detail-helpers";
import {
  formatContractCode,
  type StaffContract,
} from "@/lib/domain/staff-contract";
import type { StaffContractRevision } from "@/lib/domain/staff-contract-revision";
import type { PayrollSettlement } from "@/lib/domain/payroll-settlement";
import type { StaffContractAttachment } from "@/lib/services/staff-contract-attachment-service";
import { useContractDetail } from "@/lib/hooks/use-contract-detail";
import { rrhh as txtRrhh } from "@/lib/texts";

const cdTexts = txtRrhh.contract_detail;

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
  const controller = useContractDetail({
    contractId: contract.id,
    createRevisionAction,
    finalizeAction,
    uploadAttachmentAction,
    deleteAttachmentAction,
    signAttachmentUrl,
  });

  const contractCode = formatContractCode(contract.id);
  const isVigente = contract.status === "vigente";
  const canNewRevision = canMutate && isVigente;
  const paymentTypeLabel = resolvePaymentTypeLabel(contract.salaryStructurePaymentType);

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

  const onRevise = () => controller.setReviseOpen(true);

  return (
    <div className="flex flex-col gap-6">
      <nav className="flex items-center gap-2 text-xs font-semibold uppercase tracking-card-eyebrow text-muted-foreground">
        <Link href="/rrhh/contracts" className="hover:text-foreground">
          {cdTexts.breadcrumb_root}
        </Link>
        <span aria-hidden="true">·</span>
        <span className="text-foreground">{contractCode}</span>
      </nav>

      <ContractHeaderCard
        contract={contract}
        canMutate={canMutate}
        onRevise={onRevise}
        onFinalize={() => controller.setFinalizeOpen(true)}
      />

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="flex flex-col gap-6">
          <ContractInfoCard contract={contract} />
          <RevisionsHistoryCard
            revisions={sortedRevisions}
            clubCurrencyCode={clubCurrencyCode}
            description={historyLastChange}
            canNewRevision={canNewRevision}
            onRevise={onRevise}
          />
          <DocumentsCard
            contractId={contract.id}
            attachments={attachments}
            canMutate={canMutate}
            uploadPending={controller.uploadPending}
            onUpload={controller.handleUpload}
            onDelete={controller.handleDelete}
            onDownload={controller.handleDownload}
          />
        </section>

        <aside className="flex flex-col gap-6">
          <CurrentAmountCard
            contract={contract}
            clubCurrencyCode={clubCurrencyCode}
            eyebrow={currentAmountEyebrow}
            subtitle={currentAmountSubtitle}
            canNewRevision={canNewRevision}
            onRevise={onRevise}
            newRevisionLabel={cdTexts.new_revision_cta}
          />
          <RecentSettlementsCard
            settlements={settlements}
            clubCurrencyCode={clubCurrencyCode}
          />
        </aside>
      </div>

      <ReviseModal
        contract={contract}
        clubCurrencyCode={clubCurrencyCode}
        controller={controller}
      />
      <FinalizeModal
        contract={contract}
        open={controller.finalizeOpen}
        pending={controller.finalizePending}
        onClose={() => controller.setFinalizeOpen(false)}
        onSubmit={controller.handleFinalizeSubmit}
      />
    </div>
  );
}
