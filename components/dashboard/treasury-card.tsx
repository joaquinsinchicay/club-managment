"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type ReactNode, useEffect, useMemo, useState } from "react";

import {
  AccountTransferForm,
  SecretariaMovementEditForm,
  SecretariaMovementForm
} from "@/components/dashboard/treasury-operation-forms";
import { Modal, ModalTriggerButton } from "@/components/ui/modal";
import { NavigationLinkWithLoader } from "@/components/ui/navigation-link-with-loader";
import { formatLocalizedAmount, parseLocalizedAmount } from "@/lib/amounts";
import type { TreasuryActionResponse } from "@/app/(dashboard)/dashboard/treasury-actions";
import type {
  ClubActivity,
  ClubCalendarEvent,
  DashboardTreasuryCard as DashboardTreasuryCardData,
  ReceiptFormat,
  TreasuryAccount,
  TreasuryCategory,
  TreasuryCurrencyConfig,
  TreasuryMovementType
} from "@/lib/domain/access";
import { texts } from "@/lib/texts";
import { cn } from "@/lib/utils";

type TreasuryCardProps = {
  treasuryCard: DashboardTreasuryCardData;
  movementAccounts: TreasuryAccount[];
  transferSourceAccounts: TreasuryAccount[];
  transferTargetAccounts: TreasuryAccount[];
  categories: TreasuryCategory[];
  activities: ClubActivity[];
  calendarEvents: ClubCalendarEvent[];
  currencies: TreasuryCurrencyConfig[];
  movementTypes: TreasuryMovementType[];
  receiptFormats: ReceiptFormat[];
  createTreasuryMovementAction: (formData: FormData) => Promise<TreasuryActionResponse>;
  updateSecretariaMovementAction: (formData: FormData) => Promise<TreasuryActionResponse>;
  createAccountTransferAction: (formData: FormData) => Promise<TreasuryActionResponse>;
};

type TotalBalance = {
  currencyCode: string;
  amount: number;
};

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

function getActionsCardDescription(sessionStatus: DashboardTreasuryCardData["sessionStatus"]) {
  if (sessionStatus === "unresolved") {
    return texts.dashboard.treasury.actions_card_unresolved_description;
  }

  if (sessionStatus === "closed") {
    return texts.dashboard.treasury.actions_card_closed_description;
  }

  return texts.dashboard.treasury.actions_card_description;
}

function SessionActionIcon({
  kind,
  className
}: {
  kind: "open" | "movement" | "transfer" | "close";
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

  if (kind === "transfer") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" {...sharedProps}>
        <path d="M6 7h11" />
        <path d="m13 4 4 3-4 3" />
        <path d="M18 17H7" />
        <path d="m11 14-4 3 4 3" />
      </svg>
    );
  }

  if (kind === "close") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" {...sharedProps}>
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 1 1 8 0v3" />
        <circle cx="17.5" cy="17.5" r="3.5" />
        <path d="M17.5 15.8v1.9l1.2.8" />
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

function SessionActionChevron() {
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

type SessionActionRowProps = {
  title: string;
  description: string;
  iconKind: "open" | "movement" | "transfer" | "close";
  toneClassName: string;
  href?: string;
  loadingLabel?: string;
  onClick?: () => void;
  ariaLabel?: string;
};

function SessionActionRow({
  title,
  description,
  iconKind,
  toneClassName,
  href,
  loadingLabel,
  onClick,
  ariaLabel
}: SessionActionRowProps) {
  const content = (
    <>
      <div className="pointer-events-none absolute inset-y-0 left-0 w-1 bg-slate-100/70" />
      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-5">
        <SessionActionChevron />
      </div>
      <div className="flex min-h-[108px] items-center gap-4 px-5 py-4 pr-14 sm:px-6">
        <div
          className={cn(
            "flex size-12 shrink-0 items-center justify-center rounded-2xl border text-current",
            toneClassName
          )}
        >
          <SessionActionIcon kind={iconKind} />
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

function getMovementAmountClassName(movementType: TreasuryMovementType) {
  return movementType === "ingreso" ? "text-success" : "text-destructive";
}

function getTotalBalances(accounts: DashboardTreasuryCardData["accounts"]): TotalBalance[] {
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

function ActionsCardHeader({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
          {texts.dashboard.treasury.actions_card_eyebrow}
        </p>
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-card-foreground">{title}</h2>
          <p className="max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-1 hidden rounded-2xl border border-border bg-secondary/30 p-3 text-muted-foreground sm:flex">
        <SessionActionIcon kind="open" className="size-5" />
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

export function TreasuryCard({
  treasuryCard,
  movementAccounts,
  transferSourceAccounts,
  transferTargetAccounts,
  categories,
  activities,
  calendarEvents,
  currencies,
  movementTypes,
  receiptFormats,
  createTreasuryMovementAction,
  updateSecretariaMovementAction,
  createAccountTransferAction
}: TreasuryCardProps) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const canCreateMovement = treasuryCard.availableActions.includes("create_movement");
  const canCloseSession = treasuryCard.availableActions.includes("close_session");
  const canOpenSession = treasuryCard.availableActions.includes("open_session");
  const isSessionStateUnresolved = treasuryCard.sessionStatus === "unresolved";
  const isMovementDataUnresolved = treasuryCard.movementDataStatus === "unresolved";
  const shouldHideMovementsSection =
    treasuryCard.sessionStatus === "not_started" &&
    !isMovementDataUnresolved &&
    treasuryCard.movements.length === 0;
  const [activeModal, setActiveModal] = useState<"movement" | "edit_movement" | "transfer" | null>(null);
  const [selectedMovement, setSelectedMovement] = useState<DashboardTreasuryCardData["movements"][number] | null>(null);
  const [isMovementSubmissionPending, setIsMovementSubmissionPending] = useState(false);
  const [pendingMovementDisplayId, setPendingMovementDisplayId] = useState<string | null>(null);
  const [isTransferSubmissionPending, setIsTransferSubmissionPending] = useState(false);
  const [pendingTransferMovementDisplayId, setPendingTransferMovementDisplayId] = useState<string | null>(null);
  const [isMovementUpdatePending, setIsMovementUpdatePending] = useState(false);
  const [pendingMovementUpdate, setPendingMovementUpdate] = useState<{
    movementId: string;
    accountId: string;
    categoryId: string;
    movementType: TreasuryMovementType;
    activityId: string | null;
    receiptNumber: string | null;
    calendarEventId: string | null;
    concept: string;
    currencyCode: string;
    amount: number;
  } | null>(null);

  const totalBalances = useMemo(() => getTotalBalances(treasuryCard.accounts), [treasuryCard.accounts]);
  const detailHref =
    !isMovementDataUnresolved && treasuryCard.accounts[0]
      ? `/dashboard/accounts/${treasuryCard.accounts[0].accountId}`
      : null;
  const pendingOverlayLabel = isMovementSubmissionPending
    ? texts.dashboard.treasury.create_loading
    : isTransferSubmissionPending
      ? texts.dashboard.treasury.transfer_create_loading
      : isMovementUpdatePending
        ? texts.dashboard.treasury.update_loading
        : null;

  useEffect(() => {
    if (!isMovementSubmissionPending) {
      return;
    }

    if (
      pendingMovementDisplayId &&
      treasuryCard.movements.some((movement) => movement.movementDisplayId === pendingMovementDisplayId)
    ) {
      setIsMovementSubmissionPending(false);
      setPendingMovementDisplayId(null);
    }
  }, [isMovementSubmissionPending, pendingMovementDisplayId, treasuryCard.movements]);

  useEffect(() => {
    if (!isTransferSubmissionPending) {
      return;
    }

    if (
      pendingTransferMovementDisplayId &&
      treasuryCard.movements.some((movement) => movement.movementDisplayId === pendingTransferMovementDisplayId)
    ) {
      setIsTransferSubmissionPending(false);
      setPendingTransferMovementDisplayId(null);
    }
  }, [isTransferSubmissionPending, pendingTransferMovementDisplayId, treasuryCard.movements]);

  useEffect(() => {
    if (!isMovementUpdatePending || !pendingMovementUpdate) {
      return;
    }

    const matchingMovement = treasuryCard.movements.find((movement) => movement.movementId === pendingMovementUpdate.movementId);

    if (
      matchingMovement &&
      matchingMovement.accountId === pendingMovementUpdate.accountId &&
      matchingMovement.categoryId === pendingMovementUpdate.categoryId &&
      matchingMovement.movementType === pendingMovementUpdate.movementType &&
      matchingMovement.activityId === pendingMovementUpdate.activityId &&
      matchingMovement.receiptNumber === pendingMovementUpdate.receiptNumber &&
      matchingMovement.calendarEventId === pendingMovementUpdate.calendarEventId &&
      matchingMovement.concept === pendingMovementUpdate.concept &&
      matchingMovement.currencyCode === pendingMovementUpdate.currencyCode &&
      matchingMovement.amount === pendingMovementUpdate.amount
    ) {
      setIsMovementUpdatePending(false);
      setPendingMovementUpdate(null);
    }
  }, [isMovementUpdatePending, pendingMovementUpdate, treasuryCard.movements]);

  async function handleCreateTreasuryMovement(formData: FormData) {
    setIsMovementSubmissionPending(true);
    setActiveModal(null);

    try {
      const result = await createTreasuryMovementAction(formData);
      const nextParams = new URLSearchParams(searchParams.toString());

      nextParams.set("feedback", result.code);

      if (result.movementDisplayId) {
        nextParams.set("movement_id", result.movementDisplayId);
      } else {
        nextParams.delete("movement_id");
      }

      if (result.ok) {
        setPendingMovementDisplayId(result.movementDisplayId ?? null);
      } else {
        setPendingMovementDisplayId(null);
        setIsMovementSubmissionPending(false);
      }

      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
      router.refresh();
    } catch (error) {
      setPendingMovementDisplayId(null);
      setIsMovementSubmissionPending(false);
      throw error;
    }
  }

  async function handleUpdateSecretariaMovement(formData: FormData) {
    const movementId = String(formData.get("movement_id") ?? "");
    const movementType = String(formData.get("movement_type") ?? "");
    const amount = String(formData.get("amount") ?? "");
    const parsedAmount = parseLocalizedAmount(amount);

    setIsMovementUpdatePending(true);
    setActiveModal(null);
    setPendingMovementUpdate({
      movementId,
      accountId: String(formData.get("account_id") ?? ""),
      categoryId: String(formData.get("category_id") ?? ""),
      movementType: movementType === "egreso" ? "egreso" : "ingreso",
      activityId: String(formData.get("activity_id") ?? "").trim() || null,
      receiptNumber: String(formData.get("receipt_number") ?? "").trim() || null,
      calendarEventId: String(formData.get("calendar_event_id") ?? "").trim() || null,
      concept: String(formData.get("concept") ?? "").trim(),
      currencyCode: String(formData.get("currency_code") ?? ""),
      amount: parsedAmount ?? 0
    });

    try {
      const result = await updateSecretariaMovementAction(formData);
      const nextParams = new URLSearchParams(searchParams.toString());

      nextParams.set("feedback", result.code);
      nextParams.delete("movement_id");

      if (!result.ok) {
        setPendingMovementUpdate(null);
        setIsMovementUpdatePending(false);
      }

      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
      router.refresh();
    } catch (error) {
      setPendingMovementUpdate(null);
      setIsMovementUpdatePending(false);
      throw error;
    }
  }

  async function handleCreateAccountTransfer(formData: FormData) {
    setIsTransferSubmissionPending(true);
    setActiveModal(null);

    try {
      const result = await createAccountTransferAction(formData);
      const nextParams = new URLSearchParams(searchParams.toString());

      nextParams.set("feedback", result.code);

      if (result.movementDisplayId) {
        nextParams.set("movement_id", result.movementDisplayId);
      } else {
        nextParams.delete("movement_id");
      }

      if (result.ok) {
        setPendingTransferMovementDisplayId(result.movementDisplayId ?? null);
      } else {
        setPendingTransferMovementDisplayId(null);
        setIsTransferSubmissionPending(false);
      }

      router.replace(`${pathname}?${nextParams.toString()}`, { scroll: false });
      router.refresh();
    } catch (error) {
      setPendingTransferMovementDisplayId(null);
      setIsTransferSubmissionPending(false);
      throw error;
    }
  }

  return (
    <>
      {pendingOverlayLabel ? (
        <div className="rounded-xl border border-border bg-card px-4 py-3 text-sm font-medium text-foreground">
          {pendingOverlayLabel}
        </div>
      ) : null}

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(280px,0.95fr)]">
        <section className="rounded-[20px] border border-border bg-card p-5 sm:p-6">
          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold tracking-tight text-card-foreground">
              {texts.dashboard.treasury.balances_card_title}
            </h2>
            <p className="text-sm leading-5 text-muted-foreground">
              {texts.dashboard.treasury.balances_card_description}
            </p>
          </div>

          {isMovementDataUnresolved ? (
            <div className="mt-5 rounded-[20px] border border-dashed border-border bg-secondary/30 px-4 py-5 text-sm text-muted-foreground">
              {texts.dashboard.treasury.balances_unresolved}
            </div>
          ) : treasuryCard.accounts.length === 0 ? (
            <div className="mt-5 rounded-[20px] border border-dashed border-border bg-secondary/30 px-4 py-5 text-sm text-muted-foreground">
              {texts.dashboard.treasury.empty_accounts}
            </div>
          ) : (
            <div className="mt-5 space-y-6">
              <div className="space-y-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {texts.dashboard.treasury.balances_total_label}
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
                {treasuryCard.accounts.map((account) => (
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
                {texts.dashboard.treasury.detail_accounts_cta}
              </NavigationLinkWithLoader>
            </div>
          ) : null}
        </section>

        <section className="rounded-[20px] border border-border bg-card p-5 sm:p-6">
          <ActionsCardHeader
            title={texts.dashboard.treasury.actions_card_title}
            description={getActionsCardDescription(treasuryCard.sessionStatus)}
          />

          <div className="mt-6 grid gap-4">
            {canOpenSession ? (
              <SessionActionRow
                title={texts.dashboard.treasury.open_session_flow_cta}
                description={texts.dashboard.treasury.open_session_flow_description}
                iconKind="open"
                toneClassName="border-emerald-200/80 bg-emerald-50 text-emerald-600"
                href="/dashboard/session/open"
                loadingLabel={texts.dashboard.treasury.navigation_loading}
                ariaLabel={texts.dashboard.treasury.open_session_flow_cta}
              />
            ) : null}

            {canCreateMovement ? (
              <SessionActionRow
                title={texts.dashboard.treasury.movement_modal_cta}
                description={texts.dashboard.treasury.movement_modal_description}
                iconKind="movement"
                toneClassName="border-emerald-200/80 bg-emerald-50 text-emerald-600"
                onClick={() => setActiveModal("movement")}
                ariaLabel={texts.dashboard.treasury.movement_modal_cta}
              />
            ) : null}

            {canCreateMovement ? (
              <SessionActionRow
                title={texts.dashboard.treasury.transfer_modal_cta}
                description={texts.dashboard.treasury.transfer_modal_description}
                iconKind="transfer"
                toneClassName="border-slate-200/90 bg-slate-50 text-slate-500"
                onClick={() => setActiveModal("transfer")}
                ariaLabel={texts.dashboard.treasury.transfer_modal_cta}
              />
            ) : null}

            {canCloseSession ? (
              <SessionActionRow
                title={texts.dashboard.treasury.close_session_flow_cta}
                description={texts.dashboard.treasury.close_session_flow_description}
                iconKind="close"
                toneClassName="border-rose-200/80 bg-rose-50 text-rose-500"
                href="/dashboard/session/close"
                loadingLabel={texts.dashboard.treasury.navigation_loading}
                ariaLabel={texts.dashboard.treasury.close_session_flow_cta}
              />
            ) : null}
          </div>
        </section>
      </section>

      {!shouldHideMovementsSection ? (
        <section className="rounded-[20px] border border-border bg-card p-5 sm:p-6">
          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold tracking-tight text-card-foreground">
              {texts.dashboard.treasury.movements_card_title}
            </h2>
            <p className="text-sm leading-5 text-muted-foreground">
              {texts.dashboard.treasury.movements_card_description}
            </p>
          </div>

          {isSessionStateUnresolved || isMovementDataUnresolved ? (
            <div className="mt-5 rounded-[20px] border border-dashed border-border bg-secondary/30 px-4 py-5 text-sm text-muted-foreground">
              {texts.dashboard.treasury.movements_unresolved}
            </div>
          ) : treasuryCard.movements.length === 0 ? (
            <div className="mt-5 rounded-[20px] border border-dashed border-border bg-secondary/30 px-4 py-5 text-sm text-muted-foreground">
              {texts.dashboard.treasury.movements_empty}
            </div>
          ) : (
            <div className="mt-5">
              <div className="hidden rounded-t-[18px] border border-border bg-secondary/20 px-4 py-3 md:grid md:grid-cols-[minmax(0,2fr)_minmax(140px,0.9fr)_minmax(140px,0.9fr)_minmax(120px,0.75fr)] md:gap-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {texts.dashboard.treasury.movements_concept_label}
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {texts.dashboard.treasury.movements_amount_label}
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {texts.dashboard.treasury.movements_account_label}
                </p>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {texts.dashboard.treasury.movements_actions_label}
                </p>
              </div>

              <div className="grid gap-3 md:gap-0">
                {treasuryCard.movements.map((movement, index) => (
                  <article
                    key={movement.movementId}
                    className={cn(
                      "rounded-[18px] border border-border bg-card p-4 md:grid md:grid-cols-[minmax(0,2fr)_minmax(140px,0.9fr)_minmax(140px,0.9fr)_minmax(120px,0.75fr)] md:items-center md:gap-4 md:rounded-none md:border-t-0",
                      index === 0 && "md:rounded-t-none",
                      index === treasuryCard.movements.length - 1 && "md:rounded-b-[18px]"
                    )}
                  >
                    <div className="min-w-0">
                      <p className="truncate text-base font-semibold text-foreground">{movement.concept}</p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                        {formatMovementDateTime(movement.createdAt)} · {texts.dashboard.treasury.movements_created_by_label}{" "}
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
                      {movement.canEdit ? (
                        <ModalTriggerButton
                          onClick={() => {
                            setSelectedMovement(movement);
                            setActiveModal("edit_movement");
                          }}
                          className="min-h-10 rounded-[18px] border border-border bg-card px-4 py-2 text-foreground hover:bg-secondary"
                        >
                          {texts.dashboard.treasury.edit_movement_cta}
                        </ModalTriggerButton>
                      ) : (
                        <span className="text-xs font-medium text-muted-foreground">-</span>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            </div>
          )}
        </section>
      ) : null}

      <Modal
        open={activeModal === "movement"}
        onClose={() => setActiveModal(null)}
        title={texts.dashboard.treasury.movement_form_title}
        description={texts.dashboard.treasury.movement_form_description}
        closeDisabled={isMovementSubmissionPending || isMovementUpdatePending}
      >
        <SecretariaMovementForm
          accounts={movementAccounts}
          categories={categories}
          activities={activities}
          calendarEvents={calendarEvents}
          currencies={currencies}
          movementTypes={movementTypes}
          receiptFormats={receiptFormats}
          submitAction={handleCreateTreasuryMovement}
          submitLabel={texts.dashboard.treasury.create_cta}
          pendingLabel={texts.dashboard.treasury.create_loading}
          sessionDate={treasuryCard.sessionDate}
        />
      </Modal>

      <Modal
        open={activeModal === "edit_movement" && selectedMovement !== null}
        onClose={() => {
          setActiveModal(null);
          setSelectedMovement(null);
        }}
        title={texts.dashboard.treasury.edit_form_title}
        description={texts.dashboard.treasury.edit_form_description}
        closeDisabled={isMovementSubmissionPending || isMovementUpdatePending}
      >
        {selectedMovement ? (
          <SecretariaMovementEditForm
            accounts={movementAccounts}
            categories={categories}
            activities={activities}
            calendarEvents={calendarEvents}
            currencies={currencies}
            movementTypes={movementTypes}
            receiptFormats={receiptFormats}
            submitAction={handleUpdateSecretariaMovement}
            submitLabel={texts.dashboard.treasury.update_cta}
            pendingLabel={texts.dashboard.treasury.update_loading}
            movement={selectedMovement}
          />
        ) : null}
      </Modal>

      <Modal
        open={activeModal === "transfer"}
        onClose={() => setActiveModal(null)}
        title={texts.dashboard.treasury.transfer_form_title}
        description={texts.dashboard.treasury.transfer_form_description}
      >
        <AccountTransferForm
          sourceAccounts={transferSourceAccounts}
          targetAccounts={transferTargetAccounts}
          currencies={currencies}
          submitAction={handleCreateAccountTransfer}
          sessionDate={treasuryCard.sessionDate}
        />
      </Modal>
    </>
  );
}
