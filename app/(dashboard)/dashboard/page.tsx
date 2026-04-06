import { redirect } from "next/navigation";

import { setActiveClubAction } from "@/app/(dashboard)/dashboard/actions";
import {
  createTreasuryMovementAction,
} from "@/app/(dashboard)/dashboard/treasury-actions";
import { DashboardCard } from "@/components/dashboard/dashboard-card";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { hasMembershipRole } from "@/lib/domain/membership-roles";
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
  const canOperateTreasury = hasMembershipRole(activeMembership, "secretaria");
  const treasuryAccounts = canOperateTreasury
    ? (await accessRepository.listTreasuryAccountsForClub(context.activeClub.id)).filter(
        (account) => account.accountScope === "secretaria"
      )
    : [];
  const treasuryCategories =
    canOperateTreasury
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
