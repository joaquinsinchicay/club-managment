import { AppHeader } from "@/components/navigation/app-header";
import { ClubSettingsCard } from "@/components/settings/club-settings-card";
import { ClubSettingsForbiddenCard } from "@/components/settings/club-settings-forbidden-card";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { hasMembershipRole } from "@/lib/domain/membership-roles";
import { getClubMembersForActiveClub } from "@/lib/services/club-members-service";
import {
  approveClubMembershipAction,
  inviteClubUserAction,
  removeClubMembershipAction,
  updateClubMembershipRoleAction
} from "@/app/(dashboard)/settings/club/actions";
import { redirect } from "next/navigation";

export default async function ClubSettingsPage() {
  const context = await getAuthenticatedSessionContext();

  if (!context) {
    redirect("/login");
  }

  if (!context.activeClub || !context.activeMembership) {
    redirect("/pending-approval");
  }

  if (!hasMembershipRole(context.activeMembership, "admin")) {
    return (
      <div className="min-h-screen">
        <AppHeader context={context} />
        <ClubSettingsForbiddenCard />
      </div>
    );
  }

  const clubMembersData = await getClubMembersForActiveClub();

  if (!clubMembersData) {
    return (
      <div className="min-h-screen">
        <AppHeader context={context} />
        <ClubSettingsForbiddenCard />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <AppHeader context={context} />
      <ClubSettingsCard
        context={context}
        members={clubMembersData.members}
        pendingInvitations={clubMembersData.pendingInvitations}
        inviteUserAction={inviteClubUserAction}
        approveMembershipAction={approveClubMembershipAction}
        updateMembershipRolesAction={updateClubMembershipRoleAction}
        removeMembershipAction={removeClubMembershipAction}
      />
    </div>
  );
}
