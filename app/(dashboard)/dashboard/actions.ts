"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { storeCurrentActiveClubId } from "@/lib/auth/session";
import { resolveFeedback } from "@/lib/feedback-catalog";
import { setActiveClubForCurrentUser } from "@/lib/services/active-club-service";
import { flashToast } from "@/lib/toast-server";

export async function setActiveClubAction(formData: FormData) {
  const clubId = String(formData.get("club_id") ?? "");
  const result = await setActiveClubForCurrentUser(clubId);

  if (result.ok && result.clubId) {
    storeCurrentActiveClubId(result.clubId);
  }

  revalidatePath("/dashboard");
  revalidatePath("/secretary");
  revalidatePath("/treasury");
  revalidatePath("/settings");

  const code = result.ok ? "active_club_updated" : result.code;
  flashToast(resolveFeedback("dashboard", code));

  redirect("/dashboard");
}
