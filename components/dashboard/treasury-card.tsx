"use client";

import Link from "next/link";
import { useState } from "react";

import { AccountTransferForm, SecretariaMovementForm } from "@/components/dashboard/treasury-operation-forms";
import { Modal, ModalTriggerButton } from "@/components/ui/modal";
import { formatLocalizedAmount } from "@/lib/amounts";
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
  accounts: TreasuryAccount[];
  categories: TreasuryCategory[];
  activities: ClubActivity[];
  calendarEvents: ClubCalendarEvent[];
  currencies: TreasuryCurrencyConfig[];
  movementTypes: TreasuryMovementType[];
  receiptFormats: ReceiptFormat[];
  createTreasuryMovementAction: (formData: FormData) => Promise<void>;
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
  accounts,
  categories,
  activities,
  calendarEvents,
  currencies,
  movementTypes,
  receiptFormats,
  createTreasuryMovementAction,
  createAccountTransferAction
}: TreasuryCardProps) {
  const canCreateMovement = treasuryCard.availableActions.includes("create_movement");
  const canCloseSession = treasuryCard.availableActions.includes("close_session");
  const canOpenSession = treasuryCard.availableActions.includes("open_session");
  const hasMovements = treasuryCard.movements.length > 0;
  const [activeModal, setActiveModal] = useState<"movement" | "transfer" | null>(null);

  return (
    <>
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
                    <Link
                      href={`/dashboard/accounts/${account.accountId}`}
                      className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      {texts.dashboard.treasury.detail_cta}
                    </Link>
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
            <Link
              href="/dashboard/session/open"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-[18px] bg-foreground px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
            >
              {texts.dashboard.treasury.open_session_flow_cta}
            </Link>
          ) : null}

          {canCloseSession ? (
            <Link
              href="/dashboard/session/close"
              className="inline-flex min-h-11 w-full items-center justify-center rounded-[18px] border border-border bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:bg-secondary"
            >
              {texts.dashboard.treasury.close_session_flow_cta}
            </Link>
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
      >
        <SecretariaMovementForm
          accounts={accounts}
          categories={categories}
          activities={activities}
          calendarEvents={calendarEvents}
          currencies={currencies}
          movementTypes={movementTypes}
          receiptFormats={receiptFormats}
          submitAction={createTreasuryMovementAction}
          submitLabel={texts.dashboard.treasury.create_cta}
          pendingLabel={texts.dashboard.treasury.create_loading}
          sessionDate={treasuryCard.sessionDate}
        />
      </Modal>

      <Modal
        open={activeModal === "transfer"}
        onClose={() => setActiveModal(null)}
        title={texts.dashboard.treasury.transfer_form_title}
        description={texts.dashboard.treasury.transfer_form_description}
      >
        <AccountTransferForm
          accounts={accounts}
          currencies={currencies}
          submitAction={createAccountTransferAction}
          sessionDate={treasuryCard.sessionDate}
        />
      </Modal>
    </>
  );
}
