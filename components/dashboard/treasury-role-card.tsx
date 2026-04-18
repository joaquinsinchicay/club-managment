"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { startTransition, useEffect, useState } from "react";

import { SecretariaMovementList } from "@/components/dashboard/secretaria-movement-list";
import {
  SecretariaMovementEditForm,
  TreasuryRoleFxForm,
  TreasuryRoleMovementForm
} from "@/components/dashboard/treasury-operation-forms";
import { Modal, ModalTriggerButton } from "@/components/ui/modal";
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

function AccountTypeIcon({ accountType }: { accountType: TreasuryAccountType }) {
  const initials =
    accountType === "bancaria" ? "BK" : accountType === "billetera_virtual" ? "BV" : "EF";

  const colorClass =
    accountType === "bancaria"
      ? "bg-blue-50 text-blue-700"
      : accountType === "billetera_virtual"
        ? "bg-amber-50 text-amber-700"
        : "bg-slate-100 text-slate-700";

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

function AccountRow({
  account
}: {
  account: TreasuryRoleDashboard["accounts"][number] & { accountType?: TreasuryAccountType };
}) {
  return (
    <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-dashed border-slate-200 py-3 last:border-b-0">
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg text-eyebrow font-bold tracking-wide",
          "bg-slate-100 text-slate-700"
        )}
      >
        {account.name.slice(0, 2).toUpperCase()}
      </div>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold tracking-tight text-foreground">
          {account.name}
        </p>
      </div>
      <div className="text-right">
        {account.balances.map((b) => (
          <p
            key={b.currencyCode}
            className="text-card-title font-bold tabular-nums tracking-tight text-foreground"
          >
            <span className="mr-0.5 text-eyebrow font-medium text-muted-foreground">
              {b.currencyCode}
            </span>
            {formatLocalizedAmount(b.amount)}
          </p>
        ))}
      </div>
    </div>
  );
}

// ─── Quick actions ────────────────────────────────────────────────────────────

function QuickActions({
  canCreateMovement,
  canCreateFxOperation,
  pendingConciliationCount,
  onMovement,
  onFx,
  onConciliacion,
  onMovements
}: {
  canCreateMovement: boolean;
  canCreateFxOperation: boolean;
  pendingConciliationCount: number;
  onMovement: () => void;
  onFx: () => void;
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
            className="flex min-h-11 items-center justify-center gap-2 rounded-btn bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-black"
          >
            <MovementIcon />
            {texts.dashboard.treasury_role.movement_modal_cta}
          </button>
        )}
        {canCreateFxOperation && (
          <button
            type="button"
            onClick={onFx}
            className="flex min-h-11 items-center justify-center gap-2 rounded-btn border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-slate-50"
          >
            <FxIcon />
            {texts.dashboard.treasury_role.fx_modal_cta}
          </button>
        )}
        <button
          type="button"
          onClick={onConciliacion}
          className="flex min-h-11 items-center justify-center gap-2 rounded-btn border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-slate-50"
        >
          <ConsolidationIcon />
          <span>{texts.dashboard.treasury_role.consolidation_cta}</span>
          {pendingConciliationCount > 0 && (
            <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-amber-100 text-eyebrow font-bold text-amber-700">
              {pendingConciliationCount}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={onMovements}
          className="flex min-h-11 items-center justify-center gap-2 rounded-btn border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-slate-50"
        >
          <MovementsListIcon />
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
                <ModalTriggerButton
                  onClick={() => onEditMovement(movement)}
                  aria-label={texts.dashboard.treasury_role.edit_movement_cta}
                  className="cursor-pointer border-0 bg-transparent p-0 text-meta font-semibold text-slate-500 hover:text-foreground"
                >
                  {texts.dashboard.treasury.movements_edit_cta}
                </ModalTriggerButton>
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
  detailHref
}: {
  accounts: TreasuryAccount[];
  detailHref: string | null;
}) {
  if (accounts.length === 0) {
    return (
      <div className="rounded-dialog border border-dashed border-border bg-secondary/30 px-4 py-5 text-sm text-muted-foreground">
        {texts.dashboard.treasury_role.empty_accounts}
      </div>
    );
  }

  return (
    <div className="rounded-card border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3.5">
        <div>
          <p className="text-sm font-semibold tracking-tight text-foreground">
            {texts.dashboard.treasury_role.tab_cuentas}
          </p>
          <p className="text-meta text-muted-foreground">
            {texts.dashboard.treasury_role.accounts_tab_description}
          </p>
        </div>
        {detailHref && (
          <NavigationLinkWithLoader
            href={detailHref}
            className="shrink-0 rounded-btn border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-slate-50"
          >
            {texts.dashboard.treasury_role.detail_accounts_cta}
          </NavigationLinkWithLoader>
        )}
      </div>
      <div className="px-4">
        {accounts.map((account) => (
          <div
            key={account.id}
            className="grid grid-cols-[auto_1fr_auto] items-center gap-3 border-b border-dashed border-slate-200 py-3 last:border-b-0"
          >
            <AccountTypeIcon accountType={account.accountType} />
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold tracking-tight text-foreground">
                {account.name}
              </p>
              <p className="mt-0.5 text-meta text-slate-500">
                {account.accountType === "bancaria"
                  ? texts.dashboard.treasury_role.account_type_bancaria
                  : account.accountType === "billetera_virtual"
                    ? texts.dashboard.treasury_role.account_type_billetera
                    : texts.dashboard.treasury_role.account_type_efectivo}
                {account.currencies.length > 0 && ` · ${account.currencies.join(", ")}`}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Movimientos tab ──────────────────────────────────────────────────────────

function MovimientosTab({
  dashboard,
  selectedAccountId,
  onSelectAccount,
  onEditMovement
}: {
  dashboard: TreasuryRoleDashboard;
  selectedAccountId: string | null;
  onSelectAccount: (id: string | null) => void;
  onEditMovement: (movement: TreasuryDashboardMovement) => void;
}) {
  const allMovementGroups = getAllMovementGroups(dashboard.movementGroups);
  const filteredGroups =
    selectedAccountId === null
      ? allMovementGroups
      : getMovementGroupsForAccount(dashboard.movementGroups, selectedAccountId);

  const isEmpty = filteredGroups.length === 0;

  return (
    <div className="space-y-3">
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
          href="/dashboard/treasury/consolidation"
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
  totalBalances,
  canCreateMovement,
  canCreateFxOperation,
  onMovement,
  onFx,
  onConciliacion,
  onMovements,
  detailHref
}: {
  dashboard: TreasuryRoleDashboard;
  totalBalances: TotalBalance[];
  canCreateMovement: boolean;
  canCreateFxOperation: boolean;
  onMovement: () => void;
  onFx: () => void;
  onConciliacion: () => void;
  onMovements: () => void;
  detailHref: string | null;
}) {
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
                {texts.dashboard.treasury_role.tab_cuentas}
              </p>
              <p className="text-meta text-muted-foreground">
                {texts.dashboard.treasury_role.balances_total_label}
              </p>
            </div>
            {detailHref && (
              <NavigationLinkWithLoader
                href={detailHref}
                className="shrink-0 rounded-btn border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-slate-50"
              >
                {texts.dashboard.treasury_role.detail_accounts_cta}
              </NavigationLinkWithLoader>
            )}
          </div>
          <div className="px-4">
            {dashboard.accounts.length === 0 ? (
              <p className="py-4 text-sm text-muted-foreground">
                {texts.dashboard.treasury_role.empty_accounts}
              </p>
            ) : (
              dashboard.accounts.map((account) => (
                <AccountRow key={account.accountId} account={account} />
              ))
            )}
          </div>
        </div>

        {/* Quick actions */}
        <QuickActions
          canCreateMovement={canCreateMovement}
          canCreateFxOperation={canCreateFxOperation}
          pendingConciliationCount={dashboard.pendingConciliationCount}
          onMovement={onMovement}
          onFx={onFx}
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
  createFxOperationAction
}: TreasuryRoleCardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState<SubTab>("resumen");
  const [activeModal, setActiveModal] = useState<"movement" | "edit_movement" | "fx" | null>(null);
  const [selectedMovement, setSelectedMovement] = useState<TreasuryDashboardMovement | null>(null);
  const [selectedMovementAccountId, setSelectedMovementAccountId] = useState<string | null>(null);
  const [isMovementSubmissionPending, setIsMovementSubmissionPending] = useState(false);
  const [isMovementUpdatePending, setIsMovementUpdatePending] = useState(false);
  const [isFxSubmissionPending, setIsFxSubmissionPending] = useState(false);

  const totalBalances = getTotalBalances(dashboard.accounts);
  const detailHref = dashboard.accounts[0]
    ? `/dashboard/treasury/accounts/${dashboard.accounts[0].accountId}`
    : null;
  const canCreateMovement = dashboard.availableActions.includes("create_movement");
  const canCreateFxOperation = dashboard.availableActions.includes("create_fx_operation");

  const pendingOverlayLabel = isMovementSubmissionPending
    ? texts.dashboard.treasury_role.create_loading
    : isMovementUpdatePending
      ? texts.dashboard.treasury_role.update_loading
      : isFxSubmissionPending
        ? texts.dashboard.treasury_role.fx_create_loading
        : null;

  useEffect(() => {
    const nextSelectedAccountId = dashboard.accounts[0]?.accountId ?? null;
    setSelectedMovementAccountId((currentAccountId) => {
      if (!nextSelectedAccountId) return null;
      if (currentAccountId && dashboard.accounts.some((a) => a.accountId === currentAccountId)) {
        return currentAccountId;
      }
      return nextSelectedAccountId;
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
            totalBalances={totalBalances}
            canCreateMovement={canCreateMovement}
            canCreateFxOperation={canCreateFxOperation}
            onMovement={() => setActiveModal("movement")}
            onFx={() => setActiveModal("fx")}
            onConciliacion={handleConciliacion}
            onMovements={() => setActiveTab("movimientos")}
            detailHref={detailHref}
          />
        )}

        {activeTab === "cuentas" && (
          <CuentasTab accounts={accounts} detailHref={detailHref} />
        )}

        {activeTab === "movimientos" && (
          <MovimientosTab
            dashboard={dashboard}
            selectedAccountId={selectedMovementAccountId}
            onSelectAccount={setSelectedMovementAccountId}
            onEditMovement={handleEditMovement}
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
      >
        <TreasuryRoleFxForm
          accounts={accounts}
          currencies={currencies}
          submitAction={handleCreateFxOperation}
          sessionDate={dashboard.sessionDate}
        />
      </Modal>
    </>
  );
}
