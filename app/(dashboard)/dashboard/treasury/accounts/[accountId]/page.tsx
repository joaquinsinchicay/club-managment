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
  searchParams?: {
    page?: string;
  };
};

function getCurrentPage(searchParams?: { page?: string }) {
  const rawPage = Number(searchParams?.page ?? "1");

  if (!Number.isFinite(rawPage) || rawPage < 1) {
    return 1;
  }

  return Math.floor(rawPage);
}

export default async function TreasuryAccountDetailPage({
  params,
  searchParams
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
      detail={accountDetailData.detail}
      accounts={accountDetailData.accounts}
      currentAccountId={params.accountId}
      accountHrefBase="/dashboard/treasury/accounts"
      detailPageHref={`/dashboard/treasury/accounts/${params.accountId}`}
      currentPage={getCurrentPage(searchParams)}
      secondaryActionHref="/dashboard/treasury"
      secondaryActionLabel={texts.dashboard.treasury_role.back_to_treasury_cta}
      emptyAccountsLabel={texts.dashboard.treasury_role.empty_accounts}
    />
  );
}
