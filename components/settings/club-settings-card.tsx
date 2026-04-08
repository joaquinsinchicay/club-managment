"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { ClubInvitationManager } from "@/components/settings/club-invitation-manager";
import { ClubMembersManager } from "@/components/settings/club-members-manager";
import { ClubTreasurySettingsManager } from "@/components/settings/club-treasury-settings-manager";
import { texts } from "@/lib/texts";
import type { SessionContext } from "@/lib/auth/service";
import type { ClubMember, PendingClubInvitation, TreasurySettings } from "@/lib/domain/access";

type ClubSettingsTab = "members" | "treasury";

type ClubSettingsCardProps = {
  context: SessionContext;
  initialTab?: string;
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
  setTreasuryFieldRulesAction: (formData: FormData) => Promise<void>;
  updateCalendarEventTreasuryAvailabilityAction: (formData: FormData) => Promise<void>;
};

export function ClubSettingsCard({
  context,
  initialTab,
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
  updateClubActivityAction,
  setTreasuryFieldRulesAction,
  updateCalendarEventTreasuryAvailabilityAction
}: ClubSettingsCardProps) {
  const resolvedInitialTab: ClubSettingsTab =
    initialTab === "treasury" && canManageTreasury ? "treasury" : "members";
  const [activeTab, setActiveTab] = useState<ClubSettingsTab>(resolvedInitialTab);

  useEffect(() => {
    setActiveTab(resolvedInitialTab);
  }, [resolvedInitialTab]);

  const resolvedTab =
    activeTab === "treasury" && canManageTreasury
      ? "treasury"
      : canManageMembers
        ? "members"
        : "treasury";
  const showTabSwitcher = canManageMembers && canManageTreasury;
  const activeClubName = context.activeClub?.name ?? "";
  const activeRoles =
    context.activeMembership?.roles
      .map((role) => texts.settings.club.members.roles[role] ?? role)
      .join(" + ") ?? "";

  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:py-10">
      <section className="overflow-hidden rounded-[32px] border border-border/70 bg-card shadow-soft">
        <div className="border-b border-border/60 bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.18),transparent_42%),linear-gradient(180deg,rgba(248,250,252,0.96)_0%,rgba(248,250,252,0.82)_100%)] px-5 py-7 sm:px-8 sm:py-9">
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:items-start">
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

              {showTabSwitcher ? (
                <div className="inline-flex w-full max-w-md rounded-[20px] border border-border/70 bg-card/70 p-1.5">
                  <button
                    type="button"
                    onClick={() => setActiveTab("members")}
                    className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      resolvedTab === "members"
                        ? "bg-foreground text-primary-foreground shadow-sm"
                        : "text-foreground hover:bg-secondary/70"
                    }`}
                  >
                    {texts.settings.club.tabs.members}
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("treasury")}
                    className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                      resolvedTab === "treasury"
                        ? "bg-foreground text-primary-foreground shadow-sm"
                        : "text-foreground hover:bg-secondary/70"
                    }`}
                  >
                    {texts.settings.club.tabs.treasury}
                  </button>
                </div>
              ) : null}
            </div>

            <div className="rounded-[28px] border border-border/70 bg-card/80 p-5 shadow-soft">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                      {texts.dashboard.club_label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                      {activeClubName}
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-2 rounded-2xl border border-border bg-secondary/60 px-3 py-2 text-sm text-foreground">
                    <span className="text-success" aria-hidden="true">
                      ●
                    </span>
                    <span className="font-medium">{texts.settings.club.description}</span>
                  </div>
                </div>

                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[20px] bg-primary/10 text-2xl text-primary">
                  {resolvedTab === "treasury" ? "🏛️" : "👥"}
                </div>
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-border/70 bg-background/80 px-4 py-3">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {texts.settings.club.members.roles_label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-foreground">{activeRoles}</p>
                </div>
                <Link
                  href="/dashboard"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border bg-background/80 px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                >
                  {texts.settings.club.back_to_dashboard_cta}
                </Link>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-8 bg-[linear-gradient(180deg,rgba(248,250,252,0.62)_0%,rgba(255,255,255,0)_24%)] px-5 py-6 sm:px-8 sm:py-8">
          {!showTabSwitcher ? (
            <div className="flex items-center gap-3 rounded-[24px] border border-border/70 bg-secondary/40 px-4 py-4">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-card text-xl">
                {resolvedTab === "treasury" ? "💰" : "👤"}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {texts.settings.club.eyebrow}
                </p>
                <p className="text-base font-semibold text-foreground">
                  {resolvedTab === "treasury"
                    ? texts.settings.club.tabs.treasury
                    : texts.settings.club.tabs.members}
                </p>
              </div>
            </div>
          ) : null}

          {resolvedTab === "members" && canManageMembers ? (
            <>
              <div className="space-y-3">
                <div className="inline-flex w-fit rounded-full border border-border/70 bg-secondary/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {texts.settings.club.tabs.members}
                </div>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  {texts.settings.club.members.section_title}
                </h2>
                <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                  {texts.settings.club.members.section_description}
                </p>
              </div>

              <ClubInvitationManager inviteUserAction={inviteUserAction} />

              <ClubMembersManager
                members={members}
                pendingInvitations={pendingInvitations}
                currentUserId={context.user.id}
                approveMembershipAction={approveMembershipAction}
                updateMembershipRoleAction={updateMembershipRolesAction}
                removeMembershipAction={removeMembershipAction}
              />
            </>
          ) : canManageTreasury && treasurySettings ? (
            <ClubTreasurySettingsManager
              clubName={activeClubName}
              canManageFieldRules={canManageMembers}
              treasurySettings={treasurySettings}
              createTreasuryAccountAction={createTreasuryAccountAction}
              updateTreasuryAccountAction={updateTreasuryAccountAction}
              createTreasuryCategoryAction={createTreasuryCategoryAction}
              updateTreasuryCategoryAction={updateTreasuryCategoryAction}
              createClubActivityAction={createClubActivityAction}
              updateClubActivityAction={updateClubActivityAction}
              setTreasuryFieldRulesAction={setTreasuryFieldRulesAction}
              updateCalendarEventTreasuryAvailabilityAction={updateCalendarEventTreasuryAvailabilityAction}
            />
          ) : null}
        </div>
      </section>
    </main>
  );
}
