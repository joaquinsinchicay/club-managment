import type { MembershipRole } from "@/lib/domain/access";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { hasMembershipRole, isMembershipRole, sortMembershipRoles } from "@/lib/domain/membership-roles";
import { accessRepository } from "@/lib/repositories/access-repository";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ClubInvitationActionCode =
  | "invitation_created"
  | "already_member"
  | "already_invited"
  | "email_required"
  | "email_invalid"
  | "role_required"
  | "roles_required"
  | "invalid_role"
  | "forbidden"
  | "unknown_error";

export type ClubInvitationActionResult = {
  ok: boolean;
  code: ClubInvitationActionCode;
};

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function getAdminSession() {
  const context = await getAuthenticatedSessionContext();

  if (!context || !context.activeClub || !context.activeMembership) {
    return null;
  }

  if (!hasMembershipRole(context.activeMembership, "admin") || context.activeMembership.status !== "activo") {
    return null;
  }

  return context;
}

export async function createClubUser(
  email: string,
  roles: string[]
): Promise<ClubInvitationActionResult> {
  const context = await getAdminSession();

  if (!context || !context.activeClub) {
    return { ok: false, code: "forbidden" };
  }

  const normalizedEmail = normalizeEmail(email);

  if (!normalizedEmail) {
    return { ok: false, code: "email_required" };
  }

  if (!EMAIL_PATTERN.test(normalizedEmail)) {
    return { ok: false, code: "email_invalid" };
  }

  if (!roles || roles.length === 0) {
    return { ok: false, code: "roles_required" };
  }

  const validatedRoles: MembershipRole[] = [];
  for (const role of roles) {
    if (!role) continue;
    if (!isMembershipRole(role)) {
      return { ok: false, code: "invalid_role" };
    }
    if (!validatedRoles.includes(role)) {
      validatedRoles.push(role);
    }
  }

  if (validatedRoles.length === 0) {
    return { ok: false, code: "roles_required" };
  }

  const sortedRoles = sortMembershipRoles(validatedRoles);

  const members = await accessRepository.listClubMembers(context.activeClub.id);
  const alreadyMember = members.some((member) => member.email.toLowerCase() === normalizedEmail);

  if (alreadyMember) {
    return { ok: false, code: "already_member" };
  }

  const pendingInvitations = await accessRepository.listPendingInvitationsByEmail(normalizedEmail);
  const alreadyInvited = pendingInvitations.some(
    (invitation) => invitation.clubId === context.activeClub?.id
  );

  if (alreadyInvited) {
    return { ok: false, code: "already_invited" };
  }

  for (const role of sortedRoles) {
    const invitation = await accessRepository.createClubInvitation(
      context.activeClub.id,
      normalizedEmail,
      role
    );

    if (!invitation) {
      return { ok: false, code: "unknown_error" };
    }
  }

  return { ok: true, code: "invitation_created" };
}

/**
 * @deprecated Use `createClubUser(email, roles[])` instead. Kept as alias for compatibility.
 */
export async function inviteUserToActiveClub(
  email: string,
  role: string
): Promise<ClubInvitationActionResult> {
  return createClubUser(email, role ? [role] : []);
}

export async function processPendingInvitationsForUser(userId: string, email: string) {
  const normalizedEmail = normalizeEmail(email);
  const invitations = await accessRepository.listPendingInvitationsByEmail(normalizedEmail);

  if (invitations.length === 0) {
    return [];
  }

  const groupedByClub = new Map<string, { roles: MembershipRole[]; invitationIds: string[] }>();
  for (const invitation of invitations) {
    const entry = groupedByClub.get(invitation.clubId) ?? { roles: [], invitationIds: [] };
    if (!entry.roles.includes(invitation.role)) {
      entry.roles.push(invitation.role);
    }
    entry.invitationIds.push(invitation.id);
    groupedByClub.set(invitation.clubId, entry);
  }

  const currentMemberships = await accessRepository.listMembershipsForUser(userId);
  const membershipByClubId = new Map(
    currentMemberships.map((membership) => [membership.clubId, membership])
  );
  const activatedClubIds: string[] = [];

  for (const [clubId, group] of groupedByClub) {
    const sortedRoles = sortMembershipRoles(group.roles);
    const primaryRole = sortedRoles[0];
    let membership = membershipByClubId.get(clubId) ?? null;

    if (!membership && primaryRole) {
      const created = await accessRepository.createMembership(
        userId,
        clubId,
        primaryRole,
        "activo",
        null
      );

      if (created) {
        membership = created;
        activatedClubIds.push(clubId);
      }
    }

    if (membership && sortedRoles.length > 1) {
      const mergedRoles = sortMembershipRoles(
        Array.from(new Set<MembershipRole>([...membership.roles, ...sortedRoles]))
      );
      const sameRoles =
        mergedRoles.length === membership.roles.length &&
        mergedRoles.every((role, index) => role === membership.roles[index]);
      if (!sameRoles) {
        await accessRepository.updateMembershipRoles(membership.id, mergedRoles);
      }
    }

    for (const invitationId of group.invitationIds) {
      await accessRepository.markInvitationAsUsed(invitationId);
    }
  }

  return activatedClubIds;
}
