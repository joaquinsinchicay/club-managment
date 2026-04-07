import Link from "next/link";

import type { TreasuryRoleDashboard } from "@/lib/domain/access";
import { CardShell } from "@/components/ui/card-shell";
import { texts } from "@/lib/texts";

type TreasuryRoleDashboardCardProps = {
  dashboard: TreasuryRoleDashboard;
};

export function TreasuryRoleDashboardCard({ dashboard }: TreasuryRoleDashboardCardProps) {
  return (
    <CardShell
      eyebrow={texts.dashboard.treasury_role.eyebrow}
      title={texts.dashboard.treasury_role.title}
      description={texts.dashboard.treasury_role.description}
      className="max-w-4xl"
    >
      <div className="space-y-5">
        {dashboard.accounts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
            {texts.dashboard.treasury_role.empty_accounts}
          </div>
        ) : (
          <div className="grid gap-3">
            {dashboard.accounts.map((account) => (
              <article key={account.accountId} className="rounded-2xl border border-border bg-secondary/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-foreground">{account.name}</p>
                  <Link
                    href={`/dashboard/treasury/accounts/${account.accountId}`}
                    className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                  >
                    {texts.dashboard.treasury_role.detail_cta}
                  </Link>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {account.balances.map((balance) => (
                    <div
                      key={`${account.accountId}-${balance.currencyCode}`}
                      className="rounded-2xl border border-border/60 bg-card px-3 py-2"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {balance.currencyCode}
                      </p>
                      <p className="mt-1 font-medium text-foreground">{balance.amount.toFixed(2)}</p>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </CardShell>
  );
}
