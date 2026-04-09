"use client";

import Link from "next/link";

import { ClubInvitationManager } from "@/components/settings/club-invitation-manager";
import { ClubMembersManager } from "@/components/settings/club-members-manager";
import { ClubTreasurySettingsManager } from "@/components/settings/club-treasury-settings-manager";
import { texts } from "@/lib/texts";
import type { SessionContext } from "@/lib/auth/service";
import type { ClubMember, PendingClubInvitation, TreasurySettings } from "@/lib/domain/access";

type ClubSettingsCardProps = {
  context: SessionContext;
  canManageMembers: boolean;
  canManageTreasury: boolean;
  members: ClubMember[];
  pendingInvitations: PendingClubInvitation[];
  treasurySettings: TreasurySettings | null;
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
  canManageMembers,
  canManageTreasury,
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
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      <section className="overflow-hidden rounded-[32px] border border-border/70 bg-card shadow-soft">
        <div className="border-b border-border/60 bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.18),transparent_42%),linear-gradient(180deg,rgba(248,250,252,0.96)_0%,rgba(248,250,252,0.82)_100%)] px-5 py-7 sm:px-8 sm:py-9">
          <div className="space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-4">
                <span className="inline-flex rounded-full border border-border/70 bg-card/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-foreground">
                  {texts.settings.club.eyebrow}
                </span>

                <div className="space-y-2">
                  <h1 className="max-w-2xl text-3xl font-semibold tracking-tight text-card-foreground sm:text-4xl">
                    {texts.settings.club.title}
                  </h1>
                  <p className="max-w-2xl text-base leading-7 text-muted-foreground">
                    {texts.settings.club.description}
                  </p>
                </div>
              </div>

              <Link
                href="/dashboard"
                className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary sm:shrink-0"
              >
                {texts.settings.club.back_to_dashboard_cta}
              </Link>
            </div>

            <div className="rounded-[28px] border border-border/70 bg-card/85 p-5">
              <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[18px] bg-primary/10 text-2xl text-primary">
                      ⚙️
                    </div>
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                        {texts.settings.club.club_summary_title}
                      </p>
                      <p className="mt-1 text-xl font-semibold tracking-tight text-foreground sm:text-2xl">
                        {activeClubName}
                      </p>
                    </div>
                  </div>

                  <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
                    {texts.settings.club.club_summary_description}
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-3 lg:min-w-[32rem]">
                  <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {texts.settings.club.club_summary_status_label}
                    </p>
                    <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-secondary/70 px-3 py-1.5 text-sm font-medium text-foreground">
                      <span className="text-success" aria-hidden="true">
                        ●
                      </span>
                      <span>{texts.settings.club.club_summary_status_value}</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {texts.settings.club.members.roles_label}
                    </p>
                    <p className="mt-2 text-sm font-semibold text-foreground">
                      {activeRoles || texts.settings.club.club_summary_roles_empty}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-dashed border-border/70 bg-background/80 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {texts.settings.club.club_summary_future_fields_label}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {texts.settings.club.club_summary_future_fields_value}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8 bg-[linear-gradient(180deg,rgba(248,250,252,0.62)_0%,rgba(255,255,255,0)_24%)] px-5 py-6 sm:px-8 sm:py-8">
          {canManageMembers ? (
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
          ) : null}

          {canManageTreasury && treasurySettings ? (
            <ClubTreasurySettingsManager
              treasurySettings={treasurySettings}
              createTreasuryAccountAction={createTreasuryAccountAction}
              updateTreasuryAccountAction={updateTreasuryAccountAction}
              createTreasuryCategoryAction={createTreasuryCategoryAction}
              updateTreasuryCategoryAction={updateTreasuryCategoryAction}
              createClubActivityAction={createClubActivityAction}
              updateClubActivityAction={updateClubActivityAction}
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}
