import type { MembershipRole } from "@/lib/domain/access";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { accessRepository } from "@/lib/repositories/access-repository";

const MEMBERSHIP_ROLES: MembershipRole[] = ["admin", "secretaria", "tesoreria"];
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type ClubInvitationActionCode =
  | "invitation_created"
  | "already_member"
  | "already_invited"
  | "email_required"
  | "email_invalid"
  | "role_required"
  | "invalid_role"
  | "forbidden"
  | "unknown_error";

export type ClubInvitationActionResult = {
  ok: boolean;
  code: ClubInvitationActionCode;
};

function isMembershipRole(role: string): role is MembershipRole {
  return MEMBERSHIP_ROLES.includes(role as MembershipRole);
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

async function getAdminSession() {
  const context = await getAuthenticatedSessionContext();

  if (!context || !context.activeClub || !context.activeMembership) {
    return null;
  }

  if (context.activeMembership.role !== "admin" || context.activeMembership.status !== "activo") {
    return null;
  }

  return context;
}

export async function inviteUserToActiveClub(
  email: string,
  role: string
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

  if (!role) {
    return { ok: false, code: "role_required" };
  }

  if (!isMembershipRole(role)) {
    return { ok: false, code: "invalid_role" };
  }

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

  const invitation = await accessRepository.createClubInvitation(
    context.activeClub.id,
    normalizedEmail,
    role
  );

  if (!invitation) {
    return { ok: false, code: "unknown_error" };
  }

  return { ok: true, code: "invitation_created" };
}

export async function processPendingInvitationsForUser(userId: string, email: string) {
  const normalizedEmail = normalizeEmail(email);
  const invitations = await accessRepository.listPendingInvitationsByEmail(normalizedEmail);

  if (invitations.length === 0) {
    return [];
  }

  const currentMemberships = await accessRepository.listMembershipsForUser(userId);
  const currentClubIds = new Set(currentMemberships.map((membership) => membership.clubId));
  const activatedClubIds: string[] = [];

  for (const invitation of invitations) {
    if (!currentClubIds.has(invitation.clubId)) {
      const createdMembership = await accessRepository.createMembership(
        userId,
        invitation.clubId,
        invitation.role,
        "activo",
        null
      );

      if (createdMembership) {
        activatedClubIds.push(invitation.clubId);
        currentClubIds.add(invitation.clubId);
      }
    }

    await accessRepository.markInvitationAsUsed(invitation.id);
  }

  return activatedClubIds;
}
