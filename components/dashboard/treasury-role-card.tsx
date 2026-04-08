"use client";

import Link from "next/link";
import { useState } from "react";

import { TreasuryRoleFxForm, TreasuryRoleMovementForm } from "@/components/dashboard/treasury-operation-forms";
import { Modal, ModalTriggerButton } from "@/components/ui/modal";
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

  return (
    <>
      <section className="rounded-[28px] border border-border bg-card p-6 shadow-soft sm:p-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-card-foreground">
            {texts.dashboard.treasury_role.title}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {texts.dashboard.treasury_role.description}
          </p>
        </div>

        <div className="mt-6 grid gap-4">
          {dashboard.accounts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
              {texts.dashboard.treasury_role.empty_accounts}
            </div>
          ) : (
            <div className="grid gap-3">
              {dashboard.accounts.map((account) => (
                <article key={account.accountId} className="rounded-[24px] border border-border bg-secondary/30 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-base font-semibold text-foreground">{account.name}</p>
                    <Link
                      href={`/dashboard/treasury/accounts/${account.accountId}`}
                      className="text-sm font-medium text-foreground underline-offset-4 hover:underline"
                    >
                      {texts.dashboard.treasury_role.detail_cta}
                    </Link>
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2">
                    {account.balances.map((balance) => (
                      <div
                        key={`${account.accountId}-${balance.currencyCode}`}
                        className="rounded-2xl border border-border/70 bg-card px-4 py-3"
                      >
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          {balance.currencyCode}
                        </p>
                        <p className="mt-1 text-xl font-semibold text-foreground">
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

      <section className="rounded-[28px] border border-border bg-card p-6 shadow-soft sm:p-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-card-foreground">
            {texts.dashboard.treasury_role.actions_card_title}
          </h2>
          <p className="text-sm leading-6 text-muted-foreground">
            {texts.dashboard.treasury_role.actions_card_description}
          </p>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <Link
            href="/dashboard/treasury"
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
          >
            {texts.dashboard.treasury_role.consolidation_cta}
          </Link>

          {dashboard.availableActions.includes("create_movement") ? (
            <ModalTriggerButton
              onClick={() => setActiveModal("movement")}
              className="border border-border bg-card text-foreground hover:bg-secondary"
            >
              {texts.dashboard.treasury_role.movement_modal_cta}
            </ModalTriggerButton>
          ) : null}

          {dashboard.availableActions.includes("create_fx_operation") ? (
            <ModalTriggerButton
              onClick={() => setActiveModal("fx")}
              className="border border-border bg-card text-foreground hover:bg-secondary"
            >
              {texts.dashboard.treasury_role.fx_modal_cta}
            </ModalTriggerButton>
          ) : null}
        </div>
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
