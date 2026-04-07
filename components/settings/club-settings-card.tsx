"use client";

import Link from "next/link";
import { useState } from "react";

import { ClubInvitationManager } from "@/components/settings/club-invitation-manager";
import { ClubMembersManager } from "@/components/settings/club-members-manager";
import { ClubTreasurySettingsManager } from "@/components/settings/club-treasury-settings-manager";
import { CardShell } from "@/components/ui/card-shell";
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
  createReceiptFormatAction: (formData: FormData) => Promise<void>;
  updateReceiptFormatAction: (formData: FormData) => Promise<void>;
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
  createReceiptFormatAction,
  updateReceiptFormatAction
}: ClubSettingsCardProps) {
  const [activeTab, setActiveTab] = useState<ClubSettingsTab>(
    initialTab === "treasury" && canManageTreasury ? "treasury" : "members"
  );
  const resolvedTab =
    activeTab === "treasury" && canManageTreasury
      ? "treasury"
      : canManageMembers
        ? "members"
        : "treasury";
  const showTabSwitcher = canManageMembers && canManageTreasury;

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <CardShell
        eyebrow={texts.settings.club.eyebrow}
        title={texts.settings.club.title}
        description={texts.settings.club.description}
        className="max-w-4xl"
      >
        <div className="space-y-5">
          <Link
            href="/dashboard"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
          >
            {texts.settings.club.back_to_dashboard_cta}
          </Link>

          <div className="rounded-2xl border border-border bg-secondary/70 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {texts.dashboard.club_label}
            </p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {context.activeClub?.name}
            </p>
          </div>

          {showTabSwitcher ? (
            <div className="grid gap-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setActiveTab("members")}
                className={`min-h-11 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  resolvedTab === "members"
                    ? "bg-foreground text-primary-foreground"
                    : "border border-border bg-card text-foreground hover:bg-secondary"
                }`}
              >
                {texts.settings.club.tabs.members}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("treasury")}
                className={`min-h-11 rounded-2xl px-4 py-3 text-sm font-semibold transition ${
                  resolvedTab === "treasury"
                    ? "bg-foreground text-primary-foreground"
                    : "border border-border bg-card text-foreground hover:bg-secondary"
                }`}
              >
                {texts.settings.club.tabs.treasury}
              </button>
            </div>
          ) : null}

          {resolvedTab === "members" && canManageMembers ? (
            <>
              <div className="space-y-2">
                <h2 className="text-lg font-semibold text-foreground">
                  {texts.settings.club.members.section_title}
                </h2>
                <p className="text-sm leading-6 text-muted-foreground">
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
              treasurySettings={treasurySettings}
              createTreasuryAccountAction={createTreasuryAccountAction}
              updateTreasuryAccountAction={updateTreasuryAccountAction}
              createTreasuryCategoryAction={createTreasuryCategoryAction}
              updateTreasuryCategoryAction={updateTreasuryCategoryAction}
              createClubActivityAction={createClubActivityAction}
              updateClubActivityAction={updateClubActivityAction}
              createReceiptFormatAction={createReceiptFormatAction}
              updateReceiptFormatAction={updateReceiptFormatAction}
            />
          ) : null}
        </div>
      </CardShell>
    </main>
  );
}
