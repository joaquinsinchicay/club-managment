"use client";

import { PageContentHeader } from "@/components/ui/page-content-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { SettingsPageLayout } from "@/components/settings/settings-page-layout";
import { AccountsTab } from "@/components/settings/tabs/accounts-tab";
import { ActivitiesTab } from "@/components/settings/tabs/activities-tab";
import { CategoriesTab } from "@/components/settings/tabs/categories-tab";
import { MembersTab } from "@/components/settings/tabs/members-tab";
import { MembershipSystemsTab } from "@/components/settings/tabs/membership-systems-tab";
import { texts } from "@/lib/texts";
import type { SessionContext } from "@/lib/auth/service";
import type { ClubMember, PendingClubInvitation, TreasurySettings } from "@/lib/domain/access";

type ClubSettingsCardProps = {
  context: SessionContext;
  members: ClubMember[];
  pendingInvitations: PendingClubInvitation[];
  treasurySettings: TreasurySettings;
  inviteUserAction: (formData: FormData) => Promise<void>;
  approveMembershipAction: (formData: FormData) => Promise<void>;
  updateMembershipRolesAction: (formData: FormData) => Promise<void>;
  removeMembershipAction: (formData: FormData) => Promise<void>;
  createTreasuryAccountAction: (formData: FormData) => Promise<void>;
  updateTreasuryAccountAction: (formData: FormData) => Promise<void>;
  createTreasuryCategoryAction: (formData: FormData) => Promise<void>;
  updateTreasuryCategoryAction: (formData: FormData) => Promise<void>;
  createClubActivityAction: (formData: FormData) => Promise<void>;
  updateClubActivityAction: (formData: FormData) => Promise<void>;
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
  createTreasuryAccountAction,
  updateTreasuryAccountAction,
  createTreasuryCategoryAction,
  updateTreasuryCategoryAction,
  createClubActivityAction,
  updateClubActivityAction
}: ClubSettingsCardProps) {
  const activeClubName = context.activeClub?.name ?? "";
  const activeRoles =
    context.activeMembership?.roles
      .map((role) => texts.settings.club.members.roles[role] ?? role)
      .join(" + ") ?? "";

  const tabs = [
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
      id: "cuentas",
      label: texts.settings.club.tabs.accounts,
      content: (
        <AccountsTab
          accounts={treasurySettings.accounts}
          createTreasuryAccountAction={createTreasuryAccountAction}
          updateTreasuryAccountAction={updateTreasuryAccountAction}
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
      content: <MembershipSystemsTab receiptFormats={treasurySettings.receiptFormats} />
    }
  ];

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      <PageContentHeader
        eyebrow={texts.settings.club.eyebrow}
        title={texts.settings.club.title}
        description={texts.settings.club.description}
        backHref="/dashboard"
        backLabel={texts.settings.club.back_to_dashboard_cta}
      />

      <section className="rounded-[20px] border border-border bg-card p-5 sm:p-6">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
              {texts.settings.club.club_summary_title}
            </p>
            <p className="text-2xl font-semibold tracking-tight text-foreground">{activeClubName}</p>
            <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
              {texts.settings.club.club_summary_description}
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-border bg-secondary/35 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {texts.settings.club.club_summary_status_label}
              </p>
              <div className="mt-2">
                <StatusBadge label={texts.settings.club.club_summary_status_value} tone="success" />
              </div>
            </div>

            <div className="rounded-xl border border-border bg-secondary/35 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {texts.settings.club.members.roles_label}
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {activeRoles || texts.settings.club.club_summary_roles_empty}
              </p>
            </div>

            <div className="rounded-xl border border-dashed border-border bg-secondary/20 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {texts.settings.club.club_summary_future_fields_label}
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {texts.settings.club.club_summary_future_fields_value}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-[20px] border border-border bg-card px-5 py-6 sm:px-8 sm:py-8">
        <SettingsPageLayout tabs={tabs} defaultTabId="miembros" />
      </section>
    </main>
  );
}
