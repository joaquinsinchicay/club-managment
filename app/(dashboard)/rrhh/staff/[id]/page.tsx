import { notFound, redirect } from "next/navigation";

import { updateStaffMemberAction } from "@/app/(dashboard)/settings/rrhh/actions";
import { RrhhModuleNav } from "@/components/hr/rrhh-module-nav";
import { StaffProfileView } from "@/components/hr/staff-profile-view";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import {
  canAccessHrModule,
  canMutateHrMasters,
} from "@/lib/domain/authorization";
import { getStaffProfile } from "@/lib/services/hr-staff-profile-service";

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
  const result = await getStaffProfile(params.id);
  if (!result.ok) {
    if (result.code === "member_not_found") notFound();
    redirect("/rrhh/staff");
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      <RrhhModuleNav activeTab="staff" />
      <StaffProfileView
        profile={result.profile}
        clubCurrencyCode={clubCurrencyCode}
        canMutate={canMutate}
        updateAction={updateStaffMemberAction}
      />
    </main>
  );
}
