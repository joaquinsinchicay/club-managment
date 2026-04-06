"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { texts } from "@/lib/texts";
import type { ClubMember, MembershipRole, MembershipStatus } from "@/lib/domain/access";

type ClubMembersManagerProps = {
  members: ClubMember[];
  currentUserId: string;
  approveMembershipAction: (formData: FormData) => Promise<void>;
  updateMembershipRoleAction: (formData: FormData) => Promise<void>;
  removeMembershipAction: (formData: FormData) => Promise<void>;
};

const membershipRoles: MembershipRole[] = ["admin", "secretaria", "tesoreria"];

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

export function ClubMembersManager({
  members,
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

  if (members.length === 0) {
    return (
      <div className="rounded-[24px] border border-dashed border-border bg-secondary/40 p-5 text-sm text-muted-foreground">
        <p className="font-semibold text-foreground">{texts.settings.club.members.empty_title}</p>
        <p className="mt-2">{texts.settings.club.members.empty_description}</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-4">
        {members.map((member) => {
          const isCurrentUser = member.userId === currentUserId;
          const initials = getInitials(member.fullName, member.email);
          const memberToneClass =
            member.status === "pendiente_aprobacion"
              ? "border-warning/40 bg-warning/10"
              : "border-border bg-secondary/50";

          return (
            <article
              key={member.membershipId}
              className={`rounded-[24px] border p-4 shadow-sm ${memberToneClass}`}
            >
              <div className="flex items-start gap-3">
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
                    <p className="truncate text-sm font-semibold text-foreground">{member.fullName}</p>
                    {isCurrentUser ? (
                      <span className="rounded-full bg-foreground px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-foreground">
                        {texts.settings.club.members.current_user_badge}
                      </span>
                    ) : null}
                    {member.status === "pendiente_aprobacion" ? (
                      <span className="rounded-full bg-warning px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent-foreground">
                        {texts.settings.club.members.pending_badge}
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{member.email}</p>

                  <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
                    <div className="rounded-2xl border border-border/70 bg-card px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {texts.settings.club.members.status_label}
                      </p>
                      <p className="mt-1 font-medium text-foreground">{getStatusLabel(member.status)}</p>
                    </div>
                    <div className="rounded-2xl border border-border/70 bg-card px-3 py-2">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {texts.settings.club.members.role_label}
                      </p>
                      <p className="mt-1 font-medium text-foreground">{getRoleLabel(member.role)}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-3">
                <form
                  action={
                    member.status === "pendiente_aprobacion"
                      ? approveMembershipAction
                      : updateMembershipRoleAction
                  }
                  className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto]"
                >
                  <input type="hidden" name="membership_id" value={member.membershipId} />
                  <label className="grid gap-2 text-sm text-foreground">
                    <span className="font-medium">{texts.settings.club.members.role_label}</span>
                    <select
                      name="role"
                      defaultValue={member.role}
                      className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                    >
                      {membershipRoles.map((role) => (
                        <option key={role} value={role}>
                          {getRoleLabel(role)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    type="submit"
                    className="min-h-11 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
                  >
                    {member.status === "pendiente_aprobacion"
                      ? texts.settings.club.members.approve_cta
                      : texts.settings.club.members.update_role_cta}
                  </button>
                </form>

                <button
                  type="button"
                  onClick={() => setSelectedMembershipId(member.membershipId)}
                  className="min-h-11 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-destructive/15"
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
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-foreground/40 px-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="remove-member-dialog-title"
            aria-describedby="remove-member-dialog-description"
            className="w-full max-w-md rounded-[28px] border border-border bg-card p-6 shadow-soft"
          >
            <h2 id="remove-member-dialog-title" className="text-xl font-semibold text-card-foreground">
              {texts.settings.club.members.remove_dialog_title}
            </h2>
            <p
              id="remove-member-dialog-description"
              className="mt-2 text-sm leading-6 text-muted-foreground"
            >
              {texts.settings.club.members.remove_dialog_description}
            </p>

            <div className="mt-4 rounded-2xl border border-border bg-secondary/60 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {texts.settings.club.members.remove_dialog_member_label}
              </p>
              <p className="mt-1 font-semibold text-foreground">{selectedMember.fullName}</p>
              <p className="text-sm text-muted-foreground">{selectedMember.email}</p>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setSelectedMembershipId(null)}
                className="min-h-11 rounded-2xl border border-border bg-secondary px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted"
              >
                {texts.settings.club.members.remove_dialog_cancel_cta}
              </button>
              <form action={removeMembershipAction}>
                <input type="hidden" name="membership_id" value={selectedMember.membershipId} />
                <button
                  type="submit"
                  className="min-h-11 w-full rounded-2xl bg-destructive px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
                >
                  {texts.settings.club.members.remove_dialog_confirm_cta}
                </button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
