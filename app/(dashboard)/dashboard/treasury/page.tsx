import { redirect } from "next/navigation";

import { AppHeader } from "@/components/navigation/app-header";
import { TreasuryRoleDashboardCard } from "@/components/dashboard/treasury-role-dashboard-card";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canOperateTesoreria } from "@/lib/domain/authorization";
import { getTreasuryRoleDashboardForActiveClub } from "@/lib/services/treasury-service";

export default async function TreasuryDashboardPage() {
  const context = await getAuthenticatedSessionContext();

  if (!context) {
    redirect("/login");
  }

  if (context.activeMemberships.length === 0 || !context.activeClub || !context.activeMembership) {
    redirect("/pending-approval");
  }

  if (!canOperateTesoreria(context.activeMembership)) {
    redirect("/dashboard");
  }

  const treasuryDashboard = await getTreasuryRoleDashboardForActiveClub();

  if (!treasuryDashboard) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen">
      <AppHeader context={context} />

      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        <TreasuryRoleDashboardCard dashboard={treasuryDashboard} />
      </main>
    </div>
  );
}
