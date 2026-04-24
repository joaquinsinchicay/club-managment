import { redirect } from "next/navigation";

import { createBulkSalaryRevisionAction } from "@/app/(dashboard)/settings/rrhh/actions";
import { BulkRevisionForm } from "@/components/hr/bulk-revision-form";
import { RrhhModuleNav } from "@/components/hr/rrhh-module-nav";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canMutateHrMasters } from "@/lib/domain/authorization";
import { listStaffContractsForActiveClub } from "@/lib/services/staff-contract-service";

export default async function RrhhBulkRevisionPage() {
  const context = await getAuthenticatedSessionContext();
  if (!context) redirect("/login");
  if (!context.activeClub || !context.activeMembership) redirect("/pending-approval");
  if (!canMutateHrMasters(context.activeMembership)) redirect("/dashboard");

  const clubCurrencyCode = context.activeClub.currencyCode;
  const contractsData = await listStaffContractsForActiveClub({ status: "vigente" });
  const contracts = contractsData.ok ? contractsData.contracts : [];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      <RrhhModuleNav activeTab="contracts" />
      <BulkRevisionForm
        contracts={contracts}
        clubCurrencyCode={clubCurrencyCode}
        bulkAction={createBulkSalaryRevisionAction}
      />
    </main>
  );
}
