import { redirect } from "next/navigation";

import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canOperateSecretaria } from "@/lib/domain/authorization";
import { getTreasuryAccountDetailForActiveClub } from "@/lib/services/treasury-service";
import { AccountDetailCard } from "@/components/dashboard/account-detail-card";
import { texts } from "@/lib/texts";

type AccountDetailPageProps = {
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

export default async function AccountDetailPage({ params, searchParams }: AccountDetailPageProps) {
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
      detail={accountDetailData.detail}
      accounts={accountDetailData.accounts}
      currentAccountId={params.accountId}
      accountHrefBase="/dashboard/accounts"
      detailPageHref={`/dashboard/accounts/${params.accountId}`}
      currentPage={getCurrentPage(searchParams)}
      secondaryActionHref="/dashboard/secretaria"
      secondaryActionLabel={texts.dashboard.treasury.back_to_secretaria_cta}
    />
  );
}
