import { redirect } from "next/navigation";

import {
  createSalaryStructureAction,
  updateSalaryStructureAction,
  updateSalaryStructureAmountAction,
} from "@/app/(dashboard)/settings/rrhh/actions";
import { RrhhModuleNav } from "@/components/hr/rrhh-module-nav";
import { SalaryStructuresTab } from "@/components/hr/salary-structures-tab";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canAccessHrMasters, canMutateHrMasters } from "@/lib/domain/authorization";
import { accessRepository } from "@/lib/repositories/access-repository";
import { listSalaryStructuresWithVersionsForActiveClub } from "@/lib/services/salary-structure-service";

export default async function RrhhStructuresPage() {
  const context = await getAuthenticatedSessionContext();
  if (!context) redirect("/login");
  if (!context.activeClub || !context.activeMembership) redirect("/pending-approval");
  if (!canAccessHrMasters(context.activeMembership)) redirect("/dashboard");

  const clubId = context.activeClub.id;
  const clubCurrencyCode = context.activeClub.currencyCode;
  const canMutate = canMutateHrMasters(context.activeMembership);

  const [structuresData, activities] = await Promise.all([
    listSalaryStructuresWithVersionsForActiveClub(),
    accessRepository.listClubActivitiesForClub(clubId),
  ]);

  const structures = structuresData.ok ? structuresData.structures : [];
  const versionsByStructureId = structuresData.ok ? structuresData.versionsByStructureId : {};

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      <RrhhModuleNav activeTab="structures" />
      <SalaryStructuresTab
        structures={structures}
        versionsByStructureId={versionsByStructureId}
        activities={activities}
        clubCurrencyCode={clubCurrencyCode}
        canMutate={canMutate}
        createAction={createSalaryStructureAction}
        updateAction={updateSalaryStructureAction}
        updateAmountAction={updateSalaryStructureAmountAction}
      />
    </main>
  );
}
