import { redirect } from "next/navigation";

import {
  createStaffContractAction,
  finalizeStaffContractAction,
} from "@/app/(dashboard)/settings/rrhh/actions";
import { RrhhModuleNav } from "@/components/hr/rrhh-module-nav";
import { StaffContractsTab } from "@/components/hr/staff-contracts-tab";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canAccessHrMasters, canMutateHrMasters } from "@/lib/domain/authorization";
import { listSalaryStructuresForActiveClub } from "@/lib/services/salary-structure-service";
import { listStaffContractsForActiveClub } from "@/lib/services/staff-contract-service";
import { listStaffMembersForActiveClub } from "@/lib/services/staff-member-service";

export default async function RrhhContractsPage() {
  const context = await getAuthenticatedSessionContext();
  if (!context) redirect("/login");
  if (!context.activeClub || !context.activeMembership) redirect("/pending-approval");
  if (!canAccessHrMasters(context.activeMembership)) redirect("/dashboard");

  const clubCurrencyCode = context.activeClub.currencyCode;
  const canMutate = canMutateHrMasters(context.activeMembership);

  const [contractsData, membersData, structuresData] = await Promise.all([
    listStaffContractsForActiveClub(),
    listStaffMembersForActiveClub(),
    listSalaryStructuresForActiveClub(),
  ]);

  const contracts = contractsData.ok ? contractsData.contracts : [];
  const members = membersData.ok ? membersData.members : [];
  const structures = structuresData.ok ? structuresData.structures : [];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      <RrhhModuleNav activeTab="contracts" />
      <StaffContractsTab
        contracts={contracts}
        members={members}
        structures={structures}
        clubCurrencyCode={clubCurrencyCode}
        canMutate={canMutate}
        createAction={createStaffContractAction}
        finalizeAction={finalizeStaffContractAction}
      />
    </main>
  );
}
