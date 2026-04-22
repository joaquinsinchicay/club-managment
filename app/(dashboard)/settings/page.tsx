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
import { listStaffMembersForActiveClub } from "@/lib/services/staff-member-service";
import { listStaffContractsForActiveClub } from "@/lib/services/staff-contract-service";
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
  createStaffContractAction,
  createStaffMemberAction,
  finalizeStaffContractAction,
  setStaffMemberStatusAction,
  updateSalaryStructureAction,
  updateSalaryStructureAmountAction,
  updateStaffContractAction,
  updateStaffMemberAction
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

  const [salaryStructuresData, staffMembersData, staffContractsData] = canHrRead
    ? await Promise.all([
        listSalaryStructuresWithVersionsForActiveClub(),
        listStaffMembersForActiveClub(),
        listStaffContractsForActiveClub(),
      ])
    : [null, null, null];

  const salaryStructures =
    salaryStructuresData && salaryStructuresData.ok ? salaryStructuresData.structures : [];
  const salaryStructureVersions =
    salaryStructuresData && salaryStructuresData.ok
      ? salaryStructuresData.versionsByStructureId
      : {};
  const staffMembers =
    staffMembersData && staffMembersData.ok ? staffMembersData.members : [];
  const staffContracts =
    staffContractsData && staffContractsData.ok ? staffContractsData.contracts : [];

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
      staffMembers={staffMembers}
      staffContracts={staffContracts}
      createSalaryStructureAction={createSalaryStructureAction}
      updateSalaryStructureAction={updateSalaryStructureAction}
      updateSalaryStructureAmountAction={updateSalaryStructureAmountAction}
      createStaffMemberAction={createStaffMemberAction}
      updateStaffMemberAction={updateStaffMemberAction}
      setStaffMemberStatusAction={setStaffMemberStatusAction}
      createStaffContractAction={createStaffContractAction}
      updateStaffContractAction={updateStaffContractAction}
      finalizeStaffContractAction={finalizeStaffContractAction}
    />
  );
}
