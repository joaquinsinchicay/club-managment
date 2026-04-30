import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { ChipButton } from "@/components/ui/chip";
import { EmptyState } from "@/components/ui/empty-state";
import { texts } from "@/lib/texts";
import {
  DEFAULT_MOVEMENTS_WINDOW_DAYS,
  buildMovementsWindowSubtitle,
  diffDaysInclusive,
  getAllMovementGroups,
  getMovementGroupsForAccount,
} from "@/lib/treasury-role-helpers";
import type {
  TreasuryDashboardMovement,
  TreasuryRoleDashboard,
} from "@/lib/domain/access";
import { TreasuryRoleMovementGroups } from "./movement-groups";

export function MovimientosTab({
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
  onUpdateDateRange,
  isDateRangePending,
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
  isDateRangePending: boolean;
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
  // Reset drafts si el rango remoto cambia (ej. otro componente reescribe la URL).
  useEffect(() => {
    setDraftFrom(dashboard.movementsWindow.fromDate);
    setDraftTo(dashboard.movementsWindow.toDate);
  }, [dashboard.movementsWindow.fromDate, dashboard.movementsWindow.toDate]);
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
          aria-busy={isDateRangePending}
          className="flex flex-wrap items-end gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!isDirty || isDateRangePending) return;
            onUpdateDateRange({ fromDate: draftFrom, toDate: draftTo });
          }}
        >
          <label className="flex flex-col gap-1 text-eyebrow text-muted-foreground">
            {texts.dashboard.treasury_role.movements_filter_from_label}
            <input
              type="date"
              value={draftFrom}
              max={draftTo || undefined}
              disabled={isDateRangePending}
              onChange={(event) => setDraftFrom(event.target.value)}
              className="min-h-9 rounded-btn border border-border bg-card px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <label className="flex flex-col gap-1 text-eyebrow text-muted-foreground">
            {texts.dashboard.treasury_role.movements_filter_to_label}
            <input
              type="date"
              value={draftTo}
              min={draftFrom || undefined}
              disabled={isDateRangePending}
              onChange={(event) => setDraftTo(event.target.value)}
              className="min-h-9 rounded-btn border border-border bg-card px-2.5 text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10 disabled:cursor-not-allowed disabled:opacity-60"
            />
          </label>
          <Button
            type="submit"
            variant="dark"
            size="sm"
            radius="btn"
            disabled={!isDirty || isDateRangePending}
            className="gap-1.5"
          >
            {isDateRangePending && (
              <span
                aria-hidden="true"
                className="size-3 animate-spin rounded-full border-2 border-white/40 border-t-white"
              />
            )}
            {isDateRangePending
              ? texts.dashboard.treasury_role.movements_filter_apply_pending_cta
              : texts.dashboard.treasury_role.movements_filter_apply_cta}
          </Button>
          {isCustomRange && (
            <button
              type="button"
              disabled={isDateRangePending}
              onClick={() => onUpdateDateRange({ fromDate: null, toDate: null })}
              className="rounded-btn border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary-readonly disabled:cursor-not-allowed disabled:opacity-50"
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
            className="rounded-btn border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary-readonly"
          >
            {texts.dashboard.treasury_role.movements_cta_movement}
          </button>
        )}
        {canCreateTransfer && hasMultipleAccounts && (
          <button
            type="button"
            onClick={onCreateTransfer}
            className="rounded-btn border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition hover:bg-secondary-readonly"
          >
            {texts.dashboard.treasury_role.movements_cta_transfer}
          </button>
        )}
        {canCreateFxOperation && (
          <Button variant="dark" size="sm" radius="btn" onClick={onCreateFx}>
            {texts.dashboard.treasury_role.movements_cta_fx}
          </Button>
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
