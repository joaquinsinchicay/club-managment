import { redirect } from "next/navigation";

import { DailySessionBalanceCard } from "@/components/dashboard/daily-session-balance-card";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canOperateSecretaria } from "@/lib/domain/authorization";
import { getDailyCashSessionValidationForActiveClub } from "@/lib/services/treasury-service";
import { openDailyCashSessionWithBalancesAction } from "@/app/(dashboard)/dashboard/session/actions";

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

  if (!validation || validation.sessionStatus !== "not_started") {
    redirect("/dashboard?feedback=session_already_exists");
  }

  return (
    <DailySessionBalanceCard
      context={context}
      validation={validation}
      submitAction={openDailyCashSessionWithBalancesAction}
    />
  );
}
