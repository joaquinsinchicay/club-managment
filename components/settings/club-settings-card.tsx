import Link from "next/link";

import { ClubInvitationManager } from "@/components/settings/club-invitation-manager";
import { ClubMembersManager } from "@/components/settings/club-members-manager";
import { CardShell } from "@/components/ui/card-shell";
import { texts } from "@/lib/texts";
import type { SessionContext } from "@/lib/auth/service";
import type { ClubMember, PendingClubInvitation } from "@/lib/domain/access";

type ClubSettingsCardProps = {
  context: SessionContext;
  members: ClubMember[];
  pendingInvitations: PendingClubInvitation[];
  inviteUserAction: (formData: FormData) => Promise<void>;
  approveMembershipAction: (formData: FormData) => Promise<void>;
  updateMembershipRolesAction: (formData: FormData) => Promise<void>;
  removeMembershipAction: (formData: FormData) => Promise<void>;
};

export function ClubSettingsCard({
  context,
  members,
  pendingInvitations,
  inviteUserAction,
  approveMembershipAction,
  updateMembershipRolesAction,
  removeMembershipAction
}: ClubSettingsCardProps) {
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
        </div>
      </CardShell>
    </main>
  );
}
