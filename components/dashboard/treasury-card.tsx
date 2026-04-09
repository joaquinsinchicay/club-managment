"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

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
  if (sessionStatus === "closed") {
    return texts.dashboard.treasury.actions_card_closed_description;
  }

  return texts.dashboard.treasury.actions_card_description;
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

function SummaryBalance({
  balance,
  prominent = false
}: {
  balance: TotalBalance;
  prominent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-secondary/35 px-4 py-3",
        prominent && "bg-secondary/55 p-5"
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
        {balance.currencyCode}
      </p>
      <p className={cn("mt-2 font-semibold tracking-tight text-foreground", prominent ? "text-4xl" : "text-2xl")}>
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
  const detailHref = treasuryCard.accounts[0] ? `/dashboard/accounts/${treasuryCard.accounts[0].accountId}` : null;
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

          {treasuryCard.accounts.length === 0 ? (
            <div className="mt-5 rounded-[20px] border border-dashed border-border bg-secondary/30 px-4 py-5 text-sm text-muted-foreground">
              {texts.dashboard.treasury.empty_accounts}
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <div className="rounded-[20px] border border-border bg-secondary/30 p-4 sm:p-5">
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {texts.dashboard.treasury.balances_total_label}
                </p>

                {totalBalances[0] ? <SummaryBalance balance={totalBalances[0]} prominent /> : null}

                {totalBalances.length > 1 ? (
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    {totalBalances.slice(1).map((balance) => (
                      <SummaryBalance key={balance.currencyCode} balance={balance} />
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {treasuryCard.accounts.map((account) => (
                  <article key={account.accountId} className="rounded-[20px] border border-border bg-card p-4">
                    <p className="text-sm font-semibold text-foreground">{account.name}</p>

                    <div className="mt-3 grid gap-2">
                      {account.balances.map((balance) => (
                        <div
                          key={`${account.accountId}-${balance.currencyCode}`}
                          className="rounded-xl border border-border bg-secondary/25 px-4 py-3"
                        >
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                            {balance.currencyCode}
                          </p>
                          <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">
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
                className="inline-flex min-h-11 w-full items-center justify-center rounded-[18px] border border-border bg-secondary/35 px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
              >
                {texts.dashboard.treasury.detail_accounts_cta}
              </NavigationLinkWithLoader>
            </div>
          ) : null}
        </section>

        <section className="rounded-[20px] border border-border bg-card p-5 sm:p-6">
          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold tracking-tight text-card-foreground">
              {texts.dashboard.treasury.actions_card_title}
            </h2>
            <p className="text-sm leading-5 text-muted-foreground">
              {getActionsCardDescription(treasuryCard.sessionStatus)}
            </p>
          </div>

          <div className="mt-5 grid gap-3">
            {canOpenSession ? (
              <NavigationLinkWithLoader
                href="/dashboard/session/open"
                className="inline-flex min-h-14 w-full items-center justify-center rounded-[18px] bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
              >
                {texts.dashboard.treasury.open_session_flow_cta}
              </NavigationLinkWithLoader>
            ) : null}

            {canCreateMovement ? (
              <ModalTriggerButton
                onClick={() => setActiveModal("movement")}
                className="min-h-14 justify-center rounded-[18px] border border-border bg-card px-4 py-3 text-foreground hover:bg-secondary"
              >
                {texts.dashboard.treasury.movement_modal_cta}
              </ModalTriggerButton>
            ) : null}

            {canCreateMovement ? (
              <ModalTriggerButton
                onClick={() => setActiveModal("transfer")}
                className="min-h-14 justify-center rounded-[18px] border border-border bg-card px-4 py-3 text-foreground hover:bg-secondary"
              >
                {texts.dashboard.treasury.transfer_modal_cta}
              </ModalTriggerButton>
            ) : null}

            {canCloseSession ? (
              <NavigationLinkWithLoader
                href="/dashboard/session/close"
                className="inline-flex min-h-14 w-full items-center justify-center rounded-[18px] border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
              >
                {texts.dashboard.treasury.close_session_flow_cta}
              </NavigationLinkWithLoader>
            ) : null}
          </div>
        </section>
      </section>

      <section className="rounded-[20px] border border-border bg-card p-5 sm:p-6">
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold tracking-tight text-card-foreground">
            {texts.dashboard.treasury.movements_card_title}
          </h2>
          <p className="text-sm leading-5 text-muted-foreground">
            {texts.dashboard.treasury.movements_card_description}
          </p>
        </div>

        {treasuryCard.movements.length === 0 ? (
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
