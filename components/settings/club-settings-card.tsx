"use client";

import { ClubInvitationManager } from "@/components/settings/club-invitation-manager";
import { ClubMembersManager } from "@/components/settings/club-members-manager";
import { ClubTreasurySettingsManager } from "@/components/settings/club-treasury-settings-manager";
import { PageContentHeader } from "@/components/ui/page-content-header";
import { StatusBadge } from "@/components/ui/status-badge";
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

function SectionIntro({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-2">
      <h2 className="text-2xl font-semibold tracking-tight text-foreground">{title}</h2>
      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
    </div>
  );
}

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

      <section className="space-y-8 rounded-[20px] border border-border bg-card px-5 py-6 sm:px-8 sm:py-8">
        <section className="space-y-6">
          <SectionIntro
            title={texts.settings.club.members.section_title}
            description={texts.settings.club.members.section_description}
          />

          <ClubInvitationManager inviteUserAction={inviteUserAction} />

          <ClubMembersManager
            members={members}
            pendingInvitations={pendingInvitations}
            currentUserId={context.user.id}
            approveMembershipAction={approveMembershipAction}
            updateMembershipRoleAction={updateMembershipRolesAction}
            removeMembershipAction={removeMembershipAction}
          />
        </section>

        <ClubTreasurySettingsManager
          treasurySettings={treasurySettings}
          createTreasuryAccountAction={createTreasuryAccountAction}
          updateTreasuryAccountAction={updateTreasuryAccountAction}
          createTreasuryCategoryAction={createTreasuryCategoryAction}
          updateTreasuryCategoryAction={updateTreasuryCategoryAction}
          createClubActivityAction={createClubActivityAction}
          updateClubActivityAction={updateClubActivityAction}
        />
      </section>
    </main>
  );
}
