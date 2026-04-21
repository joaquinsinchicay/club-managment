"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

import { buttonClass } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { ModalFooter } from "@/components/ui/modal-footer";
import {
  FormCheckboxCard,
  FormField,
  FormFieldLabel,
  FormInput,
  FormSection,
  FormSelect,
} from "@/components/ui/modal-form";
import { PendingFieldset, PendingSubmitButton } from "@/components/ui/pending-form";
import { SettingsTabShell } from "@/components/settings/settings-tab-shell";
import { formatMembershipRoles, MEMBERSHIP_ROLES } from "@/lib/domain/membership-roles";
import { texts } from "@/lib/texts";
import type {
  ClubMember,
  MembershipRole,
  MembershipStatus,
  PendingClubInvitation
} from "@/lib/domain/access";

function getInitials(fullName: string, email: string) {
  const nameParts = fullName.trim().split(/\s+/).filter(Boolean).slice(0, 2);
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

const membershipRoles: MembershipRole[] = ["admin", "secretaria", "tesoreria"];

type MembersTabProps = {
  members: ClubMember[];
  pendingInvitations: PendingClubInvitation[];
  currentUserId: string;
  inviteUserAction: (formData: FormData) => Promise<void>;
  approveMembershipAction: (formData: FormData) => Promise<void>;
  updateMembershipRoleAction: (formData: FormData) => Promise<void>;
  removeMembershipAction: (formData: FormData) => Promise<void>;
};

export function MembersTab({
  members,
  pendingInvitations,
  currentUserId,
  inviteUserAction,
  approveMembershipAction,
  updateMembershipRoleAction,
  removeMembershipAction
}: MembersTabProps) {
  const searchParams = useSearchParams();
  const feedbackCode = searchParams.get("feedback");

  const [search, setSearch] = useState("");
  const [isInviting, setIsInviting] = useState(false);
  const [editingMember, setEditingMember] = useState<ClubMember | null>(null);
  const [removingMembershipId, setRemovingMembershipId] = useState<string | null>(null);

  useEffect(() => {
    if (feedbackCode === "membership_roles_updated" || feedbackCode === "membership_approved") {
      setEditingMember(null);
      setIsInviting(false);
    }
    if (feedbackCode === "membership_removed" || feedbackCode === "self_removed") {
      setRemovingMembershipId(null);
    }
  }, [feedbackCode]);

  const removingMember = useMemo(
    () => members.find((m) => m.membershipId === removingMembershipId) ?? null,
    [members, removingMembershipId]
  );

  const filteredMembers = members.filter(
    (m) =>
      m.fullName.toLowerCase().includes(search.toLowerCase()) ||
      m.email.toLowerCase().includes(search.toLowerCase())
  );

  const filteredInvitations = pendingInvitations.filter((inv) =>
    inv.email.toLowerCase().includes(search.toLowerCase())
  );

  const isEmpty = members.length === 0 && pendingInvitations.length === 0;

  return (
    <>
      <SettingsTabShell
        searchPlaceholder="Buscar miembro..."
        searchValue={search}
        onSearch={setSearch}
        ctaLabel={texts.settings.club.invitations.toggle_cta}
        onCta={() => setIsInviting(true)}
      >
        {isEmpty ? (
          <div className="rounded-toast border border-dashed border-border bg-secondary/30 p-6 text-sm text-muted-foreground">
            <p className="font-semibold text-foreground">{texts.settings.club.members.empty_title}</p>
            <p className="mt-2">{texts.settings.club.members.empty_description}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredInvitations.map((invitation) => (
              <article
                key={invitation.invitationId}
                className="rounded-toast border border-warning/35 bg-gradient-warning-soft p-5 shadow-soft"
              >
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card text-sm font-semibold text-foreground">
                    <span aria-hidden="true">{getInitials(invitation.email, invitation.email)}</span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-base font-semibold text-foreground">{invitation.email}</p>
                      <span className="rounded-full bg-warning px-2.5 py-1 text-meta font-semibold uppercase tracking-[0.14em] text-accent-foreground">
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

            {filteredMembers.map((member) => {
              const isCurrentUser = member.userId === currentUserId;
              const initials = getInitials(member.fullName, member.email);
              const memberToneClass =
                member.status === "pendiente_aprobacion"
                  ? "border-warning/35 bg-gradient-warning-soft"
                  : "border-border/70 bg-gradient-surface-soft";

              return (
                <article
                  key={member.membershipId}
                  className={`group rounded-toast border p-5 shadow-soft ${memberToneClass}`}
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
                          <span className="rounded-full bg-foreground px-2.5 py-1 text-meta font-semibold uppercase tracking-[0.14em] text-primary-foreground">
                            {texts.settings.club.members.current_user_badge}
                          </span>
                        ) : null}
                        {member.status === "pendiente_aprobacion" ? (
                          <span className="rounded-full bg-warning px-2.5 py-1 text-meta font-semibold uppercase tracking-[0.14em] text-accent-foreground">
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

                    <div className="flex shrink-0 items-center gap-2 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
                      {member.status !== "pendiente_aprobacion" ? (
                        <button
                          type="button"
                          onClick={() => setEditingMember(member)}
                          aria-label={texts.settings.club.members.update_roles_cta}
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                        >
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                          </svg>
                        </button>
                      ) : null}

                      <button
                        type="button"
                        onClick={() => setRemovingMembershipId(member.membershipId)}
                        aria-label={isCurrentUser ? texts.settings.club.members.leave_club_cta : texts.settings.club.members.remove_cta}
                        className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-destructive/25 bg-destructive/10 text-destructive transition hover:bg-destructive/15"
                      >
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  {member.status === "pendiente_aprobacion" ? (
                    <div className="mt-4">
                      <form action={approveMembershipAction}>
                        <input type="hidden" name="membership_id" value={member.membershipId} />
                        <input type="hidden" name="role" value={member.roles[0] ?? "secretaria"} />
                        <PendingFieldset className="contents">
                          <PendingSubmitButton
                            idleLabel={texts.settings.club.members.approve_cta}
                            pendingLabel={texts.settings.club.members.approve_loading}
                            className={buttonClass({ fullWidth: true })}
                          />
                        </PendingFieldset>
                      </form>
                    </div>
                  ) : null}
                </article>
              );
            })}
          </div>
        )}
      </SettingsTabShell>

      {/* Modal: Invitar */}
      <Modal
        open={isInviting}
        size="sm"
        title={texts.settings.club.invitations.section_title}
        description={texts.settings.club.invitations.section_description}
        onClose={() => setIsInviting(false)}
      >
        <form action={inviteUserAction} className="grid gap-4">
          <PendingFieldset className="grid gap-4">
            <FormField>
              <FormFieldLabel>{texts.settings.club.invitations.email_label}</FormFieldLabel>
              <FormInput
                type="email"
                name="email"
                placeholder={texts.settings.club.invitations.email_placeholder}
              />
            </FormField>

            <FormField>
              <FormFieldLabel>{texts.settings.club.invitations.role_label}</FormFieldLabel>
              <FormSelect name="role" defaultValue="">
                <option value="" disabled>
                  {texts.settings.club.members.role_placeholder}
                </option>
                {membershipRoles.map((role) => (
                  <option key={role} value={role}>
                    {texts.settings.club.members.roles[role]}
                  </option>
                ))}
              </FormSelect>
            </FormField>

            <ModalFooter
              submitLabel={texts.settings.club.invitations.invite_cta}
              pendingLabel={texts.settings.club.invitations.invite_loading}
            />
          </PendingFieldset>
        </form>
      </Modal>

      {/* Modal: Editar roles */}
      <Modal
        open={editingMember !== null}
        size="md"
        title={texts.settings.club.members.update_roles_cta}
        onClose={() => setEditingMember(null)}
      >
        {editingMember ? (
          <form action={updateMembershipRoleAction} className="grid gap-4">
            <PendingFieldset className="grid gap-4">
              <input type="hidden" name="membership_id" value={editingMember.membershipId} />

              <div className="grid gap-3">
                <FormSection>{texts.settings.club.members.roles_label}</FormSection>
                <div className="grid gap-3 sm:grid-cols-2">
                  {MEMBERSHIP_ROLES.map((role) => (
                    <FormCheckboxCard
                      key={role}
                      id={`modal-${editingMember.membershipId}-${role}`}
                      name="roles"
                      value={role}
                      label={getRoleLabel(role)}
                      defaultChecked={editingMember.roles.includes(role)}
                    />
                  ))}
                </div>
              </div>

              <ModalFooter
                align="end"
                onCancel={() => setEditingMember(null)}
                cancelLabel={texts.settings.club.members.update_roles_cancel_cta}
                submitLabel={texts.settings.club.members.update_roles_cta}
                pendingLabel={texts.settings.club.members.update_roles_loading}
              />
            </PendingFieldset>
          </form>
        ) : null}
      </Modal>

      {/* Modal: Confirmar remover */}
      <Modal
        open={removingMember !== null}
        size="sm"
        title={texts.settings.club.members.remove_dialog_title}
        description={texts.settings.club.members.remove_dialog_description}
        onClose={() => setRemovingMembershipId(null)}
      >
        {removingMember ? (
          <>
            <div className="rounded-card border border-border bg-secondary/40 px-4 py-3">
              <FormSection>{texts.settings.club.members.remove_dialog_member_label}</FormSection>
              <p className="mt-1 font-semibold text-foreground">{removingMember.fullName}</p>
              <p className="text-sm text-muted-foreground">{removingMember.email}</p>
            </div>

            <form action={removeMembershipAction}>
              <PendingFieldset className="contents">
                <input type="hidden" name="membership_id" value={removingMember.membershipId} />
                <ModalFooter
                  onCancel={() => setRemovingMembershipId(null)}
                  cancelLabel={texts.settings.club.members.remove_dialog_cancel_cta}
                  submitLabel={texts.settings.club.members.remove_dialog_confirm_cta}
                  pendingLabel={texts.settings.club.members.remove_loading}
                  submitVariant="destructive"
                />
              </PendingFieldset>
            </form>
          </>
        ) : null}
      </Modal>
    </>
  );
}
