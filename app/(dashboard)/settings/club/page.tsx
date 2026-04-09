import { ClubSettingsCard } from "@/components/settings/club-settings-card";
import { ClubSettingsForbiddenCard } from "@/components/settings/club-settings-forbidden-card";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import {
  getClubSettingsPermissions
} from "@/lib/domain/authorization";
import { getClubMembersForActiveClub } from "@/lib/services/club-members-service";
import { getTreasurySettingsForActiveClub } from "@/lib/services/treasury-settings-service";
import {
  approveClubMembershipAction,
  createClubActivityAction,
  createTreasuryAccountAction,
  createTreasuryCategoryAction,
  inviteClubUserAction,
  removeClubMembershipAction,
  updateClubActivityAction,
  updateClubMembershipRoleAction,
  updateTreasuryAccountAction,
  updateTreasuryCategoryAction
} from "@/app/(dashboard)/settings/club/actions";
import { redirect } from "next/navigation";

type ClubSettingsPageProps = {
  searchParams?: {
    feedback?: string;
  };
};

export default async function ClubSettingsPage({ searchParams }: ClubSettingsPageProps) {
  const context = await getAuthenticatedSessionContext();

  if (!context) {
    redirect("/login");
  }

  if (!context.activeClub || !context.activeMembership) {
    redirect("/pending-approval");
  }

  const permissions = getClubSettingsPermissions(context.activeMembership);
  const canViewMembers = permissions.canManageMembers;
  const canViewTreasury = permissions.canAccessTreasury;

  if (!permissions.canAccessPage) {
    return <ClubSettingsForbiddenCard />;
  }

  const [clubMembersData, treasurySettings] = await Promise.all([
    canViewMembers ? getClubMembersForActiveClub() : Promise.resolve(null),
    canViewTreasury ? getTreasurySettingsForActiveClub() : Promise.resolve(null)
  ]);

  if ((canViewMembers && !clubMembersData) || (canViewTreasury && !treasurySettings)) {
    return <ClubSettingsForbiddenCard />;
  }

  return (
    <ClubSettingsCard
      context={context}
      canManageMembers={canViewMembers}
      canManageTreasury={canViewTreasury}
      members={clubMembersData?.members ?? []}
      pendingInvitations={clubMembersData?.pendingInvitations ?? []}
      treasurySettings={treasurySettings}
      inviteUserAction={inviteClubUserAction}
      approveMembershipAction={approveClubMembershipAction}
      updateMembershipRolesAction={updateClubMembershipRoleAction}
      removeMembershipAction={removeClubMembershipAction}
      createTreasuryAccountAction={createTreasuryAccountAction}
      updateTreasuryAccountAction={updateTreasuryAccountAction}
      createTreasuryCategoryAction={createTreasuryCategoryAction}
      updateTreasuryCategoryAction={updateTreasuryCategoryAction}
      createClubActivityAction={createClubActivityAction}
      updateClubActivityAction={updateClubActivityAction}
    />
  );
}
