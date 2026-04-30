import type { ReactNode } from "react";

import { Avatar } from "@/components/ui/avatar";
import { DataTableActions, DataTableRow } from "@/components/ui/data-table";
import { formatLocalizedAmount } from "@/lib/amounts";
import { formatLastMovementDate } from "@/lib/dates";
import { texts } from "@/lib/texts";
import {
  formatAccountIdentifier,
  formatAccountSubtitle,
  type EnrichedDashboardAccount,
} from "@/lib/treasury-role-helpers";
import { getAccountAvatarTone } from "@/lib/treasury-ui-helpers";
import { cn } from "@/lib/utils";
import type { TreasuryAccount, TreasuryAccountType } from "@/lib/domain/access";

export function AccountAvatar({
  name,
  accountType,
}: {
  name: string;
  accountType?: TreasuryAccountType;
}) {
  return (
    <Avatar
      name={name}
      shape="square"
      tone={getAccountAvatarTone(accountType)}
      className="size-9 text-eyebrow tracking-wide"
    />
  );
}

export function AccountRow({
  account,
  action,
  fullAccount,
  lastMovementAt,
}: {
  account: EnrichedDashboardAccount;
  action?: ReactNode;
  fullAccount?: TreasuryAccount;
  lastMovementAt?: string | null;
}) {
  const subtitleLine = fullAccount ? formatAccountSubtitle(fullAccount) : null;
  const accountNumberLine = fullAccount ? formatAccountIdentifier(fullAccount) : null;
  const lastMovementLabel = lastMovementAt ? formatLastMovementDate(lastMovementAt) : null;
  const primaryBalance = account.balances[0];

  return (
    <DataTableRow density="compact" useGrid={false} hoverReveal={Boolean(action)}>
      <div className="flex items-center gap-3">
        <AccountAvatar name={account.name} accountType={account.accountType} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-label tracking-tight text-foreground">{account.name}</p>
          {subtitleLine ? (
            <p className="mt-0.5 truncate text-meta text-muted-foreground">{subtitleLine}</p>
          ) : null}
          {accountNumberLine ? (
            <p className="mt-0.5 truncate text-eyebrow font-medium tracking-wide text-muted-foreground">
              {accountNumberLine}
            </p>
          ) : null}
          {lastMovementLabel !== null && fullAccount ? (
            <p className="mt-0.5 truncate text-eyebrow text-muted-foreground">
              {lastMovementLabel
                ? `${texts.dashboard.treasury_role.last_movement_label}: ${lastMovementLabel}`
                : texts.dashboard.treasury_role.no_movements_yet}
            </p>
          ) : null}
          {account.hasPendingMovements || account.hasConciliatedMovements ? (
            <div className="mt-0.5 flex items-center gap-1">
              <span
                className={cn(
                  "inline-flex size-1.5 rounded-full",
                  account.hasPendingMovements ? "bg-ds-amber" : "bg-ds-green"
                )}
              />
              <span className="text-eyebrow text-muted-foreground">
                {account.hasPendingMovements
                  ? texts.dashboard.treasury_role.conciliation_status_pending
                  : texts.dashboard.treasury_role.conciliation_status_ok}
              </span>
            </div>
          ) : null}
        </div>
        <p className="shrink-0 text-card-title font-bold tabular-nums tracking-tight text-foreground">
          {primaryBalance?.currencyCode === "USD" ? "US$ " : "$ "}
          {formatLocalizedAmount(primaryBalance?.amount ?? 0)}
        </p>
        {action ? <DataTableActions>{action}</DataTableActions> : null}
      </div>
    </DataTableRow>
  );
}
