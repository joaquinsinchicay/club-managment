import Link from "next/link";

import type { TreasuryAccount, TreasuryAccountDetail } from "@/lib/domain/access";
import { formatLocalizedAmount } from "@/lib/amounts";
import { PageContentHeader } from "@/components/ui/page-content-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { texts } from "@/lib/texts";

type AccountDetailCardProps = {
  detail: TreasuryAccountDetail | null;
  accounts: TreasuryAccount[];
  currentAccountId?: string;
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

function getSessionTone(status: TreasuryAccountDetail["sessionStatus"]) {
  if (status === "open") {
    return "success";
  }

  if (status === "closed") {
    return "danger";
  }

  return "warning";
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
  detail,
  accounts,
  currentAccountId,
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
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      <PageContentHeader
        eyebrow={texts.dashboard.treasury.detail_eyebrow}
        title={texts.dashboard.treasury.detail_title}
        description={texts.dashboard.treasury.detail_description}
        backHref={secondaryActionHref}
        backLabel={secondaryActionLabel}
      />

      <section className="w-full max-w-5xl rounded-[20px] border border-border bg-card p-6 sm:p-8">
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
                    className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                      account.id === currentAccountId
                        ? "border-foreground bg-foreground text-primary-foreground"
                        : "border-border bg-card text-foreground hover:bg-secondary"
                    }`}
                  >
                    {account.name}
                  </Link>
                ))}
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
              {emptyAccountsLabel}
            </div>
          )}

          {detail ? (
            <>
              <div className="grid gap-3 rounded-xl border border-border bg-secondary/50 p-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {texts.dashboard.treasury.detail_account_label}
                  </p>
                  <p className="mt-1 text-base font-semibold text-foreground">{detail.account.name}</p>
                </div>
                <div>
                  <StatusBadge
                    label={getSessionLabel(detail.sessionStatus)}
                    tone={getSessionTone(detail.sessionStatus)}
                    className="mt-6"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {detail.balances.map((balance) => (
                  <div
                    key={`${detail.account.accountId}-${balance.currencyCode}`}
                    className="rounded-xl border border-border bg-card px-4 py-3"
                  >
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                      {balance.currencyCode}
                    </p>
                    <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                      {formatLocalizedAmount(balance.amount)}
                    </p>
                  </div>
                ))}
              </div>

              {detail.movements.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-secondary/30 p-4 text-sm text-muted-foreground">
                  {texts.dashboard.treasury.detail_empty_movements}
                </div>
              ) : (
                <div className="grid gap-3">
                  {movementGroups.map((group) => (
                    <section key={group.movementDate} className="space-y-3">
                      <div className="rounded-xl border border-border bg-card px-4 py-3">
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
                            className="rounded-xl border border-border bg-secondary/40 p-4"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div>
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                  {movement.movementDisplayId}
                                </p>
                                <p className="text-base font-semibold text-foreground">{movement.concept}</p>
                              </div>
                              <span className="text-xl font-semibold tracking-tight text-foreground">
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
      </section>
    </main>
  );
}
