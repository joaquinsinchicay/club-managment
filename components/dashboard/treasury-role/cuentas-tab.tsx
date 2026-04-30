import { Button } from "@/components/ui/button";
import { DataTable, DataTableBody } from "@/components/ui/data-table";
import { EditIconButton } from "@/components/ui/edit-icon-button";
import { formatLocalizedAmount } from "@/lib/amounts";
import { texts } from "@/lib/texts";
import {
  type EnrichedDashboardAccount,
  type TotalBalance,
} from "@/lib/treasury-role-helpers";
import { getCurrencySymbol } from "@/lib/treasury-ui-helpers";
import type { TreasuryAccount, TreasuryRoleDashboard } from "@/lib/domain/access";
import { AccountRow } from "./account-row";

export function CuentasTab({
  accounts,
  dashboardAccounts,
  totalBalances,
  isAdmin,
  lastMovementByAccountId,
  onCreateAccount,
  onEditAccount,
}: {
  accounts: TreasuryAccount[];
  dashboardAccounts: TreasuryRoleDashboard["accounts"];
  totalBalances: TotalBalance[];
  isAdmin: boolean;
  lastMovementByAccountId: Record<string, string>;
  onCreateAccount: () => void;
  onEditAccount: (account: TreasuryAccount) => void;
}) {
  const enrichedAccounts: EnrichedDashboardAccount[] = accounts.map((account) => {
    const dashAccount = dashboardAccounts.find((d) => d.accountId === account.id);
    if (dashAccount) {
      return { ...dashAccount, accountType: account.accountType };
    }
    return {
      accountId: account.id,
      name: account.name,
      balances: account.currencies.map((currencyCode) => ({ currencyCode, amount: 0 })),
      hasPendingMovements: false,
      hasConciliatedMovements: false,
      accountType: account.accountType,
    };
  });

  const subtitleParts = [
    `${accounts.length} ${texts.dashboard.treasury_role.accounts_tab_active_label}`,
    ...totalBalances.map(
      (b) =>
        `${b.currencyCode} ${getCurrencySymbol(b.currencyCode)} ${formatLocalizedAmount(b.amount)}`
    ),
  ];

  return (
    <div className="rounded-card border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight text-foreground">
            {texts.dashboard.treasury_role.tab_cuentas}
          </p>
          <p className="text-meta text-muted-foreground">{subtitleParts.join(" · ")}</p>
        </div>
        {isAdmin && (
          <Button
            variant="dark"
            size="sm"
            radius="btn"
            onClick={onCreateAccount}
            className="shrink-0"
          >
            {texts.dashboard.treasury_role.accounts_tab_create_cta}
          </Button>
        )}
      </div>

      {accounts.length === 0 ? (
        <div className="px-4 py-5 text-sm text-muted-foreground">
          {texts.dashboard.treasury_role.empty_accounts}
        </div>
      ) : (
        <DataTable density="compact" className="rounded-none border-0">
          <DataTableBody>
            {enrichedAccounts.map((enriched) => {
              const fullAccount = accounts.find((a) => a.id === enriched.accountId);
              return (
                <AccountRow
                  key={enriched.accountId}
                  account={enriched}
                  fullAccount={fullAccount}
                  lastMovementAt={lastMovementByAccountId[enriched.accountId] ?? null}
                  action={
                    isAdmin && fullAccount ? (
                      <EditIconButton
                        onClick={() => onEditAccount(fullAccount)}
                        label={texts.dashboard.treasury_role.accounts_tab_edit_cta_label}
                      />
                    ) : undefined
                  }
                />
              );
            })}
          </DataTableBody>
        </DataTable>
      )}
    </div>
  );
}
