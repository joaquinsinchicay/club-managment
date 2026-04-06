"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { storeCurrentActiveClubId } from "@/lib/auth/session";
import { setActiveClubForCurrentUser } from "@/lib/services/active-club-service";

export async function setActiveClubAction(formData: FormData) {
  const clubId = String(formData.get("club_id") ?? "");
  const result = await setActiveClubForCurrentUser(clubId);

  if (result.ok && result.clubId) {
    storeCurrentActiveClubId(result.clubId);
  }

  revalidatePath("/dashboard");
  revalidatePath("/settings/club");

  if (!result.ok) {
    redirect(`/dashboard?feedback=${result.code}`);
  }

  redirect("/dashboard?feedback=active_club_updated");
}
