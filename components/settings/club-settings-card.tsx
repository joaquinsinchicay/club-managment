"use client";

import { PageContentHeader } from "@/components/ui/page-content-header";
import { SettingsPageLayout } from "@/components/settings/settings-page-layout";
import { ActivitiesTab } from "@/components/settings/tabs/activities-tab";
import { CategoriesTab } from "@/components/settings/tabs/categories-tab";
import { ClubDataTab } from "@/components/settings/tabs/club-data-tab";
import { MembersTab } from "@/components/settings/tabs/members-tab";
import { MembershipSystemsTab } from "@/components/settings/tabs/membership-systems-tab";
import { texts } from "@/lib/texts";
import type { SessionContext } from "@/lib/auth/service";
import type { ClubMember, PendingClubInvitation, TreasurySettings } from "@/lib/domain/access";
import { getClubSettingsPermissions } from "@/lib/domain/authorization";

type ClubSettingsCardProps = {
  context: SessionContext;
  members: ClubMember[];
  pendingInvitations: PendingClubInvitation[];
  treasurySettings: TreasurySettings;
  inviteUserAction: (formData: FormData) => Promise<void>;
  approveMembershipAction: (formData: FormData) => Promise<void>;
  updateMembershipRolesAction: (formData: FormData) => Promise<void>;
  removeMembershipAction: (formData: FormData) => Promise<void>;
  createTreasuryCategoryAction: (formData: FormData) => Promise<void>;
  updateTreasuryCategoryAction: (formData: FormData) => Promise<void>;
  createClubActivityAction: (formData: FormData) => Promise<void>;
  updateClubActivityAction: (formData: FormData) => Promise<void>;
  updateReceiptFormatAction: (formData: FormData) => Promise<void>;
  updateClubIdentityAction: (formData: FormData) => Promise<void>;
};

export function ClubSettingsCard({
  context,
  members,
  pendingInvitations,
  treasurySettings,
  inviteUserAction,
  approveMembershipAction,
  updateMembershipRolesAction,
  removeMembershipAction,
  createTreasuryCategoryAction,
  updateTreasuryCategoryAction,
  createClubActivityAction,
  updateClubActivityAction,
  updateReceiptFormatAction,
  updateClubIdentityAction
}: ClubSettingsCardProps) {
  const activeClub = context.activeClub;
  const activeClubName = activeClub?.name ?? "";
  const clubInitial = activeClubName.charAt(0).toUpperCase() || "?";
  const permissions = getClubSettingsPermissions(context.activeMembership);

  const tabs = [
    activeClub
      ? {
          id: "datos-del-club",
          label: texts.settings.club.tabs.club_data,
          content: (
            <ClubDataTab
              club={activeClub}
              canEdit={permissions.canManageMembers}
              updateClubIdentityAction={updateClubIdentityAction}
            />
          )
        }
      : null,
    {
      id: "miembros",
      label: texts.settings.club.tabs.members,
      content: (
        <MembersTab
          members={members}
          pendingInvitations={pendingInvitations}
          currentUserId={context.user.id}
          inviteUserAction={inviteUserAction}
          approveMembershipAction={approveMembershipAction}
          updateMembershipRoleAction={updateMembershipRolesAction}
          removeMembershipAction={removeMembershipAction}
        />
      )
    },
    {
      id: "categorias",
      label: texts.settings.club.tabs.categories,
      content: (
        <CategoriesTab
          categories={treasurySettings.categories}
          createTreasuryCategoryAction={createTreasuryCategoryAction}
          updateTreasuryCategoryAction={updateTreasuryCategoryAction}
        />
      )
    },
    {
      id: "actividades",
      label: texts.settings.club.tabs.activities,
      content: (
        <ActivitiesTab
          activities={treasurySettings.activities}
          createClubActivityAction={createClubActivityAction}
          updateClubActivityAction={updateClubActivityAction}
        />
      )
    },
    {
      id: "sistema-de-socios",
      label: texts.settings.club.tabs.membership_systems,
      content: (
        <MembershipSystemsTab
          receiptFormats={treasurySettings.receiptFormats}
          updateReceiptFormatAction={updateReceiptFormatAction}
        />
      )
    }
  ].filter((tab): tab is NonNullable<typeof tab> => Boolean(tab));

  const primaryColor = activeClub?.colorPrimary ?? undefined;
  const logoUrl = activeClub?.logoUrl ?? null;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      <PageContentHeader
        eyebrow={texts.settings.club.eyebrow}
        title={texts.settings.club.title}
        description={texts.settings.club.description}
      />

      <section className="rounded-dialog border border-border bg-card p-5 sm:p-6">
        <div className="flex items-center gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border bg-primary/10 text-lg font-semibold text-primary"
            style={primaryColor ? { borderColor: primaryColor } : undefined}
          >
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoUrl} alt={activeClubName} className="h-full w-full object-cover" />
            ) : (
              <span>{clubInitial}</span>
            )}
          </div>
          <p className="text-xl font-semibold tracking-tight text-foreground">{activeClubName}</p>
        </div>
      </section>

      <section className="rounded-dialog border border-border bg-card px-5 py-6 sm:px-8 sm:py-8">
        <SettingsPageLayout tabs={tabs} defaultTabId="datos-del-club" />
      </section>
    </main>
  );
}
