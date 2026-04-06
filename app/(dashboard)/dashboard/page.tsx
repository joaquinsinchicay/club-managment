import { redirect } from "next/navigation";

import { setActiveClubAction } from "@/app/(dashboard)/dashboard/actions";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";

type DashboardPageProps = {
  searchParams?: {
    feedback?: string;
  };
};

export default async function DashboardPage({ searchParams }: DashboardPageProps) {
  const context = await getAuthenticatedSessionContext();

  if (!context) {
    redirect("/login");
  }

  if (context.activeMemberships.length === 0 || !context.activeClub) {
    redirect("/pending-approval");
  }

  return (
    <DashboardCard
      context={context}
      feedbackCode={searchParams?.feedback}
      setActiveClubAction={setActiveClubAction}
    />
  );
}
