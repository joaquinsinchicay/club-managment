import Link from "next/link";

import type { TreasuryAccount, TreasuryAccountDetail } from "@/lib/domain/access";
import { formatLocalizedAmount } from "@/lib/amounts";
import { AppHeader } from "@/components/navigation/app-header";
import { CardShell } from "@/components/ui/card-shell";
import { texts } from "@/lib/texts";
import type { SessionContext } from "@/lib/auth/service";

type AccountDetailCardProps = {
  context: SessionContext;
  detail: TreasuryAccountDetail | null;
  accounts: TreasuryAccount[];
  currentAccountId?: string;
  canCreateMovement: boolean;
  accountHrefBase: string;
  secondaryActionHref?: string;
  secondaryActionLabel?: string;
  emptyAccountsLabel?: string;
};

function getSessionLabel(status: TreasuryAccountDetail["sessionStatus"]) {
  if (status === "open") {
    return texts.dashboard.treasury.session_open;
  }

  if (status === "closed") {
    return texts.dashboard.treasury.session_closed;
  }

  return texts.dashboard.treasury.session_not_started;
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

export function AccountDetailCard({
  context,
  detail,
  accounts,
  currentAccountId,
  canCreateMovement,
  accountHrefBase,
  secondaryActionHref,
  secondaryActionLabel,
  emptyAccountsLabel = texts.dashboard.treasury.empty_accounts
}: AccountDetailCardProps) {
  const movementGroups = detail
    ? Array.from(
        detail.movements.reduce((groups, movement) => {
          const currentGroup = groups.get(movement.movementDate) ?? [];
          currentGroup.push(movement);
          groups.set(movement.movementDate, currentGroup);
          return groups;
        }, new Map<string, typeof detail.movements>()).entries()
      )
        .sort(([leftDate], [rightDate]) => rightDate.localeCompare(leftDate))
        .map(([movementDate, movements]) => ({
          movementDate,
          movements: [...movements].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        }))
    : [];

  return (
    <div className="min-h-screen">
      <AppHeader context={context} />

      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        <CardShell
          eyebrow={texts.dashboard.treasury.detail_eyebrow}
          title={texts.dashboard.treasury.detail_title}
          description={texts.dashboard.treasury.detail_description}
          className="max-w-4xl"
        >
          <div className="space-y-5">
            {accounts.length > 0 ? (
              <div className="grid gap-2">
                <p className="text-sm font-medium text-foreground">
                  {texts.dashboard.treasury.account_switch_label}
                </p>
                <div className="flex flex-wrap gap-2">
                  {accounts.map((account) => (
                    <Link
                      key={account.id}
                      href={`${accountHrefBase}/${account.id}`}
                      className={`rounded-full px-3 py-2 text-sm font-medium transition ${
                        account.id === currentAccountId
                          ? "bg-foreground text-primary-foreground"
                          : "border border-border bg-card text-foreground hover:bg-secondary"
                      }`}
                    >
                      {account.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
                {emptyAccountsLabel}
              </div>
            )}

            {detail ? (
              <>
                <div className="grid gap-3 rounded-2xl border border-border bg-secondary/50 p-4 sm:grid-cols-2">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {texts.dashboard.treasury.detail_account_label}
                    </p>
                    <p className="mt-1 text-base font-semibold text-foreground">
                      {detail.account.name}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                      {texts.dashboard.treasury.session_label}
                    </p>
                    <p className="mt-1 text-base font-semibold text-foreground">
                      {getSessionLabel(detail.sessionStatus)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  {detail.balances.map((balance) => (
                    <div
                      key={`${detail.account.accountId}-${balance.currencyCode}`}
                      className="rounded-2xl border border-border bg-card px-4 py-3"
                    >
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                        {balance.currencyCode}
                      </p>
                      <p className="mt-1 text-base font-semibold text-foreground">
                        {formatLocalizedAmount(balance.amount)}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-3">
                  {canCreateMovement ? (
                    <Link
                      href="/dashboard"
                      className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
                    >
                      {texts.dashboard.treasury.detail_create_movement_cta}
                    </Link>
                  ) : null}

                  {secondaryActionHref && secondaryActionLabel ? (
                    <Link
                      href={secondaryActionHref}
                      className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                    >
                      {secondaryActionLabel}
                    </Link>
                  ) : null}
                </div>

                {detail.movements.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
                    {texts.dashboard.treasury.detail_empty_movements}
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {movementGroups.map((group) => (
                      <section key={group.movementDate} className="space-y-3">
                        <div className="rounded-2xl border border-border bg-card px-4 py-3">
                          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            {texts.dashboard.treasury.date_label}
                          </p>
                          <p className="mt-1 text-base font-semibold text-foreground">
                            {formatMovementGroupDate(group.movementDate)}
                          </p>
                        </div>

                        <div className="grid gap-3">
                          {group.movements.map((movement) => (
                            <article
                              key={movement.movementId}
                              className="rounded-2xl border border-border bg-secondary/40 p-4"
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div>
                                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                    {movement.movementDisplayId}
                                  </p>
                                  <p className="text-sm font-semibold text-foreground">{movement.concept}</p>
                                </div>
                                <span className="text-sm font-semibold text-foreground">
                                  {movement.currencyCode} {formatLocalizedAmount(movement.amount)}
                                </span>
                              </div>
                              <div className="mt-2 grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
                                <p>{movement.categoryName || texts.dashboard.treasury.detail_uncategorized_category}</p>
                                <p className="capitalize">{movement.movementType}</p>
                                <p>{movement.movementDate}</p>
                                <p>{movement.createdByUserName}</p>
                                {movement.activityName ? (
                                  <p className="sm:col-span-2">
                                    <span className="font-medium text-foreground">
                                      {texts.dashboard.treasury.detail_activity_label}
                                    </span>{" "}
                                    {movement.activityName}
                                  </p>
                                ) : null}
                                {movement.calendarEventTitle ? (
                                  <p className="sm:col-span-2">
                                    <span className="font-medium text-foreground">
                                      {texts.dashboard.treasury.detail_calendar_label}
                                    </span>{" "}
                                    {movement.calendarEventTitle}
                                  </p>
                                ) : null}
                                {movement.transferReference ? (
                                  <p className="sm:col-span-2">
                                    <span className="font-medium text-foreground">
                                      {texts.dashboard.treasury.detail_transfer_label}
                                    </span>{" "}
                                    {movement.transferReference}
                                  </p>
                                ) : null}
                                {movement.fxOperationReference ? (
                                  <p className="sm:col-span-2">
                                    <span className="font-medium text-foreground">
                                      {texts.dashboard.treasury.detail_fx_label}
                                    </span>{" "}
                                    {movement.fxOperationReference}
                                  </p>
                                ) : null}
                                {movement.receiptNumber ? (
                                  <p className="sm:col-span-2">
                                    <span className="font-medium text-foreground">
                                      {texts.dashboard.treasury.detail_receipt_label}
                                    </span>{" "}
                                    {movement.receiptNumber}
                                  </p>
                                ) : null}
                              </div>
                            </article>
                          ))}
                        </div>
                      </section>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </CardShell>
      </main>
    </div>
  );
}
