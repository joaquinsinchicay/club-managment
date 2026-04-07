import { redirect } from "next/navigation";

import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canOperateSecretaria } from "@/lib/domain/authorization";
import { getTreasuryAccountDetailForActiveClub } from "@/lib/services/treasury-service";
import { AccountDetailCard } from "@/components/dashboard/account-detail-card";

type AccountDetailPageProps = {
  params: {
    accountId: string;
  };
};

export default async function AccountDetailPage({ params }: AccountDetailPageProps) {
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

  const accountDetailData = await getTreasuryAccountDetailForActiveClub(params.accountId);

  if (!accountDetailData) {
    redirect("/dashboard");
  }

  return (
    <AccountDetailCard
      context={context}
      detail={accountDetailData.detail}
      accounts={accountDetailData.accounts}
      currentAccountId={params.accountId}
      canCreateMovement={accountDetailData.canCreateMovement}
    />
  );
}
