import { redirect } from "next/navigation";

import {
  createStaffMemberAction,
  updateStaffMemberAction,
} from "@/app/(dashboard)/settings/rrhh/actions";
import { RrhhModuleNav } from "@/components/hr/rrhh-module-nav";
import { StaffMembersTab } from "@/components/hr/staff-members-tab";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canAccessHrMasters, canMutateHrMasters } from "@/lib/domain/authorization";
import { listStaffMembersForActiveClub } from "@/lib/services/staff-member-service";

export default async function RrhhStaffPage() {
  const context = await getAuthenticatedSessionContext();
  if (!context) redirect("/login");
  if (!context.activeClub || !context.activeMembership) redirect("/pending-approval");
  if (!canAccessHrMasters(context.activeMembership)) redirect("/dashboard");

  const canMutate = canMutateHrMasters(context.activeMembership);
  const membersData = await listStaffMembersForActiveClub();
  const members = membersData.ok ? membersData.members : [];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      <RrhhModuleNav activeTab="staff" />
      <StaffMembersTab
        members={members}
        canMutate={canMutate}
        createAction={createStaffMemberAction}
        updateAction={updateStaffMemberAction}
      />
    </main>
  );
}
