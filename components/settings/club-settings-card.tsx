import { ClubInvitationManager } from "@/components/settings/club-invitation-manager";
import { ClubMembersManager } from "@/components/settings/club-members-manager";
import { StatusMessage } from "@/components/ui/status-message";
import { CardShell } from "@/components/ui/card-shell";
import { texts } from "@/lib/texts";
import type { SessionContext } from "@/lib/auth/service";
import type { ClubMember, PendingClubInvitation } from "@/lib/domain/access";
import type { ClubMemberActionCode } from "@/lib/services/club-members-service";
import type { ClubInvitationActionCode } from "@/lib/services/club-invitations-service";

type ClubSettingsCardProps = {
  context: SessionContext;
  members: ClubMember[];
  pendingInvitations: PendingClubInvitation[];
  feedbackCode?: string;
  inviteUserAction: (formData: FormData) => Promise<void>;
  approveMembershipAction: (formData: FormData) => Promise<void>;
  updateMembershipRoleAction: (formData: FormData) => Promise<void>;
  removeMembershipAction: (formData: FormData) => Promise<void>;
};

const successFeedbackCodes: Array<ClubMemberActionCode | ClubInvitationActionCode> = [
  "invitation_created",
  "membership_approved",
  "membership_role_updated",
  "membership_removed",
  "self_removed"
];

function getFeedbackMessage(feedbackCode?: string) {
  if (!feedbackCode) {
    return null;
  }

  const feedbackMessages = {
    ...(texts.settings.club.members.feedback as Record<string, string>),
    ...(texts.settings.club.invitations.feedback as Record<string, string>)
  };
  const message = feedbackMessages[feedbackCode];

  if (!message) {
    return null;
  }

  return {
    tone: successFeedbackCodes.includes(feedbackCode as ClubMemberActionCode) ? "success" : "destructive",
    message
  } as const;
}

export function ClubSettingsCard({
  context,
  members,
  pendingInvitations,
  feedbackCode,
  inviteUserAction,
  approveMembershipAction,
  updateMembershipRoleAction,
  removeMembershipAction
}: ClubSettingsCardProps) {
  const feedback = getFeedbackMessage(feedbackCode);

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <CardShell
        eyebrow={texts.settings.club.eyebrow}
        title={texts.settings.club.title}
        description={texts.settings.club.description}
        className="max-w-4xl"
      >
        <div className="space-y-5">
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

          {feedback ? <StatusMessage tone={feedback.tone} message={feedback.message} /> : null}

          <ClubInvitationManager inviteUserAction={inviteUserAction} />

          <ClubMembersManager
            members={members}
            pendingInvitations={pendingInvitations}
            currentUserId={context.user.id}
            approveMembershipAction={approveMembershipAction}
            updateMembershipRoleAction={updateMembershipRoleAction}
            removeMembershipAction={removeMembershipAction}
          />
        </div>
      </CardShell>
    </main>
  );
}
