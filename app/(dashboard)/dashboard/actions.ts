"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

import { storeCurrentActiveClubId } from "@/lib/auth/session";
import { resolveFeedback } from "@/lib/feedback-catalog";
import { logger } from "@/lib/logger";
import { setActiveClubForCurrentUser } from "@/lib/services/active-club-service";
import { flashToast } from "@/lib/toast-server";
import { setActiveClubSchema } from "@/lib/validators/dashboard";
import { parseFormData } from "@/lib/validators/server-action";

export async function setActiveClubAction(formData: FormData) {
  const parsed = parseFormData(formData, setActiveClubSchema);
  if (!parsed.ok) {
    logger.warn("[dashboard-actions.set-active-club] validation failed", {
      error: parsed.firstError,
    });
    flashToast(resolveFeedback("dashboard", "validation_error"));
    redirect("/dashboard");
  }

  const result = await setActiveClubForCurrentUser(parsed.data.club_id);

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
