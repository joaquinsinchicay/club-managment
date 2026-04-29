import { ClubSettingsCard } from "@/components/settings/club-settings-card";
import { ClubSettingsForbiddenCard } from "@/components/settings/club-settings-forbidden-card";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { getClubSettingsPermissions } from "@/lib/domain/authorization";
import { getClubMembersForActiveClub } from "@/lib/services/club-members-service";
import { getTreasurySettingsForActiveClub } from "@/lib/services/treasury-settings-service";
import {
  createClubActivityAction,
  createClubUserAction,
  createTreasuryCategoryAction,
  removeClubMembershipAction,
  updateClubActivityAction,
  updateClubIdentityAction,
  updateClubMembershipRoleAction,
  updateReceiptFormatAction,
  updateTreasuryCategoryAction
} from "@/app/(dashboard)/settings/actions";
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

  return (
    <ClubSettingsCard
      context={context}
      members={clubMembersData.members}
      pendingInvitations={clubMembersData.pendingInvitations}
      treasurySettings={treasurySettings}
      createUserAction={createClubUserAction}
      updateMembershipRolesAction={updateClubMembershipRoleAction}
      removeMembershipAction={removeClubMembershipAction}
      createTreasuryCategoryAction={createTreasuryCategoryAction}
      updateTreasuryCategoryAction={updateTreasuryCategoryAction}
      createClubActivityAction={createClubActivityAction}
      updateClubActivityAction={updateClubActivityAction}
      updateReceiptFormatAction={updateReceiptFormatAction}
      updateClubIdentityAction={updateClubIdentityAction}
    />
  );
}
