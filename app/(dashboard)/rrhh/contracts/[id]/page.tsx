import { notFound, redirect } from "next/navigation";

import { createSalaryRevisionAction } from "@/app/(dashboard)/settings/rrhh/actions";
import { ContractDetailView } from "@/components/hr/contract-detail-view";
import { RrhhModuleNav } from "@/components/hr/rrhh-module-nav";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canAccessHrMasters, canMutateHrMasters } from "@/lib/domain/authorization";
import { staffContractRevisionRepository } from "@/lib/repositories/staff-contract-revision-repository";
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

  const revisions = await staffContractRevisionRepository.listForContract(
    context.activeClub.id,
    params.id,
  );

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      <RrhhModuleNav activeTab="contracts" />
      <ContractDetailView
        contract={contractData.contract}
        revisions={revisions}
        clubCurrencyCode={clubCurrencyCode}
        canMutate={canMutate}
        createRevisionAction={createSalaryRevisionAction}
      />
    </main>
  );
}
