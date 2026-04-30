import { formatLocalizedDateLabel } from "@/lib/dates";
import { texts } from "@/lib/texts";
import type {
  TreasuryAccount,
  TreasuryAccountType,
  TreasuryDashboardMovement,
  TreasuryRoleDashboard,
  TreasuryRoleDashboardMovementDateGroup,
} from "@/lib/domain/access";

export type SubTab =
  | "resumen"
  | "payroll"
  | "cuentas"
  | "movimientos"
  | "conciliacion"
  | "cost_centers";

export type TotalBalance = {
  currencyCode: string;
  amount: number;
};

export type EnrichedDashboardAccount = TreasuryRoleDashboard["accounts"][number] & {
  accountType?: TreasuryAccountType;
};

export const DEFAULT_MOVEMENTS_WINDOW_DAYS = 30;

export function getTotalBalances(accounts: TreasuryRoleDashboard["accounts"]): TotalBalance[] {
  const totals = new Map<string, number>();

  accounts.forEach((account) => {
    account.balances.forEach((balance) => {
      totals.set(balance.currencyCode, (totals.get(balance.currencyCode) ?? 0) + balance.amount);
    });
  });

  return [...totals.entries()]
    .map(([currencyCode, amount]) => ({ currencyCode, amount }))
    .sort((left, right) => {
      if (left.currencyCode === "ARS") return -1;
      if (right.currencyCode === "ARS") return 1;
      return left.currencyCode.localeCompare(right.currencyCode);
    });
}

export function getMovementGroupsForAccount(
  groups: TreasuryRoleDashboardMovementDateGroup[],
  accountId: string | null
) {
  if (!accountId) return [];

  return groups
    .map((group) => {
      const accountGroup = group.accounts.find((entry) => entry.accountId === accountId);
      if (!accountGroup) return null;
      return { movementDate: group.movementDate, movements: accountGroup.movements };
    })
    .filter(
      (group): group is { movementDate: string; movements: TreasuryDashboardMovement[] } =>
        group !== null
    );
}

export function getAllMovementGroups(groups: TreasuryRoleDashboardMovementDateGroup[]) {
  return groups.map((group) => ({
    movementDate: group.movementDate,
    movements: group.accounts.flatMap((a) => a.movements),
  }));
}

export function formatAccountSubtitle(account: TreasuryAccount): string | null {
  const parts: Array<string | null | undefined> = [];

  if (account.accountType === "bancaria") {
    parts.push(account.bankEntity);
    if (account.bankAccountSubtype) {
      parts.push(texts.settings.club.treasury.bank_account_subtypes[account.bankAccountSubtype]);
    }
  } else if (account.accountType === "billetera_virtual") {
    parts.push(account.bankEntity);
  } else {
    parts.push(texts.dashboard.treasury_role.cash_account_label);
  }

  if (account.currencies.length === 1) {
    parts.push(account.currencies[0]);
  }

  if (account.visibleForSecretaria && !account.visibleForTesoreria) {
    parts.push(texts.dashboard.treasury_role.operated_by_secretaria);
  }

  const cleaned = parts.filter((part): part is string => Boolean(part));
  return cleaned.length ? cleaned.join(" · ") : null;
}

export function formatAccountIdentifier(account: TreasuryAccount): string | null {
  if (!account.cbuCvu && !account.accountNumber) return null;
  const identifier = account.cbuCvu ?? account.accountNumber ?? "";
  if (!identifier) return null;

  if (account.accountType === "bancaria") return `CBU ${identifier}`;
  if (account.accountType === "billetera_virtual") return `CVU ${identifier}`;
  return identifier;
}

export function buildLastMovementByAccountId(
  groups: TreasuryRoleDashboardMovementDateGroup[]
): Record<string, string> {
  const latest: Record<string, string> = {};
  for (const group of groups) {
    for (const accountGroup of group.accounts) {
      for (const movement of accountGroup.movements) {
        const current = latest[accountGroup.accountId];
        if (!current || movement.createdAt > current) {
          latest[accountGroup.accountId] = movement.createdAt;
        }
      }
    }
  }
  return latest;
}

export function diffDaysInclusive(fromDate: string, toDate: string) {
  const from = new Date(`${fromDate}T00:00:00`);
  const to = new Date(`${toDate}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  return Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1;
}

export function buildMovementsWindowSubtitle(window: TreasuryRoleDashboard["movementsWindow"]) {
  const days = diffDaysInclusive(window.fromDate, window.toDate);
  const isDefault = days === DEFAULT_MOVEMENTS_WINDOW_DAYS;
  const rangeLabel = isDefault
    ? texts.dashboard.treasury_role.movements_window_default_days_label.replace(
        "{days}",
        String(DEFAULT_MOVEMENTS_WINDOW_DAYS)
      )
    : texts.dashboard.treasury_role.movements_window_custom_label
        .replace("{from}", formatLocalizedDateLabel(window.fromDate))
        .replace("{to}", formatLocalizedDateLabel(window.toDate));

  const countLabel =
    window.count === 1
      ? texts.dashboard.treasury_role.movements_window_count_singular
      : texts.dashboard.treasury_role.movements_window_count_plural.replace(
          "{count}",
          String(window.count)
        );

  return `${rangeLabel}${texts.dashboard.treasury_role.movements_window_separator}${countLabel}`;
}
