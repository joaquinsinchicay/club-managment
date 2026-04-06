import { redirect } from "next/navigation";

import { setActiveClubAction } from "@/app/(dashboard)/dashboard/actions";
import {
  createTreasuryMovementAction,
} from "@/app/(dashboard)/dashboard/treasury-actions";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { getDashboardTreasuryCardForActiveClub } from "@/lib/services/treasury-service";
import { accessRepository } from "@/lib/repositories/access-repository";

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

  const activeMembership = context.activeMembership;

  if (!activeMembership) {
    redirect("/pending-approval");
  }

  const treasuryCard = await getDashboardTreasuryCardForActiveClub();
  const treasuryAccounts = activeMembership.role === "secretaria"
    ? (await accessRepository.listTreasuryAccountsForClub(context.activeClub.id)).filter(
        (account) => account.accountScope === "secretaria"
      )
    : [];
  const treasuryCategories =
    activeMembership.role === "secretaria"
      ? await accessRepository.listTreasuryCategoriesForClub(context.activeClub.id)
      : [];

  return (
    <DashboardCard
      context={context}
      feedbackCode={searchParams?.feedback}
      setActiveClubAction={setActiveClubAction}
      treasuryCard={treasuryCard}
      treasuryAccounts={treasuryAccounts}
      treasuryCategories={treasuryCategories}
      createTreasuryMovementAction={createTreasuryMovementAction}
    />
  );
}
