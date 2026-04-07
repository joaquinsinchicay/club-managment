import { redirect } from "next/navigation";

import { AccountDetailCard } from "@/components/dashboard/account-detail-card";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canOperateTesoreria } from "@/lib/domain/authorization";
import { getTreasuryAccountDetailForActiveClub } from "@/lib/services/treasury-service";
import { texts } from "@/lib/texts";

type TreasuryAccountDetailPageProps = {
  params: {
    accountId: string;
  };
};

export default async function TreasuryAccountDetailPage({
  params
}: TreasuryAccountDetailPageProps) {
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

  const accountDetailData = await getTreasuryAccountDetailForActiveClub(params.accountId, "tesoreria");

  if (!accountDetailData) {
    redirect("/dashboard");
  }

  return (
    <AccountDetailCard
      context={context}
      detail={accountDetailData.detail}
      accounts={accountDetailData.accounts}
      currentAccountId={params.accountId}
      canCreateMovement={false}
      accountHrefBase="/dashboard/treasury/accounts"
      secondaryActionHref="/dashboard"
      secondaryActionLabel={texts.dashboard.treasury_role.back_to_dashboard_cta}
      emptyAccountsLabel={texts.dashboard.treasury_role.empty_accounts}
    />
  );
}
