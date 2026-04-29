"use client";

import Image from "next/image";
import { useMemo, useState } from "react";

import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Chip, ChipButton } from "@/components/ui/chip";
import {
  DataTable,
  DataTableActions,
  DataTableBody,
  DataTableEmpty,
  DataTableRow,
} from "@/components/ui/data-table";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/ui/status-badge";
import { ModalFooter } from "@/components/ui/modal-footer";
import {
  FormBanner,
  FormCheckboxCard,
  FormField,
  FormFieldLabel,
  FormInput,
  FormSection,
} from "@/components/ui/modal-form";
import { PendingFieldset } from "@/components/ui/pending-form";
import { MEMBERSHIP_ROLES } from "@/lib/domain/membership-roles";
import { texts } from "@/lib/texts";
import { cn } from "@/lib/utils";
import type {
  ClubMember,
  MembershipRole,
  PendingClubInvitation,
} from "@/lib/domain/access";

function getRoleLabel(role: MembershipRole) {
  return texts.settings.club.members.roles[role];
}

type DisplayMember = {
  key: string;
  membershipId: string | null;
  invitationId: string | null;
  fullName: string | null;
  email: string;
  roles: MembershipRole[];
  avatarUrl: string | null;
  isCurrentUser: boolean;
  source: "member" | "invitation";
};

type FilterValue = "all" | MembershipRole;

type MembersTabProps = {
  members: ClubMember[];
  pendingInvitations: PendingClubInvitation[];
  currentUserId: string;
  clubName: string;
  createUserAction: (formData: FormData) => Promise<void>;
  updateMembershipRoleAction: (formData: FormData) => Promise<void>;
  removeMembershipAction: (formData: FormData) => Promise<void>;
};

export function MembersTab({
  members,
  pendingInvitations,
  currentUserId,
  clubName,
  createUserAction,
  updateMembershipRoleAction,
  removeMembershipAction,
}: MembersTabProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [editingMember, setEditingMember] = useState<ClubMember | null>(null);
  const [removingMembershipId, setRemovingMembershipId] = useState<string | null>(null);
  const [filter, setFilter] = useState<FilterValue>("all");

  async function handleCreate(formData: FormData) {
    setIsCreating(false);
    await createUserAction(formData);
  }

  async function handleUpdateRoles(formData: FormData) {
    setEditingMember(null);
    await updateMembershipRoleAction(formData);
  }

  async function handleRemoveMembership(formData: FormData) {
    setRemovingMembershipId(null);
    await removeMembershipAction(formData);
  }

  const removingMember = useMemo(
    () => members.find((m) => m.membershipId === removingMembershipId) ?? null,
    [members, removingMembershipId],
  );

  const activeAdminCount = useMemo(
    () => members.filter((m) => m.roles.includes("admin")).length,
    [members],
  );

  function isLastAdmin(member: { roles: MembershipRole[] } | null): boolean {
    if (!member) return false;
    return activeAdminCount === 1 && member.roles.includes("admin");
  }

  const editingIsLastAdmin = isLastAdmin(editingMember);
  const removingIsLastAdmin = isLastAdmin(removingMember);

  const displayMembers = useMemo<DisplayMember[]>(() => {
    const invitationsByEmail = new Map<string, PendingClubInvitation[]>();
    for (const invitation of pendingInvitations) {
      const list = invitationsByEmail.get(invitation.email.toLowerCase()) ?? [];
      list.push(invitation);
      invitationsByEmail.set(invitation.email.toLowerCase(), list);
    }

    const memberRows: DisplayMember[] = members.map((member) => ({
      key: `member-${member.membershipId}`,
      membershipId: member.membershipId,
      invitationId: null,
      fullName: member.fullName,
      email: member.email,
      roles: member.roles,
      avatarUrl: member.avatarUrl ?? null,
      isCurrentUser: member.userId === currentUserId,
      source: "member",
    }));

    const invitationRows: DisplayMember[] = [];
    for (const [email, invitations] of invitationsByEmail) {
      const sortedRoles: MembershipRole[] = [];
      for (const inv of invitations) {
        if (!sortedRoles.includes(inv.role)) sortedRoles.push(inv.role);
      }
      invitationRows.push({
        key: `invitation-${email}`,
        membershipId: null,
        invitationId: invitations[0].invitationId,
        fullName: null,
        email: invitations[0].email,
        roles: sortedRoles,
        avatarUrl: null,
        isCurrentUser: false,
        source: "invitation",
      });
    }

    return [...memberRows, ...invitationRows];
  }, [members, pendingInvitations, currentUserId]);

  const counts = useMemo(() => {
    const result: Record<FilterValue, number> = {
      all: displayMembers.length,
      admin: 0,
      rrhh: 0,
      secretaria: 0,
      tesoreria: 0,
    };
    for (const m of displayMembers) {
      for (const role of m.roles) {
        result[role] += 1;
      }
    }
    return result;
  }, [displayMembers]);

  const filteredMembers = useMemo(() => {
    if (filter === "all") return displayMembers;
    return displayMembers.filter((m) => m.roles.includes(filter));
  }, [displayMembers, filter]);

  const activeCount = displayMembers.length;
  const sectionDescription =
    activeCount === 1
      ? texts.settings.club.members.section_description_singular
      : texts.settings.club.members.section_description_plural.replace(
          "{count}",
          String(activeCount),
        );

  const filterOptions: { value: FilterValue; label: string }[] = [
    { value: "all", label: texts.settings.club.members.filter_all_label },
    { value: "admin", label: getRoleLabel("admin") },
    { value: "tesoreria", label: getRoleLabel("tesoreria") },
    { value: "secretaria", label: getRoleLabel("secretaria") },
    { value: "rrhh", label: getRoleLabel("rrhh") },
  ];

  const infoBannerText = texts.settings.club.members.info_banner.replace(
    "{clubName}",
    clubName,
  );
  const clubNameMatch = infoBannerText.indexOf(clubName);

  return (
    <>
      <div className="flex flex-col gap-4">
        <FormBanner variant="info" icon="i">
          {clubName && clubNameMatch >= 0 ? (
            <>
              {infoBannerText.slice(0, clubNameMatch)}
              <strong className="font-semibold">{clubName}</strong>
              {infoBannerText.slice(clubNameMatch + clubName.length)}
            </>
          ) : (
            infoBannerText
          )}
        </FormBanner>

        <Card padding="comfortable">
          <CardHeader
          title={texts.settings.club.members.section_title}
          description={sectionDescription}
          action={
            <Button onClick={() => setIsCreating(true)}>
              {texts.settings.club.invitations.toggle_cta}
            </Button>
          }
        />

        <CardBody className="mt-5">
          <div role="tablist" aria-label={texts.settings.club.members.section_title} className="flex flex-wrap gap-2">
            {filterOptions.map((option) => (
              <ChipButton
                key={option.value}
                active={filter === option.value}
                onClick={() => setFilter(option.value)}
                role="tab"
              >
                {option.label} ({counts[option.value]})
              </ChipButton>
            ))}
          </div>

          {filteredMembers.length === 0 ? (
            <DataTableEmpty
              title={texts.settings.club.members.empty_title}
              description={texts.settings.club.members.empty_description}
            />
          ) : (
            <DataTable density="comfortable">
              <DataTableBody>
                {filteredMembers.map((member) => (
                  <DataTableRow
                    key={member.key}
                    as="article"
                    density="comfortable"
                    useGrid={false}
                    hoverReveal
                  >
                    <div className="flex items-start gap-4">
                      {member.avatarUrl ? (
                        <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-card">
                          <Image
                            src={member.avatarUrl}
                            alt=""
                            width={48}
                            height={48}
                            unoptimized
                            className="h-12 w-12 object-cover"
                          />
                        </span>
                      ) : (
                        <Avatar
                          name={member.fullName ?? member.email}
                          email={member.email}
                          size="lg"
                        />
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="truncate text-base font-semibold text-foreground">
                            {member.fullName ?? member.email}
                          </p>
                          {member.isCurrentUser ? (
                            <StatusBadge
                              label={texts.settings.club.members.current_user_badge}
                              tone="accent"
                            />
                          ) : null}
                        </div>

                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          {member.roles.map((role) => (
                            <Chip key={role} tone="neutral" size="md">
                              {getRoleLabel(role)}
                            </Chip>
                          ))}
                          {member.fullName ? (
                            <span className="truncate text-sm text-muted-foreground">
                              · {member.email}
                            </span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-meta font-semibold uppercase tracking-card-eyebrow",
                            "border-success/20 bg-success/10 text-success",
                          )}
                        >
                          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success" />
                          {texts.settings.club.members.active_status_label}
                        </span>

                        {member.source === "member" && member.membershipId ? (
                          <DataTableActions>
                            <button
                              type="button"
                              onClick={() => {
                                const target = members.find(
                                  (m) => m.membershipId === member.membershipId,
                                );
                                if (target) setEditingMember(target);
                              }}
                              aria-label={texts.settings.club.members.update_roles_cta}
                              className="inline-flex h-10 w-10 items-center justify-center rounded-btn border border-border bg-card text-muted-foreground transition hover:bg-secondary hover:text-foreground"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                                />
                              </svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => setRemovingMembershipId(member.membershipId)}
                              disabled={isLastAdmin(member)}
                              aria-label={
                                member.isCurrentUser
                                  ? texts.settings.club.members.leave_club_cta
                                  : texts.settings.club.members.remove_cta
                              }
                              title={
                                isLastAdmin(member)
                                  ? texts.settings.club.members.feedback.last_admin_required
                                  : undefined
                              }
                              className="inline-flex h-10 w-10 items-center justify-center rounded-btn border border-destructive/25 bg-destructive/10 text-destructive transition hover:bg-destructive/15 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-destructive/10"
                            >
                              <svg
                                className="h-4 w-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                />
                              </svg>
                            </button>
                          </DataTableActions>
                        ) : null}
                      </div>
                    </div>
                  </DataTableRow>
                ))}
              </DataTableBody>
            </DataTable>
          )}
          </CardBody>
        </Card>
      </div>

      {/* Modal: Crear usuario */}
      <Modal
        open={isCreating}
        size="md"
        title={texts.settings.club.invitations.section_title}
        description={texts.settings.club.invitations.section_description}
        onClose={() => setIsCreating(false)}
      >
        <form action={handleCreate} className="grid gap-4">
          <PendingFieldset className="grid gap-4">
            <FormField>
              <FormFieldLabel>{texts.settings.club.invitations.email_label}</FormFieldLabel>
              <FormInput
                type="email"
                name="email"
                placeholder={texts.settings.club.invitations.email_placeholder}
              />
            </FormField>

            <div className="grid gap-3">
              <FormSection>{texts.settings.club.invitations.roles_label}</FormSection>
              <div className="grid gap-3 sm:grid-cols-2">
                {MEMBERSHIP_ROLES.map((role) => (
                  <FormCheckboxCard
                    key={role}
                    id={`create-user-${role}`}
                    name="roles"
                    value={role}
                    label={getRoleLabel(role)}
                  />
                ))}
              </div>
            </div>

            <ModalFooter
              onCancel={() => setIsCreating(false)}
              cancelLabel={texts.settings.club.invitations.cancel_cta}
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
          <form action={handleUpdateRoles} className="grid gap-4">
            <PendingFieldset className="grid gap-4">
              <input type="hidden" name="membership_id" value={editingMember.membershipId} />

              {editingIsLastAdmin ? (
                <FormBanner variant="warning">
                  {texts.settings.club.members.feedback.last_admin_required}
                </FormBanner>
              ) : null}

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
                      disabled={role === "admin" && editingIsLastAdmin}
                    />
                  ))}
                </div>
              </div>

              <ModalFooter
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
            {removingIsLastAdmin ? (
              <FormBanner variant="warning">
                {texts.settings.club.members.feedback.last_admin_required}
              </FormBanner>
            ) : null}

            <div className="rounded-card border border-border bg-secondary/40 px-4 py-3">
              <FormSection>{texts.settings.club.members.remove_dialog_member_label}</FormSection>
              <p className="mt-1 font-semibold text-foreground">{removingMember.fullName}</p>
              <p className="text-sm text-muted-foreground">{removingMember.email}</p>
            </div>

            <form action={handleRemoveMembership}>
              <PendingFieldset className="contents">
                <input type="hidden" name="membership_id" value={removingMember.membershipId} />
                <ModalFooter
                  onCancel={() => setRemovingMembershipId(null)}
                  cancelLabel={texts.settings.club.members.remove_dialog_cancel_cta}
                  submitLabel={texts.settings.club.members.remove_dialog_confirm_cta}
                  pendingLabel={texts.settings.club.members.remove_loading}
                  submitVariant="destructive"
                  submitDisabled={removingIsLastAdmin}
                />
              </PendingFieldset>
            </form>
          </>
        ) : null}
      </Modal>
    </>
  );
}
