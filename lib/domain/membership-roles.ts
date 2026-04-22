import type { Membership, MembershipRole } from "@/lib/domain/access";
import { texts } from "@/lib/texts";

export const MEMBERSHIP_ROLES: MembershipRole[] = ["admin", "rrhh", "secretaria", "tesoreria"];

export function sortMembershipRoles(roles: MembershipRole[]) {
  const seen = new Set<MembershipRole>();

  return MEMBERSHIP_ROLES.filter((role) => {
    if (!roles.includes(role) || seen.has(role)) {
      return false;
    }

    seen.add(role);
    return true;
  });
}

export function isMembershipRole(role: string): role is MembershipRole {
  return MEMBERSHIP_ROLES.includes(role as MembershipRole);
}

export function hasMembershipRole(
  membership: Pick<Membership, "roles"> | null | undefined,
  role: MembershipRole
) {
  return Boolean(membership?.roles.includes(role));
}

export function hasAnyMembershipRole(
  membership: Pick<Membership, "roles"> | null | undefined,
  roles: MembershipRole[]
) {
  return roles.some((role) => hasMembershipRole(membership, role));
}

export function getMembershipRoleLabels(roles: MembershipRole[]) {
  return sortMembershipRoles(roles).map((role) => texts.settings.club.members.roles[role]);
}

export function formatMembershipRoles(roles: MembershipRole[]) {
  return getMembershipRoleLabels(roles).join(", ");
}
