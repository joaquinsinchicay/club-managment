import { notFound, redirect } from "next/navigation";

import {
  createStaffContractAction,
  deactivateStaffMemberAction,
  updateStaffMemberAction,
} from "@/app/(dashboard)/settings/rrhh/actions";
import { RrhhModuleNav } from "@/components/hr/rrhh-module-nav";
import { StaffProfileView } from "@/components/hr/staff-profile-view";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import {
  canAccessHrModule,
  canMutateHrMasters,
} from "@/lib/domain/authorization";
import { getStaffProfile } from "@/lib/services/hr-staff-profile-service";
import { listSalaryStructuresForActiveClub } from "@/lib/services/salary-structure-service";

export default async function StaffProfilePage({
  params,
}: {
  params: { id: string };
}) {
  const context = await getAuthenticatedSessionContext();
  if (!context) redirect("/login");
  if (!context.activeClub || !context.activeMembership) redirect("/pending-approval");
  if (!canAccessHrModule(context.activeMembership)) redirect("/dashboard");

  const clubCurrencyCode = context.activeClub.currencyCode;
  const canMutate = canMutateHrMasters(context.activeMembership);

  const [profileResult, structuresResult] = await Promise.all([
    getStaffProfile(params.id),
    listSalaryStructuresForActiveClub(),
  ]);

  if (!profileResult.ok) {
    if (profileResult.code === "member_not_found") notFound();
    redirect("/rrhh/staff");
  }

  const structures = structuresResult.ok ? structuresResult.structures : [];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      <RrhhModuleNav activeTab="staff" />
      <StaffProfileView
        profile={profileResult.profile}
        structures={structures}
        clubCurrencyCode={clubCurrencyCode}
        canMutate={canMutate}
        updateAction={updateStaffMemberAction}
        createContractAction={createStaffContractAction}
        deactivateAction={deactivateStaffMemberAction}
      />
    </main>
  );
}
