import type { Membership } from "@/lib/domain/access";
import { hasAnyMembershipRole, hasMembershipRole } from "@/lib/domain/membership-roles";

type MembershipLike = Pick<Membership, "roles" | "status"> | null | undefined;

function isActiveMembership(membership: MembershipLike) {
  return membership?.status === "activo";
}

export function canManageClubMembers(membership: MembershipLike) {
  return isActiveMembership(membership) && hasMembershipRole(membership, "admin");
}

export function canAccessTreasurySettings(membership: MembershipLike) {
  return isActiveMembership(membership) && hasMembershipRole(membership, "tesoreria");
}

export function canAccessClubSettingsPage(membership: MembershipLike) {
  return (
    isActiveMembership(membership) &&
    hasAnyMembershipRole(membership, ["admin", "tesoreria"])
  );
}

export function canAccessClubSettingsNavigation(membership: MembershipLike) {
  return canAccessClubSettingsPage(membership);
}

export function canOperateSecretaria(membership: MembershipLike) {
  return isActiveMembership(membership) && hasMembershipRole(membership, "secretaria");
}
