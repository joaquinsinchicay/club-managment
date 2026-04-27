"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useState, type ReactNode } from "react";

import { SecretariaMovementList } from "@/components/dashboard/secretaria-movement-list";
import { TreasuryConciliacionTab } from "@/components/dashboard/treasury-conciliacion-tab";
import {
  AccountTransferForm,
  SecretariaMovementEditForm,
  TreasuryRoleFxForm,
  TreasuryRoleMovementForm
} from "@/components/dashboard/treasury-operation-forms";
import { TreasuryAccountForm } from "@/components/treasury/account-form";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ChipButton } from "@/components/ui/chip";
import {
  DataTable,
  DataTableActions,
  DataTableBody,
  DataTableRow,
} from "@/components/ui/data-table";
import { EditIconButton } from "@/components/ui/edit-icon-button";
import { EmptyState } from "@/components/ui/empty-state";
import { Modal } from "@/components/ui/modal";
import { BlockingStatusOverlay } from "@/components/ui/overlay";
import { SegmentedNav, type SegmentedNavItem } from "@/components/ui/segmented-nav";
import { formatLocalizedAmount } from "@/lib/amounts";
import { triggerClientFeedback } from "@/lib/client-feedback";
import type { TreasuryActionResponse } from "@/app/(dashboard)/dashboard/treasury-actions";
import type {
  ClubActivity,
  ClubCalendarEvent,
  ReceiptFormat,
  TreasuryAccount,
  TreasuryAccountType,
  TreasuryCategory,
  TreasuryConsolidationDashboard,
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
  consolidationDashboard: TreasuryConsolidationDashboard | null;
  transferSourceAccounts: TreasuryAccount[];
  transferTargetAccounts: TreasuryAccount[];
  updateMovementBeforeConsolidationAction: (formData: FormData) => Promise<void>;
  updateTransferBeforeConsolidationAction: (formData: FormData) => Promise<void>;
  executeDailyConsolidationAction: (formData: FormData) => Promise<void>;
  // US-52: Optional slot rendered inside the "Centros de Costo" sub-tab when
  // the current user can access it. The page server-side prepares this tree
  // with pre-fetched data and bound server actions.
  costCentersTab?: ReactNode;
  // US-53: Active cost centers for the multiselect in the movement creation
  // form. Only passed when the current user has role `tesoreria`.
  activeCostCenters?: Array<{
    id: string;
    name: string;
    type: string;
    currencyCode: string;
    status: "activo" | "inactivo";
  }>;
};

type SubTab = "resumen" | "cuentas" | "movimientos" | "conciliacion" | "cost_centers";

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

function formatAccountSubtitle(account: TreasuryAccount): string | null {
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
  const tone =
    accountType === "bancaria"
      ? "bancaria"
      : accountType === "billetera_virtual"
        ? "virtual"
        : "efectivo";

  return (
    <Avatar
      name={name}
      shape="square"
      tone={tone}
      className="size-9 text-eyebrow tracking-wide"
    />
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
  const items: SegmentedNavItem[] = [
    { id: "resumen", label: texts.dashboard.treasury_role.tab_resumen, onClick: () => onChange("resumen") },
    { id: "cuentas", label: texts.dashboard.treasury_role.tab_cuentas, onClick: () => onChange("cuentas") },
    { id: "movimientos", label: texts.dashboard.treasury_role.tab_movimientos, onClick: () => onChange("movimientos") },
    { id: "conciliacion", label: texts.dashboard.treasury_role.tab_conciliacion, onClick: () => onChange("conciliacion") },
    { id: "cost_centers", label: texts.dashboard.treasury_role.tab_cost_centers, onClick: () => onChange("cost_centers") }
  ];

  return (
    <SegmentedNav
      items={items}
      activeId={active}
      ariaLabel={texts.dashboard.treasury_role.sub_tab_nav_aria_label}
    />
  );
}

// ─── KPI grid ────────────────────────────────────────────────────────────────

// ─── KPI currency chip (shared) ──────────────────────────────────────────────

function CurrencyChip({ code }: { code: string }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-xs bg-ds-slate-100 px-1.5 py-0.5 text-eyebrow font-semibold text-ds-slate-600">
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
                <span className="text-h4 tabular-nums tracking-tight text-foreground">
                  {b.currencyCode === "ARS" ? "$ " : "US$ "}
                  {formatLocalizedAmount(b.amount)}
                </span>
              </div>
            ))
          )}
        </div>
        <p className="mt-1.5 text-meta text-ds-slate-500">
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
                  i === 0 ? "text-h4" : "text-small"
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
                  i === 0 ? "text-h4" : "text-small"
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
        <p className="mt-1.5 text-meta text-ds-slate-500">
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
  const subtitleLine = fullAccount ? formatAccountSubtitle(fullAccount) : null;
  const accountNumberLine = fullAccount ? formatAccountIdentifier(fullAccount) : null;
  const lastMovementLabel = lastMovementAt ? formatLastMovementDate(lastMovementAt) : null;
  const primaryBalance = account.balances[0];

  return (
    <DataTableRow density="compact" useGrid={false} hoverReveal={Boolean(action)}>
      <div className="flex items-center gap-3">
        <AccountAvatar name={account.name} accountType={account.accountType} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-label tracking-tight text-foreground">
            {account.name}
          </p>
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
              <span className={cn(
                "inline-flex size-1.5 rounded-full",
                account.hasPendingMovements ? "bg-ds-amber" : "bg-ds-green"
              )} />
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
          <Button variant="dark" radius="btn" onClick={onMovement}>
            {texts.dashboard.treasury_role.movement_modal_cta}
          </Button>
        )}
        {canCreateFxOperation && (
          <Button variant="secondary" radius="btn" onClick={onFx}>
            {texts.dashboard.treasury_role.fx_modal_cta}
          </Button>
        )}
        {canCreateTransfer && (
          <Button variant="secondary" radius="btn" onClick={onTransfer}>
            {texts.dashboard.treasury_role.transfer_modal_cta}
          </Button>
        )}
        <Button variant="secondary" radius="btn" onClick={onConciliacion} className="relative">
          {texts.dashboard.treasury_role.consolidation_cta}
          {pendingConciliationCount > 0 && (
            <span className="absolute right-3 flex size-5 items-center justify-center rounded-full bg-ds-amber-050 text-eyebrow font-bold text-ds-amber-700">
              {pendingConciliationCount}
            </span>
          )}
        </Button>
        <Button variant="secondary" radius="btn" onClick={onMovements}>
          {texts.dashboard.treasury_role.view_movements_cta}
        </Button>
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
          <div className="rounded-card border border-border bg-card px-4 py-3">
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

// ─── Movimientos tab ──────────────────────────────────────────────────────────

const DEFAULT_MOVEMENTS_WINDOW_DAYS = 30;

function diffDaysInclusive(fromDate: string, toDate: string) {
  const from = new Date(`${fromDate}T00:00:00`);
  const to = new Date(`${toDate}T00:00:00`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return null;
  return Math.round((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)) + 1;
}

function formatLocalizedDateLabel(isoDate: string) {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function buildMovementsWindowSubtitle(window: TreasuryRoleDashboard["movementsWindow"]) {
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
  onCreateFx,
  onUpdateDateRange
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
  onUpdateDateRange: (range: { fromDate: string | null; toDate: string | null }) => void;
}) {
  const allMovementGroups = getAllMovementGroups(dashboard.movementGroups);
  const filteredGroups =
    selectedAccountId === null
      ? allMovementGroups
      : getMovementGroupsForAccount(dashboard.movementGroups, selectedAccountId);

  const isEmpty = filteredGroups.length === 0;
  const hasMultipleAccounts = dashboard.accounts.length >= 2;
  const subtitle = buildMovementsWindowSubtitle(dashboard.movementsWindow);
  const [draftFrom, setDraftFrom] = useState(dashboard.movementsWindow.fromDate);
  const [draftTo, setDraftTo] = useState(dashboard.movementsWindow.toDate);
  const isDirty =
    draftFrom !== dashboard.movementsWindow.fromDate || draftTo !== dashboard.movementsWindow.toDate;
  const isCustomRange =
    diffDaysInclusive(dashboard.movementsWindow.fromDate, dashboard.movementsWindow.toDate) !==
    DEFAULT_MOVEMENTS_WINDOW_DAYS;

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 rounded-card border border-border bg-card px-4 py-3.5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold tracking-tight text-foreground">
            {texts.dashboard.treasury_role.movements_card_title}
          </p>
          <p className="mt-0.5 text-meta text-muted-foreground">{subtitle}</p>
        </div>
        <form
          aria-label={texts.dashboard.treasury_role.movements_filter_aria_label}
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!isDirty) return;
            onUpdateDateRange({ fromDate: draftFrom, toDate: draftTo });
          }}
        >
          <label className="flex flex-col gap-1 text-eyebrow text-muted-foreground">
            {texts.dashboard.treasury_role.movements_filter_from_label}
            <input
              type="date"
              value={draftFrom}
              max={draftTo || undefined}
              onChange={(event) => setDraftFrom(event.target.value)}
              className="min-h-9 rounded-btn border border-border bg-card px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
            />
          </label>
          <label className="flex flex-col gap-1 text-eyebrow text-muted-foreground">
            {texts.dashboard.treasury_role.movements_filter_to_label}
            <input
              type="date"
              value={draftTo}
              min={draftFrom || undefined}
              onChange={(event) => setDraftTo(event.target.value)}
              className="min-h-9 rounded-btn border border-border bg-card px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10"
            />
          </label>
          <button
            type="submit"
            disabled={!isDirty}
            className="rounded-btn bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:opacity-50"
          >
            {texts.dashboard.treasury_role.movements_filter_apply_cta}
          </button>
          {isCustomRange && (
            <button
              type="button"
              onClick={() => onUpdateDateRange({ fromDate: null, toDate: null })}
              className="rounded-btn border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary/40"
            >
              {texts.dashboard.treasury_role.movements_filter_reset_cta}
            </button>
          )}
        </form>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        {canCreateMovement && (
          <button
            type="button"
            onClick={onCreateMovement}
            className="rounded-btn border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary/40"
          >
            {texts.dashboard.treasury_role.movements_cta_movement}
          </button>
        )}
        {canCreateTransfer && hasMultipleAccounts && (
          <button
            type="button"
            onClick={onCreateTransfer}
            className="rounded-btn border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary/40"
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
          <ChipButton
            size="sm"
            active={selectedAccountId === null}
            onClick={() => onSelectAccount(null)}
            className="whitespace-nowrap"
          >
            {texts.dashboard.treasury_role.all_accounts_filter}
          </ChipButton>
          {dashboard.accounts.map((account) => (
            <ChipButton
              key={account.accountId}
              size="sm"
              active={account.accountId === selectedAccountId}
              onClick={() => onSelectAccount(account.accountId)}
              className="whitespace-nowrap"
            >
              {account.name}
            </ChipButton>
          ))}
        </div>
      )}

      {isEmpty ? (
        <EmptyState title={texts.dashboard.treasury_role.movements_empty} />
      ) : (
        <TreasuryRoleMovementGroups groups={filteredGroups} onEditMovement={onEditMovement} />
      )}
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
              className="shrink-0 rounded-btn border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary/40"
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
  isAdmin,
  consolidationDashboard,
  transferSourceAccounts,
  transferTargetAccounts,
  updateMovementBeforeConsolidationAction,
  updateTransferBeforeConsolidationAction,
  executeDailyConsolidationAction,
  costCentersTab,
  activeCostCenters
}: TreasuryRoleCardProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const initialTab = ((): SubTab => {
    const raw = searchParams.get("tab");
    if (
      raw === "cuentas" ||
      raw === "movimientos" ||
      raw === "conciliacion" ||
      raw === "cost_centers"
    ) {
      return raw;
    }
    return "resumen";
  })();
  const [activeTab, setActiveTab] = useState<SubTab>(initialTab);
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
      triggerClientFeedback("dashboard", result.code, { movementId: result.movementDisplayId });

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
      triggerClientFeedback("dashboard", result.code, { movementId: result.movementDisplayId });

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
      triggerClientFeedback("dashboard", result.code, { movementId: result.movementDisplayId });

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
      triggerClientFeedback("dashboard", result.code);

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
      triggerClientFeedback("dashboard", result.code);

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
      triggerClientFeedback("dashboard", result.code);

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
            onUpdateDateRange={({ fromDate, toDate }) => {
              const params = new URLSearchParams(searchParams.toString());
              params.set("tab", "movimientos");
              if (fromDate) params.set("movements_from", fromDate);
              else params.delete("movements_from");
              if (toDate) params.set("movements_to", toDate);
              else params.delete("movements_to");
              router.push(`?${params.toString()}`, { scroll: false });
            }}
          />
        )}

        {activeTab === "conciliacion" && consolidationDashboard && (
          <TreasuryConciliacionTab
            dashboard={consolidationDashboard}
            accounts={accounts}
            transferSourceAccounts={transferSourceAccounts}
            transferTargetAccounts={transferTargetAccounts}
            categories={categories}
            activities={activities}
            calendarEvents={calendarEvents}
            currencies={currencies}
            movementTypes={movementTypes}
            receiptFormats={receiptFormats}
            updateMovementBeforeConsolidationAction={updateMovementBeforeConsolidationAction}
            updateTransferBeforeConsolidationAction={updateTransferBeforeConsolidationAction}
            executeDailyConsolidationAction={executeDailyConsolidationAction}
          />
        )}

        {activeTab === "cost_centers" && costCentersTab}
      </div>

      {/* Modals */}
      <Modal
        open={activeModal === "movement"}
        onClose={() => setActiveModal(null)}
        title={texts.dashboard.treasury_role.movement_form_title}
        description={texts.dashboard.treasury_role.movement_form_description}
        closeDisabled={isMovementSubmissionPending || isMovementUpdatePending || isFxSubmissionPending}
        size="md"
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
          costCenters={activeCostCenters}
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
        size="md"
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
            onCancel={() => {
              setActiveModal(null);
              setSelectedMovement(null);
            }}
          />
        ) : null}
      </Modal>

      <Modal
        open={activeModal === "fx"}
        onClose={() => setActiveModal(null)}
        title={texts.dashboard.treasury_role.fx_form_title}
        description={texts.dashboard.treasury_role.fx_form_description}
        closeDisabled={isMovementSubmissionPending || isMovementUpdatePending || isFxSubmissionPending}
        size="md"
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
        size="md"
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
        size="md"
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
        size="md"
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
