import { ClubSettingsCard } from "@/components/settings/club-settings-card";
import { ClubSettingsForbiddenCard } from "@/components/settings/club-settings-forbidden-card";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import {
  canAccessHrMasters,
  canMutateHrMasters,
  getClubSettingsPermissions
} from "@/lib/domain/authorization";
import { getClubMembersForActiveClub } from "@/lib/services/club-members-service";
import { getTreasurySettingsForActiveClub } from "@/lib/services/treasury-settings-service";
import { listSalaryStructuresWithVersionsForActiveClub } from "@/lib/services/salary-structure-service";
import {
  approveClubMembershipAction,
  createClubActivityAction,
  createTreasuryCategoryAction,
  inviteClubUserAction,
  removeClubMembershipAction,
  updateClubActivityAction,
  updateClubIdentityAction,
  updateClubMembershipRoleAction,
  updateReceiptFormatAction,
  updateTreasuryCategoryAction
} from "@/app/(dashboard)/settings/actions";
import {
  createSalaryStructureAction,
  updateSalaryStructureAction,
  updateSalaryStructureAmountAction
} from "@/app/(dashboard)/settings/rrhh/actions";
import { redirect } from "next/navigation";

export default async function ClubSettingsPage() {
  const context = await getAuthenticatedSessionContext();

  if (!context) {
    redirect("/login");
  }

  if (!context.activeClub || !context.activeMembership) {
    redirect("/pending-approval");
  }

  const permissions = getClubSettingsPermissions(context.activeMembership);

  if (!permissions.canAccessPage) {
    return <ClubSettingsForbiddenCard />;
  }

  const [clubMembersData, treasurySettings] = await Promise.all([
    getClubMembersForActiveClub(),
    getTreasurySettingsForActiveClub()
  ]);

  if (!clubMembersData || !treasurySettings) {
    return <ClubSettingsForbiddenCard />;
  }

  const canHrRead = canAccessHrMasters(context.activeMembership);
  const canHrMutate = canMutateHrMasters(context.activeMembership);

  const salaryStructuresData = canHrRead
    ? await listSalaryStructuresWithVersionsForActiveClub()
    : null;

  const salaryStructures =
    salaryStructuresData && salaryStructuresData.ok ? salaryStructuresData.structures : [];
  const salaryStructureVersions =
    salaryStructuresData && salaryStructuresData.ok
      ? salaryStructuresData.versionsByStructureId
      : {};

  return (
    <ClubSettingsCard
      context={context}
      members={clubMembersData.members}
      pendingInvitations={clubMembersData.pendingInvitations}
      treasurySettings={treasurySettings}
      inviteUserAction={inviteClubUserAction}
      approveMembershipAction={approveClubMembershipAction}
      updateMembershipRolesAction={updateClubMembershipRoleAction}
      removeMembershipAction={removeClubMembershipAction}
      createTreasuryCategoryAction={createTreasuryCategoryAction}
      updateTreasuryCategoryAction={updateTreasuryCategoryAction}
      createClubActivityAction={createClubActivityAction}
      updateClubActivityAction={updateClubActivityAction}
      updateReceiptFormatAction={updateReceiptFormatAction}
      updateClubIdentityAction={updateClubIdentityAction}
      canAccessHr={canHrRead}
      canMutateHr={canHrMutate}
      salaryStructures={salaryStructures}
      salaryStructureVersionsByStructureId={salaryStructureVersions}
      createSalaryStructureAction={createSalaryStructureAction}
      updateSalaryStructureAction={updateSalaryStructureAction}
      updateSalaryStructureAmountAction={updateSalaryStructureAmountAction}
    />
  );
}
