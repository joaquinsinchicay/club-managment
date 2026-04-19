"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useState, type ReactNode } from "react";

import { SecretariaMovementList } from "@/components/dashboard/secretaria-movement-list";
import {
  AccountTransferForm,
  SecretariaMovementEditForm,
  TreasuryRoleFxForm,
  TreasuryRoleMovementForm
} from "@/components/dashboard/treasury-operation-forms";
import { TreasuryAccountForm } from "@/components/treasury/account-form";
import { EditIconButton } from "@/components/ui/edit-icon-button";
import { Modal } from "@/components/ui/modal";
import { NavigationLinkWithLoader } from "@/components/ui/navigation-link-with-loader";
import { BlockingStatusOverlay } from "@/components/ui/overlay";
import { formatLocalizedAmount } from "@/lib/amounts";
import type { TreasuryActionResponse } from "@/app/(dashboard)/dashboard/treasury-actions";
import type {
  ClubActivity,
  ClubCalendarEvent,
  ReceiptFormat,
  TreasuryAccount,
  TreasuryAccountType,
  TreasuryCategory,
  TreasuryCurrencyConfig,
  TreasuryDashboardMovement,
  TreasuryMovementType,
  TreasuryRoleDashboardMovementDateGroup,
  TreasuryRoleDashboard
} from "@/lib/domain/access";
import { texts } from "@/lib/texts";
import { cn } from "@/lib/utils";

type TreasuryRoleCardProps = {
  dashboard: TreasuryRoleDashboard;
  accounts: TreasuryAccount[];
  categories: TreasuryCategory[];
  activities: ClubActivity[];
  calendarEvents: ClubCalendarEvent[];
  currencies: TreasuryCurrencyConfig[];
  movementTypes: TreasuryMovementType[];
  receiptFormats: ReceiptFormat[];
  createTreasuryRoleMovementAction: (formData: FormData) => Promise<TreasuryActionResponse>;
  updateTreasuryRoleMovementAction: (formData: FormData) => Promise<TreasuryActionResponse>;
  createFxOperationAction: (formData: FormData) => Promise<TreasuryActionResponse>;
  createAccountTransferAction: (formData: FormData) => Promise<TreasuryActionResponse>;
  createTreasuryAccountAction: (formData: FormData) => Promise<TreasuryActionResponse>;
  updateTreasuryAccountAction: (formData: FormData) => Promise<TreasuryActionResponse>;
  allAccounts: TreasuryAccount[];
  isAdmin: boolean;
};

type SubTab = "resumen" | "cuentas" | "movimientos" | "conciliacion";

type TotalBalance = {
  currencyCode: string;
  amount: number;
};

function getTotalBalances(accounts: TreasuryRoleDashboard["accounts"]): TotalBalance[] {
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

function getMovementGroupsForAccount(
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

function getAllMovementGroups(groups: TreasuryRoleDashboardMovementDateGroup[]) {
  return groups.map((group) => ({
    movementDate: group.movementDate,
    movements: group.accounts.flatMap((a) => a.movements)
  }));
}

function formatMovementGroupDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "long" }).format(date);
}

function formatLastMovementDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  return `${day}/${month} ${hours}:${minutes}`;
}

function formatAccountSubtitle(account: TreasuryAccount, isMulti: boolean): string | null {
  if (account.accountType === "bancaria") {
    const subtype = account.bankAccountSubtype
      ? texts.settings.club.treasury.bank_account_subtypes[account.bankAccountSubtype]
      : null;
    return [account.bankEntity, subtype].filter(Boolean).join(" · ") || null;
  }

  if (account.accountType === "billetera_virtual") {
    const parts = [account.bankEntity];
    if (isMulti) parts.push(texts.dashboard.treasury_role.multi_wallet_label);
    return parts.filter(Boolean).join(" · ") || null;
  }

  return texts.dashboard.treasury_role.cash_account_label;
}

function formatAccountIdentifier(account: TreasuryAccount): string | null {
  if (!account.cbuCvu && !account.accountNumber) return null;
  const identifier = account.cbuCvu ?? account.accountNumber ?? "";
  if (!identifier) return null;

  if (account.accountType === "bancaria") return `CBU ${identifier}`;
  if (account.accountType === "billetera_virtual") return `CVU ${identifier}`;
  return identifier;
}

function buildLastMovementByAccountId(
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

// ─── Icons ────────────────────────────────────────────────────────────────────



function MovementIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    >
      <rect x="3" y="3" width="18" height="18" rx="3" />
      <path d="M7 8h10M7 12h10M12 16v-5M9.5 13.5h5" />
    </svg>
  );
}

function FxIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    >
      <path d="M6 7h11m-4-3 4 3-4 3M18 17H7m4 3-4-3 4-3" />
    </svg>
  );
}

function ConsolidationIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    >
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 2v4M16 2v4M4 10h16M12 13v4M10 15h4" />
    </svg>
  );
}

function MovementsListIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="size-5"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
    >
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2M9 12h6M9 16h4" />
    </svg>
  );
}

function AccountAvatar({
  name,
  accountType
}: {
  name: string;
  accountType?: TreasuryAccountType;
}) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  const colorClass =
    accountType === "bancaria"
      ? "bg-ds-blue-050 text-ds-blue-700"
      : accountType === "billetera_virtual"
        ? "bg-amber-50 text-amber-700"
        : "bg-emerald-50 text-emerald-700"; // efectivo

  return (
    <div
      className={cn(
        "flex size-9 shrink-0 items-center justify-center rounded-lg text-eyebrow font-bold tracking-wide",
        colorClass
      )}
    >
      {initials}
    </div>
  );
}

// ─── Sub-tab navigation ───────────────────────────────────────────────────────

function SubTabNav({
  active,
  onChange
}: {
  active: SubTab;
  onChange: (tab: SubTab) => void;
}) {
  const tabs: { id: SubTab; label: string }[] = [
    { id: "resumen", label: texts.dashboard.treasury_role.tab_resumen },
    { id: "cuentas", label: texts.dashboard.treasury_role.tab_cuentas },
    { id: "movimientos", label: texts.dashboard.treasury_role.tab_movimientos },
    { id: "conciliacion", label: texts.dashboard.treasury_role.tab_conciliacion }
  ];

  return (
    <div className="flex gap-0.5 rounded-card bg-slate-100 p-[3px]">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          aria-pressed={tab.id === active}
          className={cn(
            "flex-1 rounded-[7px] px-2.5 py-2 text-xs font-semibold tracking-tight transition whitespace-nowrap",
            tab.id === active
              ? "bg-white text-foreground shadow-sm"
              : "text-slate-600 hover:text-foreground"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

// ─── KPI grid ────────────────────────────────────────────────────────────────

// ─── KPI currency chip (shared) ──────────────────────────────────────────────

function CurrencyChip({ code }: { code: string }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-[4px] bg-slate-100 px-1.5 py-0.5 text-eyebrow font-semibold text-slate-600">
      {code}
    </span>
  );
}

// ─── KPI grid ────────────────────────────────────────────────────────────────

function KpiGrid({
  totalBalances,
  accountCount,
  monthlyStats,
  pendingConciliationCount
}: {
  totalBalances: TotalBalance[];
  accountCount: number;
  monthlyStats: TreasuryRoleDashboard["monthlyStats"];
  pendingConciliationCount: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">

      {/* ── Saldo total ── */}
      <div className="rounded-card border border-border bg-card px-3.5 py-3">
        <p className="text-eyebrow font-semibold uppercase text-muted-foreground">
          {texts.dashboard.treasury_role.kpi_total_balance_label}
        </p>
        <div className="mt-2 flex flex-col">
          {totalBalances.length === 0 ? (
            <p className="py-1 text-h2 font-bold tabular-nums text-foreground">—</p>
          ) : (
            totalBalances.map((b, i) => (
              <div
                key={b.currencyCode}
                className={cn(
                  "flex items-center justify-between gap-2 py-1.5",
                  i < totalBalances.length - 1 && "border-b border-slate-200"
                )}
              >
                <CurrencyChip code={b.currencyCode} />
                <span className="text-[17px] font-bold tabular-nums tracking-tight text-foreground">
                  {b.currencyCode === "ARS" ? "$ " : "US$ "}
                  {formatLocalizedAmount(b.amount)}
                </span>
              </div>
            ))
          )}
        </div>
        <p className="mt-1.5 text-meta text-slate-500">
          {accountCount} {texts.dashboard.treasury_role.kpi_accounts_count_label}
        </p>
      </div>

      {/* ── Ingresos del mes ── */}
      <div className="rounded-card border border-border bg-card px-3.5 py-3">
        <p className="text-eyebrow font-semibold uppercase text-muted-foreground">
          {texts.dashboard.treasury_role.kpi_monthly_income_label}
        </p>
        <div className="mt-2 flex flex-col">
          {monthlyStats.length === 0 ? (
            <p className="py-1 text-h2 font-bold tabular-nums text-ds-green-700">—</p>
          ) : (
            monthlyStats.map((s, i) => (
              <div
                key={s.currencyCode}
                className={cn(
                  "flex items-center justify-between gap-2 py-1.5",
                  i < monthlyStats.length - 1 && "border-b border-slate-200"
                )}
              >
                <span className={cn(
                  "font-bold tabular-nums tracking-tight text-ds-green-700",
                  i === 0 ? "text-[17px]" : "text-small"
                )}>
                  + {s.currencyCode === "ARS" ? "$ " : "US$ "}
                  {formatLocalizedAmount(s.ingreso)}
                </span>
                <CurrencyChip code={s.currencyCode} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Egresos del mes ── */}
      <div className="rounded-card border border-border bg-card px-3.5 py-3">
        <p className="text-eyebrow font-semibold uppercase text-muted-foreground">
          {texts.dashboard.treasury_role.kpi_monthly_expenses_label}
        </p>
        <div className="mt-2 flex flex-col">
          {monthlyStats.length === 0 ? (
            <p className="py-1 text-h2 font-bold tabular-nums text-ds-red-700">—</p>
          ) : (
            monthlyStats.map((s, i) => (
              <div
                key={s.currencyCode}
                className={cn(
                  "flex items-center justify-between gap-2 py-1.5",
                  i < monthlyStats.length - 1 && "border-b border-slate-200"
                )}
              >
                <span className={cn(
                  "font-bold tabular-nums tracking-tight text-ds-red-700",
                  i === 0 ? "text-[17px]" : "text-small"
                )}>
                  − {s.currencyCode === "ARS" ? "$ " : "US$ "}
                  {formatLocalizedAmount(s.egreso)}
                </span>
                <CurrencyChip code={s.currencyCode} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Sin conciliar ── */}
      <div className="rounded-card border border-border bg-card px-3.5 py-3">
        <p className="text-eyebrow font-semibold uppercase text-muted-foreground">
          {texts.dashboard.treasury_role.kpi_pending_conciliation_label}
        </p>
        <p className="mt-2 text-[2rem] font-bold leading-none tracking-tight text-ds-blue-700 tabular-nums">
          {pendingConciliationCount}
        </p>
        <p className="mt-1.5 text-meta text-slate-500">
          {texts.dashboard.treasury_role.kpi_pending_conciliation_meta}
        </p>
      </div>

    </div>
  );
}

// ─── Accounts summary list ────────────────────────────────────────────────────

type EnrichedDashboardAccount = TreasuryRoleDashboard["accounts"][number] & {
  accountType?: TreasuryAccountType;
};

function AccountRow({
  account,
  action,
  fullAccount,
  lastMovementAt
}: {
  account: EnrichedDashboardAccount;
  action?: ReactNode;
  fullAccount?: TreasuryAccount;
  lastMovementAt?: string | null;
}) {
  const isMulti = account.balances.length > 1;
  const subtitleLine = fullAccount ? formatAccountSubtitle(fullAccount, isMulti) : null;
  const accountNumberLine = fullAccount ? formatAccountIdentifier(fullAccount) : null;
  const lastMovementLabel = lastMovementAt ? formatLastMovementDate(lastMovementAt) : null;

  return (
    <div className="group border-b border-dashed border-slate-200 py-3 last:border-b-0">
      {/* Header row */}
      <div className="flex items-center gap-3">
        <AccountAvatar name={account.name} accountType={account.accountType} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-semibold tracking-tight text-foreground">
            {account.name}
          </p>
          {subtitleLine ? (
            <p className="mt-0.5 truncate text-meta text-muted-foreground">{subtitleLine}</p>
          ) : null}
          {accountNumberLine ? (
            <p className="mt-0.5 truncate text-eyebrow font-medium tracking-wide text-slate-500">
              {accountNumberLine}
            </p>
          ) : null}
          {lastMovementLabel !== null && fullAccount ? (
            <p className="mt-0.5 truncate text-eyebrow text-slate-400">
              {lastMovementLabel
                ? `${texts.dashboard.treasury_role.last_movement_label}: ${lastMovementLabel}`
                : texts.dashboard.treasury_role.no_movements_yet}
            </p>
          ) : null}
          {account.hasPendingMovements || account.hasConciliatedMovements ? (
            <div className="mt-0.5 flex items-center gap-1">
              <span className={cn(
                "inline-flex size-1.5 rounded-full",
                account.hasPendingMovements ? "bg-amber-500" : "bg-emerald-500"
              )} />
              <span className="text-eyebrow text-slate-500">
                {account.hasPendingMovements
                  ? texts.dashboard.treasury_role.conciliation_status_pending
                  : texts.dashboard.treasury_role.conciliation_status_ok}
              </span>
            </div>
          ) : null}
        </div>
        {isMulti ? (
          <span className="inline-flex shrink-0 items-center rounded-chip bg-slate-100 px-2 py-0.5 text-eyebrow font-semibold tracking-wider text-slate-500">
            {account.balances.length} {texts.dashboard.treasury_role.multi_currency_label}
          </span>
        ) : (
          <p className="shrink-0 text-card-title font-bold tabular-nums tracking-tight text-foreground">
            {account.balances[0]?.currencyCode === "ARS" ? "$ " : "US$ "}
            {formatLocalizedAmount(account.balances[0]?.amount ?? 0)}
          </p>
        )}
        {action ? (
          <div className="shrink-0 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
            {action}
          </div>
        ) : null}
      </div>

      {/* Multi-currency breakdown */}
      {isMulti && (
        <div className="ml-12 mt-2 flex flex-col gap-1.5 border-l-2 border-slate-100 pl-3">
          {account.balances.map((b) => (
            <div key={b.currencyCode} className="flex items-center justify-between gap-3">
              <span className="text-eyebrow font-semibold text-slate-400">{b.currencyCode}</span>
              <span className="text-small font-semibold tabular-nums text-foreground">
                {b.currencyCode === "ARS" ? "$ " : "US$ "}
                {formatLocalizedAmount(b.amount)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Quick actions ────────────────────────────────────────────────────────────

function QuickActions({
  canCreateMovement,
  canCreateFxOperation,
  canCreateTransfer,
  pendingConciliationCount,
  onMovement,
  onFx,
  onTransfer,
  onConciliacion,
  onMovements
}: {
  canCreateMovement: boolean;
  canCreateFxOperation: boolean;
  canCreateTransfer: boolean;
  pendingConciliationCount: number;
  onMovement: () => void;
  onFx: () => void;
  onTransfer: () => void;
  onConciliacion: () => void;
  onMovements: () => void;
}) {
  return (
    <div className="rounded-card border border-border bg-card p-4">
      <p className="text-sm font-semibold tracking-tight text-foreground">
        {texts.dashboard.treasury_role.quick_actions_title}
      </p>
      <p className="mt-0.5 text-meta text-muted-foreground">
        {texts.dashboard.treasury_role.quick_actions_description}
      </p>
      <div className="mt-3 flex flex-col gap-2">
        {canCreateMovement && (
          <button
            type="button"
            onClick={onMovement}
            className="flex min-h-11 items-center justify-center rounded-btn bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black"
          >
            {texts.dashboard.treasury_role.movement_modal_cta}
          </button>
        )}
        {canCreateFxOperation && (
          <button
            type="button"
            onClick={onFx}
            className="flex min-h-11 items-center justify-center rounded-btn border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-slate-50"
          >
            {texts.dashboard.treasury_role.fx_modal_cta}
          </button>
        )}
        {canCreateTransfer && (
          <button
            type="button"
            onClick={onTransfer}
            className="flex min-h-11 items-center justify-center rounded-btn border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-slate-50"
          >
            {texts.dashboard.treasury_role.transfer_modal_cta}
          </button>
        )}
        <button
          type="button"
          onClick={onConciliacion}
          className="relative flex min-h-11 items-center justify-center rounded-btn border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-slate-50"
        >
          {texts.dashboard.treasury_role.consolidation_cta}
          {pendingConciliationCount > 0 && (
            <span className="absolute right-3 flex size-5 items-center justify-center rounded-full bg-amber-100 text-eyebrow font-bold text-amber-700">
              {pendingConciliationCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={onMovements}
          className="flex min-h-11 items-center justify-center rounded-btn border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-slate-50"
        >
          {texts.dashboard.treasury_role.view_movements_cta}
        </button>
      </div>
    </div>
  );
}

// ─── Movement groups ──────────────────────────────────────────────────────────

function TreasuryRoleMovementGroups({
  groups,
  onEditMovement
}: {
  groups: Array<{ movementDate: string; movements: TreasuryDashboardMovement[] }>;
  onEditMovement: (movement: TreasuryDashboardMovement) => void;
}) {
  return (
    <div className="grid gap-4">
      {groups.map((group) => (
        <section key={group.movementDate} className="space-y-3">
          <div className="rounded-xl border border-border bg-card px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {texts.dashboard.treasury_role.date_label}
            </p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {formatMovementGroupDate(group.movementDate)}
            </p>
          </div>

          <SecretariaMovementList
            items={group.movements.map((movement) => ({
              movementId: movement.movementId,
              movementDisplayId: movement.movementDisplayId,
              concept: movement.concept,
              createdAt: movement.createdAt,
              createdByUserName: movement.createdByUserName,
              accountName: movement.accountName,
              movementType: movement.movementType,
              currencyCode: movement.currencyCode,
              amount: movement.amount,
              categoryName: movement.categoryName,
              activityName: movement.activityName,
              receiptNumber: movement.receiptNumber,
              calendarEventTitle: movement.calendarEventTitle,
              transferReference: movement.transferReference,
              fxOperationReference: movement.fxOperationReference,
              action: movement.canEdit ? (
                <EditIconButton
                  onClick={() => onEditMovement(movement)}
                  label={texts.dashboard.treasury_role.edit_movement_cta}
                />
              ) : undefined
            }))}
          />
        </section>
      ))}
    </div>
  );
}

// ─── Cuentas tab ─────────────────────────────────────────────────────────────

function CuentasTab({
  accounts,
  dashboardAccounts,
  totalBalances,
  isAdmin,
  lastMovementByAccountId,
  onCreateAccount,
  onEditAccount
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
      accountType: account.accountType
    };
  });

  const subtitleParts = [
    `${accounts.length} ${texts.dashboard.treasury_role.accounts_tab_active_label}`,
    ...totalBalances.map(
      (b) =>
        `${b.currencyCode} ${b.currencyCode === "ARS" ? "$" : "US$"} ${formatLocalizedAmount(b.amount)}`
    )
  ];

  return (
    <div className="rounded-card border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight text-foreground">
            {texts.dashboard.treasury_role.tab_cuentas}
          </p>
          <p className="text-meta text-muted-foreground">
            {subtitleParts.join(" · ")}
          </p>
        </div>
        {isAdmin && (
          <button
            type="button"
            onClick={onCreateAccount}
            className="shrink-0 rounded-btn bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-black"
          >
            {texts.dashboard.treasury_role.accounts_tab_create_cta}
          </button>
        )}
      </div>

      {accounts.length === 0 ? (
        <div className="px-4 py-5 text-sm text-muted-foreground">
          {texts.dashboard.treasury_role.empty_accounts}
        </div>
      ) : (
        <div className="px-4">
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
        </div>
      )}
    </div>
  );
}

// ─── Movimientos tab ──────────────────────────────────────────────────────────

function MovimientosTab({
  dashboard,
  selectedAccountId,
  onSelectAccount,
  onEditMovement,
  canCreateMovement,
  canCreateFxOperation,
  canCreateTransfer,
  onCreateMovement,
  onCreateTransfer,
  onCreateFx
}: {
  dashboard: TreasuryRoleDashboard;
  selectedAccountId: string | null;
  onSelectAccount: (id: string | null) => void;
  onEditMovement: (movement: TreasuryDashboardMovement) => void;
  canCreateMovement: boolean;
  canCreateFxOperation: boolean;
  canCreateTransfer: boolean;
  onCreateMovement: () => void;
  onCreateTransfer: () => void;
  onCreateFx: () => void;
}) {
  const allMovementGroups = getAllMovementGroups(dashboard.movementGroups);
  const filteredGroups =
    selectedAccountId === null
      ? allMovementGroups
      : getMovementGroupsForAccount(dashboard.movementGroups, selectedAccountId);

  const isEmpty = filteredGroups.length === 0;
  const hasMultipleAccounts = dashboard.accounts.length >= 2;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canCreateMovement && (
          <button
            type="button"
            onClick={onCreateMovement}
            className="rounded-btn border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-slate-50"
          >
            {texts.dashboard.treasury_role.movements_cta_movement}
          </button>
        )}
        {canCreateTransfer && hasMultipleAccounts && (
          <button
            type="button"
            onClick={onCreateTransfer}
            className="rounded-btn border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-slate-50"
          >
            {texts.dashboard.treasury_role.movements_cta_transfer}
          </button>
        )}
        {canCreateFxOperation && (
          <button
            type="button"
            onClick={onCreateFx}
            className="rounded-btn bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-black"
          >
            {texts.dashboard.treasury_role.movements_cta_fx}
          </button>
        )}
      </div>

      {dashboard.accounts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
          <button
            type="button"
            onClick={() => onSelectAccount(null)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-meta font-semibold transition whitespace-nowrap",
              selectedAccountId === null
                ? "border-slate-900 bg-slate-900 text-white"
                : "border-transparent bg-slate-100 text-slate-600 hover:text-foreground"
            )}
          >
            {texts.dashboard.treasury_role.all_accounts_filter}
          </button>
          {dashboard.accounts.map((account) => (
            <button
              key={account.accountId}
              type="button"
              onClick={() => onSelectAccount(account.accountId)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-meta font-semibold transition whitespace-nowrap",
                account.accountId === selectedAccountId
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-transparent bg-slate-100 text-slate-600 hover:text-foreground"
              )}
            >
              {account.name}
            </button>
          ))}
        </div>
      )}

      {isEmpty ? (
        <div className="rounded-dialog border border-dashed border-border bg-secondary/30 px-4 py-5 text-sm text-muted-foreground">
          {texts.dashboard.treasury_role.movements_empty}
        </div>
      ) : (
        <TreasuryRoleMovementGroups groups={filteredGroups} onEditMovement={onEditMovement} />
      )}
    </div>
  );
}

// ─── Conciliación tab ─────────────────────────────────────────────────────────

function ConciliacionTab() {
  return (
    <div className="rounded-card border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500">
          <ConsolidationIcon />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold tracking-tight text-foreground">
            {texts.dashboard.treasury_role.consolidation_cta}
          </p>
          <p className="mt-0.5 text-meta leading-relaxed text-muted-foreground">
            {texts.dashboard.treasury_role.conciliacion_tab_description}
          </p>
        </div>
      </div>
      <div className="mt-4">
        <NavigationLinkWithLoader
          href="/treasury/consolidation"
          className="flex min-h-11 w-full items-center justify-center rounded-btn bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black"
          loadingLabel={texts.dashboard.treasury_role.navigation_loading}
        >
          {texts.dashboard.treasury_role.conciliacion_tab_cta}
        </NavigationLinkWithLoader>
      </div>
    </div>
  );
}

// ─── Resumen tab ──────────────────────────────────────────────────────────────

function ResumenTab({
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
  onViewAllAccounts
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
              className="shrink-0 rounded-btn border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-slate-50"
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

// ─── Main component ───────────────────────────────────────────────────────────

export function TreasuryRoleCard({
  dashboard,
  accounts,
  categories,
  activities,
  calendarEvents,
  currencies,
  movementTypes,
  receiptFormats,
  createTreasuryRoleMovementAction,
  updateTreasuryRoleMovementAction,
  createFxOperationAction,
  createAccountTransferAction,
  createTreasuryAccountAction,
  updateTreasuryAccountAction,
  allAccounts,
  isAdmin
}: TreasuryRoleCardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<SubTab>("resumen");
  const [activeModal, setActiveModal] = useState<
    "movement" | "edit_movement" | "fx" | "transfer" | "create_account" | "edit_account" | null
  >(null);
  const [selectedMovement, setSelectedMovement] = useState<TreasuryDashboardMovement | null>(null);
  const [editingAccount, setEditingAccount] = useState<TreasuryAccount | null>(null);
  const [selectedMovementAccountId, setSelectedMovementAccountId] = useState<string | null>(null);
  const [isMovementSubmissionPending, setIsMovementSubmissionPending] = useState(false);
  const [isMovementUpdatePending, setIsMovementUpdatePending] = useState(false);
  const [isFxSubmissionPending, setIsFxSubmissionPending] = useState(false);
  const [isTransferSubmissionPending, setIsTransferSubmissionPending] = useState(false);
  const [isAccountSubmissionPending, setIsAccountSubmissionPending] = useState(false);

  const totalBalances = getTotalBalances(dashboard.accounts);
  const canCreateMovement = dashboard.availableActions.includes("create_movement");
  const canCreateFxOperation = dashboard.availableActions.includes("create_fx_operation");
  const canCreateTransfer =
    dashboard.availableActions.includes("create_transfer") && allAccounts.length >= 2;
  const lastMovementByAccountId = buildLastMovementByAccountId(dashboard.movementGroups);

  const pendingOverlayLabel = isMovementSubmissionPending
    ? texts.dashboard.treasury_role.create_loading
    : isMovementUpdatePending
      ? texts.dashboard.treasury_role.update_loading
      : isFxSubmissionPending
        ? texts.dashboard.treasury_role.fx_create_loading
        : isTransferSubmissionPending
          ? texts.dashboard.treasury_role.transfer_create_loading
          : isAccountSubmissionPending
            ? texts.settings.club.treasury.save_account_loading
            : null;

  useEffect(() => {
    setSelectedMovementAccountId((currentAccountId) => {
      if (currentAccountId && dashboard.accounts.some((a) => a.accountId === currentAccountId)) {
        return currentAccountId;
      }
      return null;
    });
  }, [dashboard.accounts]);

  async function handleCreateTreasuryRoleMovement(formData: FormData) {
    setIsMovementSubmissionPending(true);
    setActiveModal(null);

    try {
      const result = await createTreasuryRoleMovementAction(formData);
      const nextParams = new URLSearchParams(searchParams.toString());

      nextParams.set("feedback", result.code);

      if (result.movementDisplayId) {
        nextParams.set("movement_id", result.movementDisplayId);
      } else {
        nextParams.delete("movement_id");
      }

      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });

      if (result.ok) {
        startTransition(() => {
          router.refresh();
        });
      }
    } finally {
      setIsMovementSubmissionPending(false);
    }
  }

  async function handleUpdateTreasuryRoleMovement(formData: FormData) {
    setIsMovementUpdatePending(true);
    setActiveModal(null);
    setSelectedMovement(null);

    try {
      const result = await updateTreasuryRoleMovementAction(formData);
      const nextParams = new URLSearchParams(searchParams.toString());

      nextParams.set("feedback", result.code);
      nextParams.delete("movement_id");

      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });

      if (result.ok) {
        startTransition(() => {
          router.refresh();
        });
      }
    } finally {
      setIsMovementUpdatePending(false);
    }
  }

  async function handleCreateAccountTransfer(formData: FormData) {
    setIsTransferSubmissionPending(true);
    setActiveModal(null);

    formData.set("origin_role", "tesoreria");

    try {
      const result = await createAccountTransferAction(formData);
      const nextParams = new URLSearchParams(searchParams.toString());

      nextParams.set("feedback", result.code);
      if (result.movementDisplayId) {
        nextParams.set("movement_id", result.movementDisplayId);
      } else {
        nextParams.delete("movement_id");
      }
      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });

      if (result.ok) {
        startTransition(() => {
          router.refresh();
        });
      }
    } finally {
      setIsTransferSubmissionPending(false);
    }
  }

  async function handleCreateFxOperation(formData: FormData) {
    setIsFxSubmissionPending(true);
    setActiveModal(null);

    try {
      const result = await createFxOperationAction(formData);
      const nextParams = new URLSearchParams(searchParams.toString());

      nextParams.set("feedback", result.code);
      nextParams.delete("movement_id");
      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });

      if (result.ok) {
        startTransition(() => {
          router.refresh();
        });
      }
    } finally {
      setIsFxSubmissionPending(false);
    }
  }

  async function handleCreateAccount(formData: FormData) {
    setIsAccountSubmissionPending(true);
    setActiveModal(null);

    try {
      const result = await createTreasuryAccountAction(formData);
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("feedback", result.code);
      nextParams.delete("movement_id");
      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });

      if (result.ok) {
        startTransition(() => {
          router.refresh();
        });
      }
    } finally {
      setIsAccountSubmissionPending(false);
    }
  }

  async function handleUpdateAccount(formData: FormData) {
    setIsAccountSubmissionPending(true);
    setActiveModal(null);
    setEditingAccount(null);

    try {
      const result = await updateTreasuryAccountAction(formData);
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.set("feedback", result.code);
      nextParams.delete("movement_id");
      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });

      if (result.ok) {
        startTransition(() => {
          router.refresh();
        });
      }
    } finally {
      setIsAccountSubmissionPending(false);
    }
  }

  function handleEditMovement(movement: TreasuryDashboardMovement) {
    if (!movement.canEdit) return;
    setSelectedMovement(movement);
    setActiveModal("edit_movement");
  }

  function handleConciliacion() {
    setActiveTab("conciliacion");
  }

  return (
    <>
      <BlockingStatusOverlay open={pendingOverlayLabel !== null} label={pendingOverlayLabel ?? ""} />

      <div className="space-y-4">
        <SubTabNav active={activeTab} onChange={setActiveTab} />

        {activeTab === "resumen" && (
          <ResumenTab
            dashboard={dashboard}
            accounts={accounts}
            totalBalances={totalBalances}
            canCreateMovement={canCreateMovement}
            canCreateFxOperation={canCreateFxOperation}
            canCreateTransfer={canCreateTransfer}
            onMovement={() => setActiveModal("movement")}
            onFx={() => setActiveModal("fx")}
            onTransfer={() => setActiveModal("transfer")}
            onConciliacion={handleConciliacion}
            onMovements={() => setActiveTab("movimientos")}
            onViewAllAccounts={() => setActiveTab("cuentas")}
          />
        )}

        {activeTab === "cuentas" && (
          <CuentasTab
            accounts={allAccounts}
            dashboardAccounts={dashboard.accounts}
            totalBalances={totalBalances}
            isAdmin={isAdmin}
            lastMovementByAccountId={lastMovementByAccountId}
            onCreateAccount={() => setActiveModal("create_account")}
            onEditAccount={(account) => {
              setEditingAccount(account);
              setActiveModal("edit_account");
            }}
          />
        )}

        {activeTab === "movimientos" && (
          <MovimientosTab
            dashboard={dashboard}
            selectedAccountId={selectedMovementAccountId}
            onSelectAccount={setSelectedMovementAccountId}
            onEditMovement={handleEditMovement}
            canCreateMovement={canCreateMovement}
            canCreateFxOperation={canCreateFxOperation}
            canCreateTransfer={canCreateTransfer}
            onCreateMovement={() => setActiveModal("movement")}
            onCreateTransfer={() => setActiveModal("transfer")}
            onCreateFx={() => setActiveModal("fx")}
          />
        )}

        {activeTab === "conciliacion" && <ConciliacionTab />}
      </div>

      {/* Modals */}
      <Modal
        open={activeModal === "movement"}
        onClose={() => setActiveModal(null)}
        title={texts.dashboard.treasury_role.movement_form_title}
        description={texts.dashboard.treasury_role.movement_form_description}
        closeDisabled={isMovementSubmissionPending || isMovementUpdatePending || isFxSubmissionPending}
        hideCloseButton
        panelClassName="max-w-xl"
      >
        <TreasuryRoleMovementForm
          accounts={accounts}
          categories={categories}
          activities={activities}
          currencies={currencies}
          movementTypes={movementTypes}
          receiptFormats={receiptFormats}
          submitAction={handleCreateTreasuryRoleMovement}
          submitLabel={texts.dashboard.treasury_role.create_cta}
          pendingLabel={texts.dashboard.treasury_role.create_loading}
          sessionDate={dashboard.sessionDate}
          onCancel={() => setActiveModal(null)}
        />
      </Modal>

      <Modal
        open={activeModal === "edit_movement" && selectedMovement !== null && selectedMovement.canEdit}
        onClose={() => {
          setActiveModal(null);
          setSelectedMovement(null);
        }}
        title={texts.dashboard.treasury_role.edit_form_title}
        description={texts.dashboard.treasury_role.edit_form_description}
        closeDisabled={isMovementSubmissionPending || isMovementUpdatePending || isFxSubmissionPending}
      >
        {selectedMovement?.canEdit ? (
          <SecretariaMovementEditForm
            accounts={accounts}
            categories={categories}
            activities={activities}
            currencies={currencies}
            movementTypes={movementTypes}
            receiptFormats={receiptFormats}
            submitAction={handleUpdateTreasuryRoleMovement}
            submitLabel={texts.dashboard.treasury_role.update_cta}
            pendingLabel={texts.dashboard.treasury_role.update_loading}
            movement={selectedMovement}
            copy={texts.dashboard.treasury_role}
          />
        ) : null}
      </Modal>

      <Modal
        open={activeModal === "fx"}
        onClose={() => setActiveModal(null)}
        title={texts.dashboard.treasury_role.fx_form_title}
        description={texts.dashboard.treasury_role.fx_form_description}
        closeDisabled={isMovementSubmissionPending || isMovementUpdatePending || isFxSubmissionPending}
        hideCloseButton
        panelClassName="max-w-xl"
      >
        <TreasuryRoleFxForm
          accounts={accounts}
          submitAction={handleCreateFxOperation}
          sessionDate={dashboard.sessionDate}
          onCancel={() => setActiveModal(null)}
        />
      </Modal>

      <Modal
        open={activeModal === "transfer"}
        onClose={() => setActiveModal(null)}
        title={texts.dashboard.treasury_role.transfer_form_title}
        description={texts.dashboard.treasury_role.transfer_form_description}
        closeDisabled={
          isMovementSubmissionPending ||
          isMovementUpdatePending ||
          isFxSubmissionPending ||
          isTransferSubmissionPending
        }
        hideCloseButton
        panelClassName="max-w-xl"
      >
        <AccountTransferForm
          sourceAccounts={accounts}
          targetAccounts={allAccounts}
          currencies={currencies}
          submitAction={handleCreateAccountTransfer}
          sessionDate={dashboard.sessionDate}
          onCancel={() => setActiveModal(null)}
        />
      </Modal>

      <Modal
        open={activeModal === "create_account"}
        onClose={() => setActiveModal(null)}
        title={texts.dashboard.treasury_role.accounts_tab_create_title}
        description={texts.settings.club.treasury.create_account_description}
        closeDisabled={isAccountSubmissionPending}
        hideCloseButton
        panelClassName="max-w-xl"
      >
        <TreasuryAccountForm
          action={handleCreateAccount}
          submitLabel={texts.settings.club.treasury.save_account_cta}
          pendingLabel={texts.settings.club.treasury.save_account_loading}
          cancelLabel={texts.settings.club.treasury.cancel_cta}
          onCancel={() => setActiveModal(null)}
        />
      </Modal>

      <Modal
        open={activeModal === "edit_account" && editingAccount !== null}
        onClose={() => {
          setActiveModal(null);
          setEditingAccount(null);
        }}
        title={texts.dashboard.treasury_role.accounts_tab_edit_title}
        description={texts.settings.club.treasury.edit_account_description}
        closeDisabled={isAccountSubmissionPending}
        hideCloseButton
        panelClassName="max-w-xl"
      >
        {editingAccount ? (
          <TreasuryAccountForm
            key={editingAccount.id}
            action={handleUpdateAccount}
            submitLabel={texts.settings.club.treasury.update_account_cta}
            pendingLabel={texts.settings.club.treasury.update_account_loading}
            cancelLabel={texts.settings.club.treasury.cancel_cta}
            onCancel={() => {
              setActiveModal(null);
              setEditingAccount(null);
            }}
            defaultAccount={editingAccount}
          />
        ) : null}
      </Modal>
    </>
  );
}
