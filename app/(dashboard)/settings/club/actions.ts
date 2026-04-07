"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import {
  approveClubMembership,
  removeClubMembership,
  updateClubMembershipRole
} from "@/lib/services/club-members-service";
import { inviteUserToActiveClub } from "@/lib/services/club-invitations-service";
import {
  createClubActivityForActiveClub,
  createReceiptFormatForActiveClub,
  createTreasuryAccountForActiveClub,
  createTreasuryCategoryForActiveClub,
  updateClubActivityForActiveClub,
  updateReceiptFormatForActiveClub,
  updateTreasuryAccountForActiveClub,
  updateTreasuryCategoryForActiveClub
} from "@/lib/services/treasury-settings-service";
import { clearStoredActiveClubId, storeCurrentActiveClubId } from "@/lib/auth/session";

function redirectToSettings(code: string, tab = "members") {
  revalidatePath("/settings/club");
  redirect(`/settings/club?feedback=${encodeURIComponent(code)}&tab=${encodeURIComponent(tab)}`);
}

export async function approveClubMembershipAction(formData: FormData) {
  const membershipId = String(formData.get("membership_id") ?? "");
  const role = String(formData.get("role") ?? "");
  const result = await approveClubMembership(membershipId, role);

  redirectToSettings(result.code, "members");
}

export async function updateClubMembershipRoleAction(formData: FormData) {
  const membershipId = String(formData.get("membership_id") ?? "");
  const roles = formData
    .getAll("roles")
    .map((value) => String(value))
    .filter(Boolean);
  const result = await updateClubMembershipRole(membershipId, roles);

  redirectToSettings(result.code, "members");
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

  redirectToSettings(result.code, "members");
}

export async function inviteClubUserAction(formData: FormData) {
  const email = String(formData.get("email") ?? "");
  const role = String(formData.get("role") ?? "");
  const result = await inviteUserToActiveClub(email, role);

  redirectToSettings(result.code, "members");
}

export async function createTreasuryAccountAction(formData: FormData) {
  const result = await createTreasuryAccountForActiveClub({
    name: String(formData.get("name") ?? ""),
    accountType: String(formData.get("account_type") ?? ""),
    visibility: formData.getAll("visibility").map((value) => String(value)),
    currencies: formData.getAll("currencies").map((value) => String(value)),
    status: String(formData.get("status") ?? ""),
    emoji: String(formData.get("emoji") ?? "")
  });

  redirectToSettings(result.code, "treasury");
}

export async function updateTreasuryAccountAction(formData: FormData) {
  const result = await updateTreasuryAccountForActiveClub({
    accountId: String(formData.get("account_id") ?? ""),
    name: String(formData.get("name") ?? ""),
    accountType: String(formData.get("account_type") ?? ""),
    visibility: formData.getAll("visibility").map((value) => String(value)),
    currencies: formData.getAll("currencies").map((value) => String(value)),
    status: String(formData.get("status") ?? ""),
    emoji: String(formData.get("emoji") ?? "")
  });

  redirectToSettings(result.code, "treasury");
}

export async function createTreasuryCategoryAction(formData: FormData) {
  const result = await createTreasuryCategoryForActiveClub({
    name: String(formData.get("name") ?? ""),
    visibility: formData.getAll("visibility").map((value) => String(value)),
    status: String(formData.get("status") ?? ""),
    emoji: String(formData.get("emoji") ?? "")
  });

  redirectToSettings(result.code, "treasury");
}

export async function updateTreasuryCategoryAction(formData: FormData) {
  const result = await updateTreasuryCategoryForActiveClub({
    categoryId: String(formData.get("category_id") ?? ""),
    name: String(formData.get("name") ?? ""),
    visibility: formData.getAll("visibility").map((value) => String(value)),
    status: String(formData.get("status") ?? ""),
    emoji: String(formData.get("emoji") ?? "")
  });

  redirectToSettings(result.code, "treasury");
}

export async function createClubActivityAction(formData: FormData) {
  const result = await createClubActivityForActiveClub({
    name: String(formData.get("name") ?? ""),
    status: String(formData.get("status") ?? ""),
    emoji: String(formData.get("emoji") ?? "")
  });

  redirectToSettings(result.code, "treasury");
}

export async function updateClubActivityAction(formData: FormData) {
  const result = await updateClubActivityForActiveClub({
    activityId: String(formData.get("activity_id") ?? ""),
    name: String(formData.get("name") ?? ""),
    status: String(formData.get("status") ?? ""),
    emoji: String(formData.get("emoji") ?? "")
  });

  redirectToSettings(result.code, "treasury");
}

export async function createReceiptFormatAction(formData: FormData) {
  const result = await createReceiptFormatForActiveClub({
    name: String(formData.get("name") ?? ""),
    validationType: String(formData.get("validation_type") ?? ""),
    minNumericValue: String(formData.get("min_numeric_value") ?? ""),
    pattern: String(formData.get("pattern") ?? ""),
    example: String(formData.get("example") ?? ""),
    status: String(formData.get("status") ?? "")
  });

  redirectToSettings(result.code, "treasury");
}

export async function updateReceiptFormatAction(formData: FormData) {
  const result = await updateReceiptFormatForActiveClub({
    receiptFormatId: String(formData.get("receipt_format_id") ?? ""),
    name: String(formData.get("name") ?? ""),
    validationType: String(formData.get("validation_type") ?? ""),
    minNumericValue: String(formData.get("min_numeric_value") ?? ""),
    pattern: String(formData.get("pattern") ?? ""),
    example: String(formData.get("example") ?? ""),
    status: String(formData.get("status") ?? "")
  });

  redirectToSettings(result.code, "treasury");
}
