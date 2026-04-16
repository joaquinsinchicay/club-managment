import type { Membership } from "@/lib/domain/access";
import { hasMembershipRole } from "@/lib/domain/membership-roles";

type MembershipLike = Pick<Membership, "roles" | "status"> | null | undefined;
type ActiveMembershipLike = Exclude<MembershipLike, null | undefined>;

function isActiveMembership(membership: MembershipLike) {
  return membership?.status === "activo";
}

export type ClubSettingsPermissions = {
  canAccessPage: boolean;
  canAccessNavigation: boolean;
  canManageMembers: boolean;
  canAccessTreasury: boolean;
  canMutateTreasury: boolean;
};

function getActiveMembership(membership: MembershipLike): ActiveMembershipLike | null {
  if (!isActiveMembership(membership)) {
    return null;
  }

  return membership as ActiveMembershipLike;
}

export function getClubSettingsPermissions(membership: MembershipLike): ClubSettingsPermissions {
  const activeMembership = getActiveMembership(membership);
  const canManageMembers = Boolean(activeMembership && hasMembershipRole(activeMembership, "admin"));
  const canAccessTreasury = canManageMembers;
  const canAccessPage = canManageMembers;

  return {
    canAccessPage,
    canAccessNavigation: canAccessPage,
    canManageMembers,
    canAccessTreasury,
    canMutateTreasury: canAccessTreasury
  };
}

export function canManageClubMembers(membership: MembershipLike) {
  return getClubSettingsPermissions(membership).canManageMembers;
}

export function canAccessTreasurySettings(membership: MembershipLike) {
  return getClubSettingsPermissions(membership).canAccessTreasury;
}

export function canMutateTreasurySettings(membership: MembershipLike) {
  return getClubSettingsPermissions(membership).canMutateTreasury;
}

export function canOperateTesoreria(membership: MembershipLike) {
  return isActiveMembership(membership) && hasMembershipRole(membership, "tesoreria");
}

export function canAccessDashboardSummary(membership: MembershipLike) {
  const activeMembership = getActiveMembership(membership);

  if (!activeMembership) {
    return false;
  }

  const hasAdminRole = hasMembershipRole(activeMembership, "admin");
  const hasSecretariaRole = hasMembershipRole(activeMembership, "secretaria");
  const hasTesoreriaRole = hasMembershipRole(activeMembership, "tesoreria");

  return !hasSecretariaRole || hasTesoreriaRole || hasAdminRole;
}

export function canAccessClubSettingsPage(membership: MembershipLike) {
  return getClubSettingsPermissions(membership).canAccessPage;
}

export function canAccessClubSettingsNavigation(membership: MembershipLike) {
  return getClubSettingsPermissions(membership).canAccessNavigation;
}

export function canOperateSecretaria(membership: MembershipLike) {
  return isActiveMembership(membership) && hasMembershipRole(membership, "secretaria");
}
