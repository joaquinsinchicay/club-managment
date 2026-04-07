import { AppHeader } from "@/components/navigation/app-header";
import { ClubSettingsCard } from "@/components/settings/club-settings-card";
import { ClubSettingsForbiddenCard } from "@/components/settings/club-settings-forbidden-card";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { hasMembershipRole } from "@/lib/domain/membership-roles";
import { getClubMembersForActiveClub } from "@/lib/services/club-members-service";
import { getTreasurySettingsForActiveClub } from "@/lib/services/treasury-settings-service";
import {
  approveClubMembershipAction,
  createClubActivityAction,
  createReceiptFormatAction,
  setMovementTypesAction,
  setTreasuryCurrenciesAction,
  createTreasuryAccountAction,
  createTreasuryCategoryAction,
  inviteClubUserAction,
  removeClubMembershipAction,
  updateClubActivityAction,
  updateClubMembershipRoleAction,
  updateReceiptFormatAction,
  updateTreasuryAccountAction,
  updateTreasuryCategoryAction
} from "@/app/(dashboard)/settings/club/actions";
import { redirect } from "next/navigation";

type ClubSettingsPageProps = {
  searchParams?: {
    feedback?: string;
    tab?: string;
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

  if (!hasMembershipRole(context.activeMembership, "admin")) {
    return (
      <div className="min-h-screen">
        <AppHeader context={context} />
        <ClubSettingsForbiddenCard />
      </div>
    );
  }

  const [clubMembersData, treasurySettings] = await Promise.all([
    getClubMembersForActiveClub(),
    getTreasurySettingsForActiveClub()
  ]);

  if (!clubMembersData || !treasurySettings) {
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
        feedbackCode={searchParams?.feedback}
        initialTab={searchParams?.tab}
        members={clubMembersData.members}
        pendingInvitations={clubMembersData.pendingInvitations}
        treasurySettings={treasurySettings}
        inviteUserAction={inviteClubUserAction}
        approveMembershipAction={approveClubMembershipAction}
        updateMembershipRolesAction={updateClubMembershipRoleAction}
        removeMembershipAction={removeClubMembershipAction}
        setTreasuryCurrenciesAction={setTreasuryCurrenciesAction}
        setMovementTypesAction={setMovementTypesAction}
        createTreasuryAccountAction={createTreasuryAccountAction}
        updateTreasuryAccountAction={updateTreasuryAccountAction}
        createTreasuryCategoryAction={createTreasuryCategoryAction}
        updateTreasuryCategoryAction={updateTreasuryCategoryAction}
        createClubActivityAction={createClubActivityAction}
        updateClubActivityAction={updateClubActivityAction}
        createReceiptFormatAction={createReceiptFormatAction}
        updateReceiptFormatAction={updateReceiptFormatAction}
      />
    </div>
  );
}
