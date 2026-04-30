import { texts } from "@/lib/texts";
import type { EnrichedDashboardAccount, TotalBalance } from "@/lib/treasury-role-helpers";
import type { TreasuryAccount, TreasuryRoleDashboard } from "@/lib/domain/access";
import { AccountRow } from "./account-row";
import { KpiGrid } from "./kpi-grid";
import { QuickActions } from "./quick-actions";

export function ResumenTab({
  dashboard,
  accounts,
  totalBalances,
  canCreateMovement,
  canCreateFxOperation,
  canCreateTransfer,
  onMovement,
  onFx,
  onTransfer,
  onConciliacion,
  onMovements,
  onViewAllAccounts,
}: {
  dashboard: TreasuryRoleDashboard;
  accounts: TreasuryAccount[];
  totalBalances: TotalBalance[];
  canCreateMovement: boolean;
  canCreateFxOperation: boolean;
  canCreateTransfer: boolean;
  onMovement: () => void;
  onFx: () => void;
  onTransfer: () => void;
  onConciliacion: () => void;
  onMovements: () => void;
  onViewAllAccounts: () => void;
}) {
  // Enrich dashboard accounts with accountType; hide zero-balance accounts
  const enrichedAccounts: EnrichedDashboardAccount[] = dashboard.accounts
    .filter((a) => a.balances.some((b) => b.amount !== 0))
    .map((dashAccount) => {
      const full = accounts.find((a) => a.id === dashAccount.accountId);
      return { ...dashAccount, accountType: full?.accountType };
    });

  return (
    <div className="space-y-3">
      <KpiGrid
        totalBalances={totalBalances}
        accountCount={dashboard.accounts.length}
        monthlyStats={dashboard.monthlyStats}
        pendingConciliationCount={dashboard.pendingConciliationCount}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        {/* Account balances card */}
        <div className="rounded-card border border-border bg-card">
          <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5">
            <div>
              <p className="text-sm font-semibold tracking-tight text-foreground">
                {texts.dashboard.treasury_role.balances_section_title}
              </p>
              <p className="text-meta text-muted-foreground">
                {texts.dashboard.treasury_role.balances_section_description}
              </p>
            </div>
            <button
              type="button"
              onClick={onViewAllAccounts}
              className="shrink-0 rounded-btn border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary-readonly"
            >
              {texts.dashboard.treasury_role.detail_accounts_cta}
            </button>
          </div>
          <div className="px-4">
            {enrichedAccounts.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                {texts.dashboard.treasury_role.empty_accounts}
              </p>
            ) : (
              enrichedAccounts.map((account) => (
                <AccountRow key={account.accountId} account={account} />
              ))
            )}
          </div>
        </div>

        {/* Quick actions */}
        <QuickActions
          canCreateMovement={canCreateMovement}
          canCreateFxOperation={canCreateFxOperation}
          canCreateTransfer={canCreateTransfer}
          pendingConciliationCount={dashboard.pendingConciliationCount}
          onMovement={onMovement}
          onFx={onFx}
          onTransfer={onTransfer}
          onConciliacion={onConciliacion}
          onMovements={onMovements}
        />
      </div>
    </div>
  );
}
