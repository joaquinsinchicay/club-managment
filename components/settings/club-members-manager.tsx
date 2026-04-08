"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { PendingFieldset, PendingSubmitButton } from "@/components/ui/pending-form";
import { formatMembershipRoles, MEMBERSHIP_ROLES } from "@/lib/domain/membership-roles";
import { texts } from "@/lib/texts";
import type {
  ClubMember,
  MembershipRole,
  MembershipStatus,
  PendingClubInvitation
} from "@/lib/domain/access";

type ClubMembersManagerProps = {
  members: ClubMember[];
  pendingInvitations: PendingClubInvitation[];
  currentUserId: string;
  approveMembershipAction: (formData: FormData) => Promise<void>;
  updateMembershipRoleAction: (formData: FormData) => Promise<void>;
  removeMembershipAction: (formData: FormData) => Promise<void>;
};

function getInitials(fullName: string, email: string) {
  const nameParts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (nameParts.length > 0) {
    return nameParts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  }

  return email.trim()[0]?.toUpperCase() ?? "";
}

function getRoleLabel(role: MembershipRole) {
  return texts.settings.club.members.roles[role];
}

function getStatusLabel(status: MembershipStatus) {
  return texts.settings.club.members.statuses[status];
}

function MemberMetaPill({ label, value }: { label: string; value: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-2 text-foreground">
      <span className="font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </span>
  );
}

export function ClubMembersManager({
  members,
  pendingInvitations,
  currentUserId,
  approveMembershipAction,
  updateMembershipRoleAction,
  removeMembershipAction
}: ClubMembersManagerProps) {
  const [selectedMembershipId, setSelectedMembershipId] = useState<string | null>(null);
  const selectedMember = useMemo(
    () => members.find((member) => member.membershipId === selectedMembershipId) ?? null,
    [members, selectedMembershipId]
  );

  if (members.length === 0 && pendingInvitations.length === 0) {
    return (
      <div className="rounded-[28px] border border-dashed border-border bg-secondary/30 p-6 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">{texts.settings.club.members.empty_title}</p>
        <p className="mt-2">{texts.settings.club.members.empty_description}</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {pendingInvitations.map((invitation) => (
          <article
            key={invitation.invitationId}
            className="rounded-[28px] border border-warning/35 bg-[linear-gradient(180deg,rgba(251,191,36,0.10)_0%,rgba(255,255,255,0.98)_100%)] p-5 shadow-soft"
          >
            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card text-sm font-semibold text-foreground">
                <span aria-hidden="true">{getInitials(invitation.email, invitation.email)}</span>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="truncate text-base font-semibold text-foreground">{invitation.email}</p>
                  <span className="rounded-full bg-warning px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-foreground">
                    {texts.settings.club.members.pending_badge}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <MemberMetaPill
                    label={texts.settings.club.members.status_label}
                    value={getStatusLabel(invitation.status)}
                  />
                  <MemberMetaPill
                    label={texts.settings.club.members.role_label}
                    value={getRoleLabel(invitation.role)}
                  />
                </div>
              </div>
            </div>
          </article>
        ))}

        {members.map((member) => {
          const isCurrentUser = member.userId === currentUserId;
          const initials = getInitials(member.fullName, member.email);
          const memberToneClass =
            member.status === "pendiente_aprobacion"
              ? "border-warning/35 bg-[linear-gradient(180deg,rgba(251,191,36,0.10)_0%,rgba(255,255,255,0.98)_100%)]"
              : "border-border/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.88)_0%,rgba(255,255,255,0.98)_100%)]";

          return (
            <article
              key={member.membershipId}
              className={`rounded-[28px] border p-5 shadow-soft ${memberToneClass}`}
            >
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card text-sm font-semibold text-foreground">
                  {member.avatarUrl ? (
                    <Image
                      src={member.avatarUrl}
                      alt=""
                      width={48}
                      height={48}
                      unoptimized
                      className="h-12 w-12 object-cover"
                    />
                  ) : (
                    <span aria-hidden="true">{initials}</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-base font-semibold text-foreground">{member.fullName}</p>
                    {isCurrentUser ? (
                      <span className="rounded-full bg-foreground px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground">
                        {texts.settings.club.members.current_user_badge}
                      </span>
                    ) : null}
                    {member.status === "pendiente_aprobacion" ? (
                      <span className="rounded-full bg-warning px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-foreground">
                        {texts.settings.club.members.pending_badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{member.email}</p>

                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    <MemberMetaPill
                      label={texts.settings.club.members.status_label}
                      value={getStatusLabel(member.status)}
                    />
                    <MemberMetaPill
                      label={texts.settings.club.members.roles_label}
                      value={formatMembershipRoles(member.roles)}
                    />
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3">
                <form
                  action={
                    member.status === "pendiente_aprobacion"
                      ? approveMembershipAction
                      : updateMembershipRoleAction
                  }
                  className="grid gap-3 rounded-[24px] border border-border/70 bg-card/90 p-4"
                >
                  <PendingFieldset className="grid gap-3">
                    <input type="hidden" name="membership_id" value={member.membershipId} />

                    <div className="space-y-3">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                        {texts.settings.club.members.roles_label}
                      </p>

                      <div className="grid gap-2 sm:grid-cols-3">
                        {MEMBERSHIP_ROLES.map((role) => {
                          const inputId = `${member.membershipId}-${role}`;

                          return (
                            <label
                              key={role}
                              htmlFor={inputId}
                              className="flex min-h-11 cursor-pointer items-center gap-3 rounded-2xl border border-border bg-secondary/40 px-3 py-3 text-sm text-foreground transition hover:bg-secondary"
                            >
                              <input
                                id={inputId}
                                type={member.status === "pendiente_aprobacion" ? "radio" : "checkbox"}
                                name={member.status === "pendiente_aprobacion" ? "role" : "roles"}
                                value={role}
                                defaultChecked={member.status === "pendiente_aprobacion"
                                  ? member.roles[0] === role
                                  : member.roles.includes(role)}
                                className="h-4 w-4 border-border text-foreground focus:ring-foreground"
                              />
                              <span className="font-medium">{getRoleLabel(role)}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>

                    <PendingSubmitButton
                      idleLabel={member.status === "pendiente_aprobacion"
                        ? texts.settings.club.members.approve_cta
                        : texts.settings.club.members.update_roles_cta}
                      pendingLabel={member.status === "pendiente_aprobacion"
                        ? texts.settings.club.members.approve_loading
                        : texts.settings.club.members.update_roles_loading}
                      className="min-h-11 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95 sm:justify-self-end"
                    />
                  </PendingFieldset>
                </form>

                <button
                  type="button"
                  onClick={() => setSelectedMembershipId(member.membershipId)}
                  className="min-h-11 rounded-2xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-destructive/15"
                >
                  {isCurrentUser
                    ? texts.settings.club.members.leave_club_cta
                    : texts.settings.club.members.remove_cta}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      {selectedMember ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-foreground/45 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-member-dialog-title"
            aria-describedby="remove-member-dialog-description"
            className="w-full max-w-md rounded-[32px] border border-border bg-card p-6 shadow-soft"
          >
            <div className="space-y-3">
              <div className="inline-flex w-fit rounded-full border border-destructive/25 bg-destructive/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground">
                {texts.settings.club.members.remove_cta}
              </div>
              <h2 id="remove-member-dialog-title" className="text-xl font-semibold tracking-tight text-card-foreground">
                {texts.settings.club.members.remove_dialog_title}
              </h2>
              <p
                id="remove-member-dialog-description"
                className="text-sm leading-6 text-muted-foreground"
              >
                {texts.settings.club.members.remove_dialog_description}
              </p>
            </div>

            <div className="mt-4 rounded-[24px] border border-border bg-secondary/50 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {texts.settings.club.members.remove_dialog_member_label}
              </p>
              <p className="mt-1 font-semibold text-foreground">{selectedMember.fullName}</p>
              <p className="text-sm text-muted-foreground">{selectedMember.email}</p>
            </div>

            <div className="mt-6">
              <form action={removeMembershipAction}>
                <PendingFieldset className="grid gap-3 sm:grid-cols-2">
                  <input type="hidden" name="membership_id" value={selectedMember.membershipId} />
                  <button
                    type="button"
                    onClick={() => setSelectedMembershipId(null)}
                    className="min-h-11 rounded-2xl border border-border bg-secondary px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
                  >
                    {texts.settings.club.members.remove_dialog_cancel_cta}
                  </button>
                  <PendingSubmitButton
                    idleLabel={texts.settings.club.members.remove_dialog_confirm_cta}
                    pendingLabel={texts.settings.club.members.remove_loading}
                    className="min-h-11 w-full rounded-2xl bg-destructive px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
                  />
                </PendingFieldset>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
