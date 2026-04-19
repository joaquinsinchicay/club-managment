import { redirect } from "next/navigation";

import { DailySessionBalanceCard } from "@/components/dashboard/daily-session-balance-card";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canOperateSecretaria } from "@/lib/domain/authorization";
import { resolveFeedback } from "@/lib/feedback-catalog";
import { getDailyCashSessionValidationForActiveClub } from "@/lib/services/treasury-service";
import { openDailyCashSessionWithBalancesAction } from "@/app/(dashboard)/secretary/session/actions";
import { flashToast } from "@/lib/toast-server";

export default async function OpenDailyCashSessionPage() {
  const context = await getAuthenticatedSessionContext();

  if (!context) {
    redirect("/login");
  }

  if (context.activeMemberships.length === 0 || !context.activeClub || !context.activeMembership) {
    redirect("/pending-approval");
  }

  if (!canOperateSecretaria(context.activeMembership)) {
    redirect("/dashboard");
  }

  const validation = await getDailyCashSessionValidationForActiveClub("open");

  if (!validation) {
    flashToast(resolveFeedback("dashboard", "session_open_failed"));
    redirect("/secretary");
  }

  if (validation.sessionStatus !== "not_started") {
    flashToast(resolveFeedback("dashboard", "session_already_exists"));
    redirect("/secretary");
  }

  return (
    <DailySessionBalanceCard
      validation={validation}
      submitAction={openDailyCashSessionWithBalancesAction}
    />
  );
}
