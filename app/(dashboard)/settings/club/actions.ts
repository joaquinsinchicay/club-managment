"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  approveClubMembership,
  removeClubMembership,
  updateClubMembershipRole
} from "@/lib/services/club-members-service";
import { clearStoredActiveClubId, storeCurrentActiveClubId } from "@/lib/auth/session";

function redirectToSettings(code: string) {
  revalidatePath("/settings/club");
  redirect(`/settings/club?feedback=${code}`);
}

export async function approveClubMembershipAction(formData: FormData) {
  const membershipId = String(formData.get("membership_id") ?? "");
  const role = String(formData.get("role") ?? "");
  const result = await approveClubMembership(membershipId, role);

  redirectToSettings(result.code);
}

export async function updateClubMembershipRoleAction(formData: FormData) {
  const membershipId = String(formData.get("membership_id") ?? "");
  const role = String(formData.get("role") ?? "");
  const result = await updateClubMembershipRole(membershipId, role);

  redirectToSettings(result.code);
}

export async function removeClubMembershipAction(formData: FormData) {
  const membershipId = String(formData.get("membership_id") ?? "");
  const result = await removeClubMembership(membershipId);

  if (result.ok && result.redirectPath) {
    if (result.nextActiveClubId) {
      storeCurrentActiveClubId(result.nextActiveClubId);
    } else {
      clearStoredActiveClubId();
    }

    revalidatePath("/dashboard");
    redirect(result.redirectPath);
  }

  redirectToSettings(result.code);
}
