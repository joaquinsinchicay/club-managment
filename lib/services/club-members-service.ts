import type { ClubMember, MembershipRole, PendingClubInvitation } from "@/lib/domain/access";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { accessRepository } from "@/lib/repositories/access-repository";

export type ClubMemberActionCode =
  | "membership_approved"
  | "membership_role_updated"
  | "membership_removed"
  | "self_removed"
  | "forbidden"
  | "invalid_role"
  | "member_not_found"
  | "membership_not_pending"
  | "membership_not_active"
  | "last_admin_required"
  | "unknown_error";

export type ClubMemberActionResult = {
  ok: boolean;
  code: ClubMemberActionCode;
  redirectPath?: string;
  nextActiveClubId?: string | null;
};

const MEMBERSHIP_ROLES: MembershipRole[] = ["admin", "secretaria", "tesoreria"];

function isMembershipRole(role: string): role is MembershipRole {
  return MEMBERSHIP_ROLES.includes(role as MembershipRole);
}

function sortClubMembers(members: ClubMember[]) {
  const statusOrder = {
    pendiente_aprobacion: 0,
    activo: 1,
    inactivo: 2
  } as const;

  return [...members].sort((left, right) => {
    const byStatus = statusOrder[left.status] - statusOrder[right.status];

    if (byStatus !== 0) {
      return byStatus;
    }

    return left.fullName.localeCompare(right.fullName, "es");
  });
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

async function countActiveAdmins(clubId: string) {
  const members = await accessRepository.listClubMembers(clubId);
  return members.filter((member) => member.status === "activo" && member.role === "admin").length;
}

async function resolvePostRemovalRedirect(userId: string): Promise<{
  redirectPath: string;
  nextActiveClubId: string | null;
}> {
  const activeMemberships = await accessRepository.listActiveMembershipsForUser(userId);
  const nextActiveClubId = activeMemberships[0]?.clubId ?? null;

  if (nextActiveClubId) {
    await accessRepository.setLastActiveClubId(userId, nextActiveClubId);

    return {
      redirectPath: "/dashboard",
      nextActiveClubId
    };
  }

  return {
    redirectPath: "/pending-approval",
    nextActiveClubId: null
  };
}

export async function getClubMembersForActiveClub() {
  const context = await getAdminSession();

  if (!context) {
    return null;
  }

  const activeClub = context.activeClub;

  if (!activeClub) {
    return null;
  }

  const [members, pendingInvitations] = await Promise.all([
    accessRepository.listClubMembers(activeClub.id),
    accessRepository.listPendingInvitationsForClub(activeClub.id)
  ]);

  return {
    context,
    members: sortClubMembers(members),
    pendingInvitations: sortPendingInvitations(pendingInvitations)
  };
}

function sortPendingInvitations(invitations: PendingClubInvitation[]) {
  return [...invitations].sort((left, right) =>
    left.email.localeCompare(right.email, "es")
  );
}

export async function approveClubMembership(
  membershipId: string,
  role: string
): Promise<ClubMemberActionResult> {
  const context = await getAdminSession();

  if (!context || !context.activeClub) {
    return { ok: false, code: "forbidden" };
  }

  if (!isMembershipRole(role)) {
    return { ok: false, code: "invalid_role" };
  }

  const members = await accessRepository.listClubMembers(context.activeClub.id);
  const member = members.find((entry) => entry.membershipId === membershipId);

  if (!member) {
    return { ok: false, code: "member_not_found" };
  }

  if (member.status !== "pendiente_aprobacion") {
    return { ok: false, code: "membership_not_pending" };
  }

  const updated = await accessRepository.approveMembership(membershipId, role, context.user.id);

  if (!updated) {
    return { ok: false, code: "unknown_error" };
  }

  return { ok: true, code: "membership_approved" };
}

export async function updateClubMembershipRole(
  membershipId: string,
  role: string
): Promise<ClubMemberActionResult> {
  const context = await getAdminSession();

  if (!context || !context.activeClub) {
    return { ok: false, code: "forbidden" };
  }

  if (!isMembershipRole(role)) {
    return { ok: false, code: "invalid_role" };
  }

  const members = await accessRepository.listClubMembers(context.activeClub.id);
  const member = members.find((entry) => entry.membershipId === membershipId);

  if (!member) {
    return { ok: false, code: "member_not_found" };
  }

  if (member.status !== "activo") {
    return { ok: false, code: "membership_not_active" };
  }

  if (member.role === "admin" && role !== "admin" && (await countActiveAdmins(context.activeClub.id)) <= 1) {
    return { ok: false, code: "last_admin_required" };
  }

  const updated = await accessRepository.updateMembershipRole(membershipId, role);

  if (!updated) {
    return { ok: false, code: "unknown_error" };
  }

  return { ok: true, code: "membership_role_updated" };
}

export async function removeClubMembership(
  membershipId: string
): Promise<ClubMemberActionResult> {
  const session = await getAuthenticatedSessionContext();

  if (!session || !session.activeClub || !session.activeMembership) {
    return { ok: false, code: "forbidden" };
  }

  const members = await accessRepository.listClubMembers(session.activeClub.id);
  const member = members.find((entry) => entry.membershipId === membershipId);

  if (!member) {
    return { ok: false, code: "member_not_found" };
  }

  const isSelfRemoval = member.userId === session.user.id;
  const isAdmin = session.activeMembership.role === "admin" && session.activeMembership.status === "activo";

  if (!isAdmin && !isSelfRemoval) {
    return { ok: false, code: "forbidden" };
  }

  if (member.role === "admin" && member.status === "activo" && (await countActiveAdmins(session.activeClub.id)) <= 1) {
    return { ok: false, code: "last_admin_required" };
  }

  const removed = await accessRepository.removeMembership(membershipId);

  if (!removed) {
    return { ok: false, code: "unknown_error" };
  }

  if (!isSelfRemoval) {
    return { ok: true, code: "membership_removed" };
  }

  const nextDestination = await resolvePostRemovalRedirect(session.user.id);

  return {
    ok: true,
    code: "self_removed",
    redirectPath: nextDestination.redirectPath,
    nextActiveClubId: nextDestination.nextActiveClubId
  };
}
