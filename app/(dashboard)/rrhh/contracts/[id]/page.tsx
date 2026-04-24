import { notFound, redirect } from "next/navigation";

import {
  createSalaryRevisionAction,
  deleteContractAttachmentAction,
  uploadContractAttachmentAction,
} from "@/app/(dashboard)/settings/rrhh/actions";
import { ContractDetailView } from "@/components/hr/contract-detail-view";
import { RrhhModuleNav } from "@/components/hr/rrhh-module-nav";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canAccessHrMasters, canMutateHrMasters } from "@/lib/domain/authorization";
import { staffContractRevisionRepository } from "@/lib/repositories/staff-contract-revision-repository";
import {
  getSignedUrlForAttachment,
  listContractAttachments,
} from "@/lib/services/staff-contract-attachment-service";
import { getStaffContractById } from "@/lib/services/staff-contract-service";

type PageProps = {
  params: { id: string };
};

export default async function RrhhContractDetailPage({ params }: PageProps) {
  const context = await getAuthenticatedSessionContext();
  if (!context) redirect("/login");
  if (!context.activeClub || !context.activeMembership) redirect("/pending-approval");
  if (!canAccessHrMasters(context.activeMembership)) redirect("/dashboard");

  const clubCurrencyCode = context.activeClub.currencyCode;
  const canMutate = canMutateHrMasters(context.activeMembership);

  const contractData = await getStaffContractById(params.id);
  if (!contractData.ok) {
    if (contractData.code === "contract_not_found") notFound();
    redirect("/rrhh/contracts");
  }

  const [revisions, attachmentsResult] = await Promise.all([
    staffContractRevisionRepository.listForContract(context.activeClub.id, params.id),
    listContractAttachments(params.id),
  ]);

  const attachments = attachmentsResult.ok ? attachmentsResult.data!.attachments : [];

  async function signAttachmentUrl(attachmentId: string): Promise<string | null> {
    "use server";
    const result = await getSignedUrlForAttachment(attachmentId);
    return result.ok ? result.data!.url : null;
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      <RrhhModuleNav activeTab="contracts" />
      <ContractDetailView
        contract={contractData.contract}
        revisions={revisions}
        attachments={attachments}
        clubCurrencyCode={clubCurrencyCode}
        canMutate={canMutate}
        createRevisionAction={createSalaryRevisionAction}
        uploadAttachmentAction={uploadContractAttachmentAction}
        deleteAttachmentAction={deleteContractAttachmentAction}
        signAttachmentUrl={signAttachmentUrl}
      />
    </main>
  );
}
