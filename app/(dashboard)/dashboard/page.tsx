import { redirect } from "next/navigation";

import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";

export default async function DashboardPage() {
  const context = await getAuthenticatedSessionContext();

  if (!context) {
    redirect("/login");
  }

  if (context.activeMemberships.length === 0 || !context.activeClub) {
    redirect("/pending-approval");
  }

  return <DashboardCard context={context} />;
}
