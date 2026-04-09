"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

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
  createAccountTransferAction: (formData: FormData) => Promise<void>;
};

function getSessionLabel(status: DashboardTreasuryCardData["sessionStatus"]) {
  if (status === "open") {
    return texts.dashboard.treasury.session_open;
  }

  if (status === "closed") {
    return texts.dashboard.treasury.session_closed;
  }

  return texts.dashboard.treasury.session_not_started;
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
  const hasMovements = treasuryCard.movements.length > 0;
  const [activeModal, setActiveModal] = useState<"movement" | "edit_movement" | "transfer" | null>(null);
  const [selectedMovement, setSelectedMovement] = useState<DashboardTreasuryCardData["movements"][number] | null>(null);
  const [isMovementSubmissionPending, setIsMovementSubmissionPending] = useState(false);
  const [pendingMovementDisplayId, setPendingMovementDisplayId] = useState<string | null>(null);
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

  const pendingOverlayLabel = isMovementSubmissionPending
    ? texts.dashboard.treasury.create_loading
    : isMovementUpdatePending
      ? texts.dashboard.treasury.update_loading
      : null;

  return (
    <>
      {pendingOverlayLabel ? (
        <div
          aria-busy="true"
          aria-live="polite"
          className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/45 px-4"
          role="status"
        >
          <div className="flex w-full max-w-sm items-center justify-center gap-3 rounded-[28px] border border-border bg-card px-6 py-5 text-sm font-semibold text-foreground shadow-soft">
            <span
              aria-hidden="true"
              className="inline-block size-5 animate-spin rounded-full border-2 border-current border-r-transparent"
            />
            <span>{pendingOverlayLabel}</span>
          </div>
        </div>
      ) : null}

      <section className="rounded-[24px] border border-border bg-card p-5 shadow-soft sm:p-6">
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold tracking-tight text-card-foreground">
            {texts.dashboard.treasury.balances_card_title}
          </h2>
          <p className="text-sm leading-5 text-muted-foreground">
            {texts.dashboard.treasury.balances_card_description}
          </p>
        </div>

        <div className="mt-4 grid gap-3">
          <div className="rounded-[20px] border border-border bg-secondary/35 px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {texts.dashboard.treasury.session_label}
            </p>
            <p className="mt-1 text-lg font-semibold text-foreground">{getSessionLabel(treasuryCard.sessionStatus)}</p>
          </div>

          {treasuryCard.accounts.length === 0 ? (
            <div className="rounded-[20px] border border-dashed border-border bg-secondary/30 px-4 py-3 text-sm text-muted-foreground">
              {texts.dashboard.treasury.empty_accounts}
            </div>
          ) : (
            <div className="grid gap-2.5">
              {treasuryCard.accounts.map((account) => (
                <article key={account.accountId} className="rounded-[20px] border border-border bg-secondary/25 px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[15px] font-semibold text-foreground">{account.name}</p>
                    <NavigationLinkWithLoader
                      href={`/dashboard/accounts/${account.accountId}`}
                      className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      {texts.dashboard.treasury.detail_cta}
                    </NavigationLinkWithLoader>
                  </div>

                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {account.balances.map((balance) => (
                      <div
                        key={`${account.accountId}-${balance.currencyCode}`}
                        className="rounded-[18px] border border-border/70 bg-card px-4 py-2.5"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          {balance.currencyCode}
                        </p>
                        <p className="mt-1 text-lg font-semibold text-foreground">
                          {formatLocalizedAmount(balance.amount)}
                        </p>
                      </div>
                    ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-[24px] border border-border bg-card p-5 shadow-soft sm:p-6">
        <div className="space-y-1.5">
          <h2 className="text-xl font-semibold tracking-tight text-card-foreground">
            {texts.dashboard.treasury.actions_card_title}
          </h2>
          <p className="text-sm leading-5 text-muted-foreground">
            {texts.dashboard.treasury.actions_card_description}
          </p>
        </div>

        <div className="mt-4 grid gap-2.5 md:grid-cols-2">
          {canOpenSession ? (
            <NavigationLinkWithLoader
              href="/dashboard/session/open"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-[18px] bg-foreground px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
            >
              {texts.dashboard.treasury.open_session_flow_cta}
            </NavigationLinkWithLoader>
          ) : null}

          {canCloseSession ? (
            <NavigationLinkWithLoader
              href="/dashboard/session/close"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-[18px] border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary"
            >
              {texts.dashboard.treasury.close_session_flow_cta}
            </NavigationLinkWithLoader>
          ) : null}

          {canCreateMovement ? (
            <ModalTriggerButton
              onClick={() => setActiveModal("movement")}
              className="rounded-[18px] border border-border bg-card px-4 py-2.5 text-foreground hover:bg-secondary"
            >
              {texts.dashboard.treasury.movement_modal_cta}
            </ModalTriggerButton>
          ) : null}

          {canCreateMovement ? (
            <ModalTriggerButton
              onClick={() => setActiveModal("transfer")}
              className="rounded-[18px] border border-border bg-card px-4 py-2.5 text-foreground hover:bg-secondary"
            >
              {texts.dashboard.treasury.transfer_modal_cta}
            </ModalTriggerButton>
          ) : null}
        </div>
      </section>

      {hasMovements ? (
        <section className="rounded-[24px] border border-border bg-card p-5 shadow-soft sm:p-6">
          <div className="space-y-1.5">
            <h2 className="text-xl font-semibold tracking-tight text-card-foreground">
              {texts.dashboard.treasury.movements_card_title}
            </h2>
            <p className="text-sm leading-5 text-muted-foreground">
              {texts.dashboard.treasury.movements_card_description}
            </p>
          </div>

          <div className="mt-4 grid gap-2.5">
            {treasuryCard.movements.map((movement) => (
              <article key={movement.movementId} className="rounded-[20px] border border-border bg-secondary/20 px-4 py-3">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-1">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {movement.movementDisplayId}
                    </p>
                    <p className="text-sm font-semibold text-foreground">
                      {movement.accountName} · {movement.categoryName}
                    </p>
                    <p className="text-sm text-muted-foreground">{movement.concept}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-semibold text-foreground">
                      {movement.currencyCode} {formatLocalizedAmount(movement.amount)}
                    </p>
                    <p className="text-xs uppercase tracking-[0.16em] text-muted-foreground">
                      {texts.dashboard.treasury.movement_types[movement.movementType]}
                    </p>
                  </div>
                </div>

                <div className="mt-2.5 flex flex-col gap-1 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
                  <span>{formatMovementDateTime(movement.createdAt)}</span>
                  <span>
                    {texts.dashboard.treasury.movements_created_by_label}: {movement.createdByUserName}
                  </span>
                </div>

                {movement.canEdit ? (
                  <div className="mt-3 flex justify-end">
                    <ModalTriggerButton
                      onClick={() => {
                        setSelectedMovement(movement);
                        setActiveModal("edit_movement");
                      }}
                      className="min-h-10 rounded-[18px] border border-border bg-card px-4 py-2 text-foreground hover:bg-secondary"
                    >
                      {texts.dashboard.treasury.edit_movement_cta}
                    </ModalTriggerButton>
                  </div>
                ) : null}
              </article>
            ))}
          </div>
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
          submitAction={createAccountTransferAction}
          sessionDate={treasuryCard.sessionDate}
        />
      </Modal>
    </>
  );
}
