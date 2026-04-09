"use client";

import { useMemo, useState } from "react";

import { AppHeader } from "@/components/navigation/app-header";
import { CardShell } from "@/components/ui/card-shell";
import { NavigationLinkWithLoader } from "@/components/ui/navigation-link-with-loader";
import { PendingFieldset, PendingSubmitButton } from "@/components/ui/pending-form";
import { formatLocalizedAmount, parseLocalizedAmount } from "@/lib/amounts";
import { texts } from "@/lib/texts";
import type { SessionContext } from "@/lib/auth/service";
import type { DailyCashSessionValidation } from "@/lib/domain/access";

type DailySessionBalanceCardProps = {
  context: SessionContext;
  validation: DailyCashSessionValidation;
  submitAction: (formData: FormData) => Promise<void>;
};

type DraftState = {
  accountId: string;
  accountName: string;
  currencyCode: string;
  expectedBalance: number;
  declaredBalance: string;
};

function getPageCopy(mode: DailyCashSessionValidation["mode"]) {
  if (mode === "open") {
    return {
      eyebrow: texts.dashboard.treasury.opening_eyebrow,
      title: texts.dashboard.treasury.opening_title,
      description: texts.dashboard.treasury.opening_description,
      submitLabel: texts.dashboard.treasury.confirm_open_session_cta
    };
  }

  return {
    eyebrow: texts.dashboard.treasury.closing_eyebrow,
    title: texts.dashboard.treasury.closing_title,
    description: texts.dashboard.treasury.closing_description,
    submitLabel: texts.dashboard.treasury.confirm_close_session_cta
  };
}

function buildDifference(expectedBalance: number, declaredBalance: string) {
  if (declaredBalance.trim() === "") {
    return { differenceAmount: 0, adjustmentType: null as "ingreso" | "egreso" | null };
  }

  const parsedBalance = parseLocalizedAmount(declaredBalance);

  if (parsedBalance === null) {
    return { differenceAmount: 0, adjustmentType: null as "ingreso" | "egreso" | null };
  }

  const differenceAmount = parsedBalance - expectedBalance;

  return {
    differenceAmount,
    adjustmentType:
      differenceAmount === 0 ? null : differenceAmount > 0 ? "ingreso" : "egreso"
  } as {
    differenceAmount: number;
    adjustmentType: "ingreso" | "egreso" | null;
  };
}

function getMovementTypeLabel(type: "ingreso" | "egreso") {
  return texts.dashboard.treasury.movement_types[type];
}

export function DailySessionBalanceCard({
  context,
  validation,
  submitAction
}: DailySessionBalanceCardProps) {
  const pageCopy = getPageCopy(validation.mode);
  const [drafts, setDrafts] = useState<DraftState[]>(
    validation.accounts.map((account) => ({
      accountId: account.accountId,
      accountName: account.accountName,
      currencyCode: account.currencyCode,
      expectedBalance: account.expectedBalance,
      declaredBalance:
        validation.mode === "close"
          ? formatLocalizedAmount(0)
          : formatLocalizedAmount(account.declaredBalance)
    }))
  );

  const adjustments = useMemo(
    () =>
      drafts
        .map((draft) => {
          const difference = buildDifference(draft.expectedBalance, draft.declaredBalance);

          return {
            ...draft,
            differenceAmount: difference.differenceAmount,
            adjustmentType: difference.adjustmentType
          };
        })
        .filter((draft) => draft.adjustmentType !== null),
    [drafts]
  );

  return (
    <div className="min-h-screen">
      <AppHeader context={context} />

      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        <CardShell
          eyebrow={pageCopy.eyebrow}
          title={pageCopy.title}
          description={pageCopy.description}
          className="max-w-4xl"
        >
          <div className="space-y-5">
            <p className="text-sm leading-6 text-muted-foreground">
              {texts.dashboard.treasury.session_validation_description}
            </p>

            {drafts.length === 0 ? (
              <div className="space-y-4 rounded-2xl border border-dashed border-border bg-secondary/30 p-4">
                <p className="text-sm text-muted-foreground">
                  {texts.dashboard.treasury.session_validation_empty}
                </p>
                <NavigationLinkWithLoader
                  href="/dashboard"
                  className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                >
                  {texts.dashboard.treasury.back_to_dashboard_cta}
                </NavigationLinkWithLoader>
              </div>
            ) : (
              <form action={submitAction} className="space-y-5">
                <PendingFieldset className="space-y-5">
                  <div className="grid gap-4">
                    {drafts.map((draft, index) => {
                      const difference = buildDifference(draft.expectedBalance, draft.declaredBalance);
                      const adjustmentType = difference.adjustmentType;

                      return (
                        <article
                          key={`${draft.accountId}-${draft.currencyCode}`}
                          className="rounded-2xl border border-border bg-secondary/40 p-4"
                        >
                          <input type="hidden" name="account_id" value={draft.accountId} />
                          <input type="hidden" name="currency_code" value={draft.currencyCode} />

                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-foreground">{draft.accountName}</p>
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                {draft.currencyCode}
                              </p>
                            </div>
                            <div className="rounded-full border border-border bg-card px-3 py-1 text-xs font-medium text-muted-foreground">
                              {validation.sessionDate}
                            </div>
                          </div>

                          <div className="mt-4 grid gap-3 sm:grid-cols-3">
                            <div className="rounded-2xl border border-border bg-card px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                {texts.dashboard.treasury.expected_balance_label}
                              </p>
                              <p className="mt-1 text-base font-semibold text-foreground">
                                {formatLocalizedAmount(draft.expectedBalance)}
                              </p>
                            </div>

                            <label className="grid gap-2 text-sm text-foreground">
                              <span className="font-medium">{texts.dashboard.treasury.declared_balance_label}</span>
                              <input
                                type="text"
                                name="declared_balance"
                                inputMode="decimal"
                                value={draft.declaredBalance}
                                onChange={(event) => {
                                  const nextValue = event.target.value;

                                  setDrafts((currentDrafts) =>
                                    currentDrafts.map((entry, entryIndex) =>
                                      entryIndex === index ? { ...entry, declaredBalance: nextValue } : entry
                                    )
                                  );
                                }}
                                className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground"
                              />
                            </label>

                            <div className="rounded-2xl border border-border bg-card px-4 py-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                {texts.dashboard.treasury.difference_label}
                              </p>
                              <p className="mt-1 text-base font-semibold text-foreground">
                                {formatLocalizedAmount(difference.differenceAmount)}
                              </p>
                            </div>
                          </div>

                          {adjustmentType ? (
                            <p className="mt-3 text-sm text-muted-foreground">
                              {texts.dashboard.treasury.adjustment_message}{" "}
                              <span className="font-semibold text-foreground">
                                {getMovementTypeLabel(adjustmentType)}
                              </span>
                            </p>
                          ) : null}
                        </article>
                      );
                    })}
                  </div>

                  {adjustments.length > 0 ? (
                    <div className="rounded-[24px] border border-border bg-card p-4">
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-foreground">
                          {texts.dashboard.treasury.adjustment_preview_title}
                        </h3>
                        <p className="text-sm leading-6 text-muted-foreground">
                          {texts.dashboard.treasury.adjustment_preview_description}
                        </p>
                      </div>

                      <div className="mt-4 grid gap-3">
                        {adjustments.map((adjustment) => (
                          <div
                            key={`${adjustment.accountId}-${adjustment.currencyCode}`}
                            className="rounded-2xl border border-border bg-secondary/40 px-4 py-3"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <p className="text-sm font-semibold text-foreground">
                                {adjustment.accountName}
                              </p>
                              <span className="text-sm font-semibold text-foreground">
                                {adjustment.currencyCode} {formatLocalizedAmount(Math.abs(adjustment.differenceAmount))}
                              </span>
                            </div>
                            <p className="mt-2 text-sm text-muted-foreground">
                              {adjustment.adjustmentType
                                ? getMovementTypeLabel(adjustment.adjustmentType)
                                : null}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div className="grid gap-3 sm:grid-cols-2">
                    <PendingSubmitButton
                      idleLabel={pageCopy.submitLabel}
                      pendingLabel={validation.mode === "open"
                        ? texts.dashboard.treasury.confirm_open_session_loading
                        : texts.dashboard.treasury.confirm_close_session_loading}
                      className="min-h-11 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
                    />
                    <NavigationLinkWithLoader
                      href="/dashboard"
                      className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                    >
                      {texts.dashboard.treasury.cancel_session_cta}
                    </NavigationLinkWithLoader>
                  </div>
                </PendingFieldset>
              </form>
            )}
          </div>
        </CardShell>
      </main>
    </div>
  );
}
