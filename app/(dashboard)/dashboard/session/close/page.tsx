import { redirect } from "next/navigation";

import { DailySessionBalanceCard } from "@/components/dashboard/daily-session-balance-card";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canOperateSecretaria } from "@/lib/domain/authorization";
import { getDailyCashSessionValidationForActiveClub } from "@/lib/services/treasury-service";
import { closeDailyCashSessionWithBalancesAction } from "@/app/(dashboard)/dashboard/session/actions";

export default async function CloseDailyCashSessionPage() {
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

  const validation = await getDailyCashSessionValidationForActiveClub("close");

  if (!validation || validation.sessionStatus !== "open") {
    redirect("/dashboard?feedback=session_not_open");
  }

  return (
    <DailySessionBalanceCard
      validation={validation}
      submitAction={closeDailyCashSessionWithBalancesAction}
    />
  );
}
