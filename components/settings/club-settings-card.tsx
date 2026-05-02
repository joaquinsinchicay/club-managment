"use client";

import { Card } from "@/components/ui/card";
import { PageContentHeader } from "@/components/ui/page-content-header";
import { SettingsPageLayout } from "@/components/settings/settings-page-layout";
import { CategoriesActivitiesTab } from "@/components/settings/tabs/categories-activities-tab";
import { ClubDataTab } from "@/components/settings/tabs/club-data-tab";
import { MembersTab } from "@/components/settings/tabs/members-tab";
import { MembershipSystemsTab } from "@/components/settings/tabs/membership-systems-tab";
import { PlaceholderTab } from "@/components/settings/tabs/placeholder-tab";
import { settings as txtSettings } from "@/lib/texts";
import type { SessionContext } from "@/lib/auth/service";
import type { ClubMember, PendingClubInvitation, TreasurySettings } from "@/lib/domain/access";
import { getClubSettingsPermissions } from "@/lib/domain/authorization";

type ClubSettingsCardProps = {
  context: SessionContext;
  members: ClubMember[];
  pendingInvitations: PendingClubInvitation[];
  treasurySettings: TreasurySettings;
  createUserAction: (formData: FormData) => Promise<void>;
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
  createUserAction,
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
  const permissions = getClubSettingsPermissions(context.activeMembership);

  const placeholders = txtSettings.club.placeholders;

  const tabs = [
    activeClub
      ? {
          id: "datos-del-club",
          label: txtSettings.club.tabs.club_data,
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
      id: "jornada",
      label: txtSettings.club.tabs.journey,
      content: (
        <PlaceholderTab
          eyebrow={placeholders.journey.eyebrow}
          title={placeholders.journey.title}
          description={placeholders.journey.description}
        />
      )
    },
    {
      id: "categorias-actividades",
      label: txtSettings.club.tabs.categories_activities,
      content: (
        <CategoriesActivitiesTab
          categories={treasurySettings.categories}
          activities={treasurySettings.activities}
          createTreasuryCategoryAction={createTreasuryCategoryAction}
          updateTreasuryCategoryAction={updateTreasuryCategoryAction}
          createClubActivityAction={createClubActivityAction}
          updateClubActivityAction={updateClubActivityAction}
        />
      )
    },
    {
      id: "miembros",
      label: txtSettings.club.tabs.members,
      content: (
        <MembersTab
          members={members}
          pendingInvitations={pendingInvitations}
          currentUserId={context.user.id}
          clubName={activeClub?.name ?? ""}
          createUserAction={createUserAction}
          updateMembershipRoleAction={updateMembershipRolesAction}
          removeMembershipAction={removeMembershipAction}
        />
      )
    },
    {
      id: "numeracion-comprobantes",
      label: txtSettings.club.tabs.receipt_numbering,
      content: (
        <PlaceholderTab
          eyebrow={placeholders.receipt_numbering.eyebrow}
          title={placeholders.receipt_numbering.title}
          description={placeholders.receipt_numbering.description}
        />
      )
    },
    {
      id: "notificaciones",
      label: txtSettings.club.tabs.notifications,
      content: (
        <PlaceholderTab
          eyebrow={placeholders.notifications.eyebrow}
          title={placeholders.notifications.title}
          description={placeholders.notifications.description}
        />
      )
    },
    {
      id: "integraciones",
      label: txtSettings.club.tabs.integrations,
      content: (
        <PlaceholderTab
          eyebrow={placeholders.integrations.eyebrow}
          title={placeholders.integrations.title}
          description={placeholders.integrations.description}
        />
      )
    },
    {
      id: "auditoria",
      label: txtSettings.club.tabs.audit,
      content: (
        <PlaceholderTab
          eyebrow={placeholders.audit.eyebrow}
          title={placeholders.audit.title}
          description={placeholders.audit.description}
        />
      )
    },
    {
      id: "sistema-de-socios",
      label: txtSettings.club.tabs.membership_systems,
      content: (
        <MembershipSystemsTab
          receiptFormats={treasurySettings.receiptFormats}
          updateReceiptFormatAction={updateReceiptFormatAction}
        />
      )
    }
  ].filter((tab): tab is NonNullable<typeof tab> => Boolean(tab));

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      <PageContentHeader
        eyebrow={txtSettings.club.eyebrow}
        title={txtSettings.club.title}
        description={txtSettings.club.description}
      />

      <Card as="section" className="px-5 py-6 sm:px-8 sm:py-8" padding="none">
        <SettingsPageLayout tabs={tabs} defaultTabId="datos-del-club" />
      </Card>
    </main>
  );
}
