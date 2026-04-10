"use client";

import { useState } from "react";

import { TreasuryRoleFxForm, TreasuryRoleMovementForm } from "@/components/dashboard/treasury-operation-forms";
import { Modal } from "@/components/ui/modal";
import { NavigationLinkWithLoader } from "@/components/ui/navigation-link-with-loader";
import { formatLocalizedAmount } from "@/lib/amounts";
import type {
  ClubActivity,
  ReceiptFormat,
  TreasuryAccount,
  TreasuryCategory,
  TreasuryCurrencyConfig,
  TreasuryMovementType,
  TreasuryRoleDashboard
} from "@/lib/domain/access";
import { texts } from "@/lib/texts";
import { cn } from "@/lib/utils";

type TreasuryRoleCardProps = {
  dashboard: TreasuryRoleDashboard;
  accounts: TreasuryAccount[];
  categories: TreasuryCategory[];
  activities: ClubActivity[];
  currencies: TreasuryCurrencyConfig[];
  movementTypes: TreasuryMovementType[];
  receiptFormats: ReceiptFormat[];
  createTreasuryRoleMovementAction: (formData: FormData) => Promise<void>;
  createFxOperationAction: (formData: FormData) => Promise<void>;
};

type TotalBalance = {
  currencyCode: string;
  amount: number;
};

function getMovementAmountClassName(movementType: TreasuryMovementType) {
  return movementType === "ingreso" ? "text-success" : "text-destructive";
}

function getTotalBalances(accounts: TreasuryRoleDashboard["accounts"]): TotalBalance[] {
  const totals = new Map<string, number>();

  accounts.forEach((account) => {
    account.balances.forEach((balance) => {
      totals.set(balance.currencyCode, (totals.get(balance.currencyCode) ?? 0) + balance.amount);
    });
  });

  return [...totals.entries()]
    .map(([currencyCode, amount]) => ({
      currencyCode,
      amount
    }))
    .sort((left, right) => {
      if (left.currencyCode === "ARS") {
        return -1;
      }

      if (right.currencyCode === "ARS") {
        return 1;
      }

      return left.currencyCode.localeCompare(right.currencyCode);
    });
}

function formatMovementDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(date);
}

function ManagementActionIcon({
  kind,
  className
}: {
  kind: "consolidation" | "movement" | "fx";
  className?: string;
}) {
  const sharedProps = {
    className: cn("size-6", className),
    fill: "none",
    stroke: "currentColor",
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    strokeWidth: 2
  };

  if (kind === "movement") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" {...sharedProps}>
        <rect x="3" y="3" width="18" height="18" rx="3" />
        <path d="M7 8h10" />
        <path d="M7 12h10" />
        <path d="M12 16v-5" />
        <path d="M9.5 13.5h5" />
      </svg>
    );
  }

  if (kind === "fx") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" {...sharedProps}>
        <path d="M6 7h11" />
        <path d="m13 4 4 3-4 3" />
        <path d="M18 17H7" />
        <path d="m11 14-4 3 4 3" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" {...sharedProps}>
      <rect x="4" y="4" width="16" height="16" rx="2" />
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <path d="M4 10h16" />
      <path d="M12 13v4" />
      <path d="M10 15h4" />
    </svg>
  );
}

function ManagementActionChevron() {
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className="size-5 text-slate-300 transition group-hover:text-slate-400"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="m7 4 6 6-6 6" />
    </svg>
  );
}

function ManagementCardHeader() {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {texts.dashboard.treasury_role.actions_card_eyebrow}
        </p>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-card-foreground">
            {texts.dashboard.treasury_role.actions_card_title}
          </h2>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">
            {texts.dashboard.treasury_role.actions_card_description}
          </p>
        </div>
      </div>
      <div className="mt-1 hidden rounded-2xl border border-border bg-secondary/30 p-3 text-muted-foreground sm:flex">
        <ManagementActionIcon kind="consolidation" className="size-5" />
      </div>
    </div>
  );
}

function SummaryBalance({
  balance,
  prominent = false
}: {
  balance: TotalBalance;
  prominent?: boolean;
}) {
  return (
    <div className={cn("space-y-1", prominent ? "space-y-2" : "space-y-1.5")}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {balance.currencyCode}
      </p>
      <p
        className={cn(
          "font-semibold tracking-tight text-foreground",
          prominent ? "text-[3.25rem] leading-none sm:text-[3.5rem]" : "text-[2rem] leading-none"
        )}
      >
        {formatLocalizedAmount(balance.amount)}
      </p>
    </div>
  );
}

type ManagementActionRowProps = {
  title: string;
  description: string;
  iconKind: "consolidation" | "movement" | "fx";
  toneClassName: string;
  href?: string;
  loadingLabel?: string;
  onClick?: () => void;
  ariaLabel?: string;
};

function ManagementActionRow({
  title,
  description,
  iconKind,
  toneClassName,
  href,
  loadingLabel,
  onClick,
  ariaLabel
}: ManagementActionRowProps) {
  const content = (
    <>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-slate-100/70" />
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-5">
        <ManagementActionChevron />
      </div>
      <div className="flex min-h-[108px] items-center gap-4 px-5 py-4 pr-14 sm:px-6">
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-2xl border text-current",
            toneClassName
          )}
        >
          <ManagementActionIcon kind={iconKind} />
        </div>
        <div className="min-w-0 space-y-1">
          <p className="text-base font-semibold leading-tight tracking-tight text-foreground sm:text-[1.1rem]">
            {title}
          </p>
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground sm:text-[0.95rem]">
            {description}
          </p>
        </div>
      </div>
    </>
  );

  const sharedClassName =
    "group relative block overflow-hidden rounded-[20px] border border-border/90 bg-card text-left shadow-[0_6px_20px_rgba(15,23,42,0.04)] transition hover:border-border hover:shadow-[0_10px_26px_rgba(15,23,42,0.08)]";

  if (href) {
    return (
      <NavigationLinkWithLoader
        href={href}
        aria-label={ariaLabel ?? title}
        className={sharedClassName}
        loadingLabel={loadingLabel}
        loadingClassName="flex min-h-[108px] w-full items-center px-5 py-4 sm:px-6"
        loadingSpinnerClassName="size-5"
        loadingContentClassName="text-sm font-semibold tracking-tight text-foreground sm:text-base"
      >
        {content}
      </NavigationLinkWithLoader>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel ?? title}
      className={sharedClassName}
    >
      {content}
    </button>
  );
}

export function TreasuryRoleCard({
  dashboard,
  accounts,
  categories,
  activities,
  currencies,
  movementTypes,
  receiptFormats,
  createTreasuryRoleMovementAction,
  createFxOperationAction
}: TreasuryRoleCardProps) {
  const [activeModal, setActiveModal] = useState<"movement" | "fx" | null>(null);
  const totalBalances = getTotalBalances(dashboard.accounts);
  const detailHref = dashboard.accounts[0] ? `/dashboard/treasury/accounts/${dashboard.accounts[0].accountId}` : null;
  const canCreateMovement = dashboard.availableActions.includes("create_movement");
  const canCreateFxOperation = dashboard.availableActions.includes("create_fx_operation");

  return (
    <>
      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.95fr)]">
        <section className="rounded-[20px] border border-border bg-card p-5 sm:p-6">
          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold tracking-tight text-card-foreground">
              {texts.dashboard.treasury_role.title}
            </h2>
            <p className="text-sm leading-5 text-muted-foreground">
              {texts.dashboard.treasury_role.description}
            </p>
          </div>

          {dashboard.accounts.length === 0 ? (
            <div className="mt-5 rounded-[20px] border border-dashed border-border bg-secondary/30 px-4 py-5 text-sm text-muted-foreground">
              {texts.dashboard.treasury_role.empty_accounts}
            </div>
          ) : (
            <div className="mt-5 space-y-6">
              <div className="space-y-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {texts.dashboard.treasury_role.balances_total_label}
                </p>

                {totalBalances[0] ? <SummaryBalance balance={totalBalances[0]} prominent /> : null}

                {totalBalances.length > 1 ? (
                  <div className="grid gap-4 border-t border-border/70 pt-4 sm:grid-cols-2">
                    {totalBalances.slice(1).map((balance) => (
                      <SummaryBalance key={balance.currencyCode} balance={balance} />
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-4 border-t border-border/70 pt-4 sm:grid-cols-2">
                {dashboard.accounts.map((account) => (
                  <article key={account.accountId} className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {account.name}
                    </p>

                    <div className="space-y-3">
                      {account.balances.map((balance) => (
                        <div key={`${account.accountId}-${balance.currencyCode}`} className="space-y-1.5">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            {balance.currencyCode}
                          </p>
                          <p className="text-[2rem] font-semibold leading-none tracking-tight text-foreground">
                            {formatLocalizedAmount(balance.amount)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}

          {detailHref ? (
            <div className="mt-5">
              <NavigationLinkWithLoader
                href={detailHref}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-[12px] bg-secondary/35 px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
              >
                {texts.dashboard.treasury_role.detail_accounts_cta}
              </NavigationLinkWithLoader>
            </div>
          ) : null}
        </section>

        <section className="rounded-[20px] border border-border bg-card p-5 sm:p-6">
          <ManagementCardHeader />

          <div className="mt-6 grid gap-4">
            <ManagementActionRow
              title={texts.dashboard.treasury_role.consolidation_cta}
              description={texts.dashboard.treasury_role.consolidation_description}
              iconKind="consolidation"
              toneClassName="border-slate-200/90 bg-slate-50 text-slate-500"
              href="/dashboard/treasury/consolidation"
              loadingLabel={texts.dashboard.treasury.navigation_loading}
              ariaLabel={texts.dashboard.treasury_role.consolidation_cta}
            />

            {canCreateMovement ? (
              <ManagementActionRow
                title={texts.dashboard.treasury_role.movement_modal_cta}
                description={texts.dashboard.treasury_role.movement_modal_description}
                iconKind="movement"
                toneClassName="border-emerald-200/80 bg-emerald-50 text-emerald-600"
                onClick={() => setActiveModal("movement")}
                ariaLabel={texts.dashboard.treasury_role.movement_modal_cta}
              />
            ) : null}

            {canCreateFxOperation ? (
              <ManagementActionRow
                title={texts.dashboard.treasury_role.fx_modal_cta}
                description={texts.dashboard.treasury_role.fx_modal_description}
                iconKind="fx"
                toneClassName="border-amber-200/80 bg-amber-50 text-amber-600"
                onClick={() => setActiveModal("fx")}
                ariaLabel={texts.dashboard.treasury_role.fx_modal_cta}
              />
            ) : null}
          </div>
        </section>
      </section>

      <section className="rounded-[20px] border border-border bg-card p-5 sm:p-6">
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold tracking-tight text-card-foreground">
            {texts.dashboard.treasury_role.recent_movements_title}
          </h2>
          <p className="text-sm leading-5 text-muted-foreground">
            {texts.dashboard.treasury_role.recent_movements_description}
          </p>
        </div>

        {dashboard.movements.length === 0 ? (
          <div className="mt-5 rounded-[20px] border border-dashed border-border bg-secondary/30 px-4 py-5 text-sm text-muted-foreground">
            {texts.dashboard.treasury_role.recent_movements_empty}
          </div>
        ) : (
          <div className="mt-5">
            <div className="hidden rounded-t-[18px] border border-border bg-secondary/20 px-4 py-3 md:grid md:grid-cols-[minmax(0,2fr)_minmax(140px,0.9fr)_minmax(140px,0.9fr)_minmax(120px,0.75fr)] md:gap-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {texts.dashboard.treasury_role.movements_concept_label}
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {texts.dashboard.treasury_role.movements_amount_label}
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {texts.dashboard.treasury_role.movements_account_label}
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                {texts.dashboard.treasury_role.movements_actions_label}
              </p>
            </div>

            <div className="grid gap-3 md:gap-0">
              {dashboard.movements.map((movement, index) => (
                <article
                  key={movement.movementId}
                  className={cn(
                    "rounded-[18px] border border-border bg-card p-4 md:grid md:grid-cols-[minmax(0,2fr)_minmax(140px,0.9fr)_minmax(140px,0.9fr)_minmax(120px,0.75fr)] md:items-center md:gap-4 md:rounded-none md:border-t-0",
                    index === dashboard.movements.length - 1 && "md:rounded-b-[18px]"
                  )}
                >
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-foreground">{movement.concept}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                      {formatMovementDateTime(movement.createdAt)} · {texts.dashboard.treasury_role.movements_created_by_label}{" "}
                      {movement.createdByUserName}
                    </p>
                  </div>

                  <div className="mt-3 md:mt-0">
                    <p className={cn("text-lg font-semibold tracking-tight", getMovementAmountClassName(movement.movementType))}>
                      {movement.movementType === "egreso" ? "-" : "+"} {movement.currencyCode}{" "}
                      {formatLocalizedAmount(movement.amount)}
                    </p>
                  </div>

                  <div className="mt-3 md:mt-0">
                    <p className="inline-flex rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                      {movement.accountName}
                    </p>
                  </div>

                  <div className="mt-3 flex justify-start md:mt-0 md:justify-end">
                    <span className="text-xs font-medium text-muted-foreground">-</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}
      </section>

      <Modal
        open={activeModal === "movement"}
        onClose={() => setActiveModal(null)}
        title={texts.dashboard.treasury_role.movement_form_title}
        description={texts.dashboard.treasury_role.movement_form_description}
      >
        <TreasuryRoleMovementForm
          accounts={accounts}
          categories={categories}
          activities={activities}
          currencies={currencies}
          movementTypes={movementTypes}
          receiptFormats={receiptFormats}
          submitAction={createTreasuryRoleMovementAction}
          submitLabel={texts.dashboard.treasury_role.create_cta}
          pendingLabel={texts.dashboard.treasury_role.create_loading}
          sessionDate={dashboard.sessionDate}
        />
      </Modal>

      <Modal
        open={activeModal === "fx"}
        onClose={() => setActiveModal(null)}
        title={texts.dashboard.treasury_role.fx_form_title}
        description={texts.dashboard.treasury_role.fx_form_description}
      >
        <TreasuryRoleFxForm
          accounts={accounts}
          currencies={currencies}
          submitAction={createFxOperationAction}
          sessionDate={dashboard.sessionDate}
        />
      </Modal>
    </>
  );
}
