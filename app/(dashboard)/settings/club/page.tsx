import { AppHeader } from "@/components/navigation/app-header";
import { ClubSettingsCard } from "@/components/settings/club-settings-card";
import { ClubSettingsForbiddenCard } from "@/components/settings/club-settings-forbidden-card";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { getClubMembersForActiveClub } from "@/lib/services/club-members-service";
import {
  approveClubMembershipAction,
  inviteClubUserAction,
  removeClubMembershipAction,
  updateClubMembershipRoleAction
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

  if (context.activeMembership.role !== "admin") {
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
        feedbackCode={searchParams?.feedback}
        inviteUserAction={inviteClubUserAction}
        approveMembershipAction={approveClubMembershipAction}
        updateMembershipRoleAction={updateClubMembershipRoleAction}
        removeMembershipAction={removeClubMembershipAction}
      />
    </div>
  );
}
