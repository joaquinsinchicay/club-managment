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

function EditMovementIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      className={cn("size-4", className)}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.12 2.12 0 1 1 3 3L7 19l-4 1 1-4Z" />
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
    <div>
      <p
        className={cn(
          "flex flex-wrap items-baseline gap-x-2 gap-y-1 font-semibold tracking-tight text-foreground",
          prominent ? "text-[3.25rem] leading-none sm:text-[3.5rem]" : "text-[2rem] leading-none"
        )}
      >
        <span className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {balance.currencyCode}
        </span>
        <span>{formatLocalizedAmount(balance.amount)}</span>
      </p>
    </div>
  );
}

function formatMovementGroupDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "long"
  }).format(date);
}

function getMovementGroupsForAccount(
  groups: TreasuryRoleDashboardMovementDateGroup[],
  accountId: string | null
) {
  if (!accountId) {
    return [];
  }

  return groups
    .map((group) => {
      const accountGroup = group.accounts.find((entry) => entry.accountId === accountId);

      if (!accountGroup) {
        return null;
      }

      return {
        movementDate: group.movementDate,
        movements: accountGroup.movements
      };
    })
    .filter((group): group is { movementDate: string; movements: TreasuryDashboardMovement[] } => group !== null);
}

function TreasuryRoleMovementGroups({
  groups,
  onEditMovement
}: {
  groups: Array<{
    movementDate: string;
    movements: TreasuryDashboardMovement[];
  }>;
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
              action:
                movement.canEdit ? (
                  <ModalTriggerButton
                    onClick={() => onEditMovement(movement)}
                    aria-label={texts.dashboard.treasury_role.edit_movement_cta}
                    className="min-h-11 min-w-11 rounded-[18px] border border-border bg-card px-0 py-0 text-foreground hover:bg-secondary"
                  >
                    <EditMovementIcon />
                  </ModalTriggerButton>
                ) : undefined
            }))}
            conceptLabel={texts.dashboard.treasury_role.movements_concept_label}
            accountLabel={texts.dashboard.treasury_role.movements_account_label}
            detailLabel={texts.dashboard.treasury_role.movements_detail_label}
            amountLabel={texts.dashboard.treasury_role.movements_amount_label}
            actionsLabel={texts.dashboard.treasury_role.movements_actions_label}
            createdByLabel={texts.dashboard.treasury_role.movements_created_by_label}
          />
        </section>
      ))}
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
  const [activeModal, setActiveModal] = useState<"movement" | "edit_movement" | "fx" | null>(null);
  const [selectedMovement, setSelectedMovement] = useState<TreasuryDashboardMovement | null>(null);
  const [selectedMovementAccountId, setSelectedMovementAccountId] = useState<string | null>(
    dashboard.accounts[0]?.accountId ?? null
  );
  const [isMovementSubmissionPending, setIsMovementSubmissionPending] = useState(false);
  const [isMovementUpdatePending, setIsMovementUpdatePending] = useState(false);
  const [isFxSubmissionPending, setIsFxSubmissionPending] = useState(false);
  const totalBalances = getTotalBalances(dashboard.accounts);
  const detailHref = dashboard.accounts[0] ? `/dashboard/treasury/accounts/${dashboard.accounts[0].accountId}` : null;
  const canCreateMovement = dashboard.availableActions.includes("create_movement");
  const canCreateFxOperation = dashboard.availableActions.includes("create_fx_operation");
  const filteredMovementGroups = getMovementGroupsForAccount(dashboard.movementGroups, selectedMovementAccountId);
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
      if (!nextSelectedAccountId) {
        return null;
      }

      if (currentAccountId && dashboard.accounts.some((account) => account.accountId === currentAccountId)) {
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

  return (
    <>
      <BlockingStatusOverlay open={pendingOverlayLabel !== null} label={pendingOverlayLabel ?? ""} />

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
                        <p
                          key={`${account.accountId}-${balance.currencyCode}`}
                          className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-[2rem] font-semibold leading-none tracking-tight text-foreground"
                        >
                          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            {balance.currencyCode}
                          </span>
                          <span>
                            {formatLocalizedAmount(balance.amount)}
                          </span>
                        </p>
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
              loadingLabel={texts.dashboard.treasury_role.navigation_loading}
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
            {texts.dashboard.treasury_role.movements_card_title}
          </h2>
          <p className="text-sm leading-5 text-muted-foreground">
            {texts.dashboard.treasury_role.movements_card_description}
          </p>
        </div>

        {dashboard.accounts.length > 0 ? (
          <div className="mt-5 grid gap-2">
            <p className="text-sm font-medium text-foreground">
              {texts.dashboard.treasury.account_switch_label}
            </p>
            <div className="flex flex-wrap gap-2">
              {dashboard.accounts.map((account) => (
                <button
                  key={account.accountId}
                  type="button"
                  onClick={() => setSelectedMovementAccountId(account.accountId)}
                  className={cn(
                    "rounded-full border px-3 py-2 text-sm font-medium transition",
                    account.accountId === selectedMovementAccountId
                      ? "border-foreground bg-foreground text-primary-foreground"
                      : "border-border bg-card text-foreground hover:bg-secondary"
                  )}
                  aria-pressed={account.accountId === selectedMovementAccountId}
                >
                  {account.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {filteredMovementGroups.length === 0 ? (
          <div className="mt-5 rounded-[20px] border border-dashed border-border bg-secondary/30 px-4 py-5 text-sm text-muted-foreground">
            {texts.dashboard.treasury_role.movements_empty}
          </div>
        ) : (
          <div className="mt-5">
            <TreasuryRoleMovementGroups
              groups={filteredMovementGroups}
              onEditMovement={(movement) => {
                if (!movement.canEdit) {
                  return;
                }

                setSelectedMovement(movement);
                setActiveModal("edit_movement");
              }}
            />
          </div>
        )}
      </section>

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
          calendarEvents={calendarEvents}
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
            calendarEvents={calendarEvents}
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
