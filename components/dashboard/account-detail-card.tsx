import Link from "next/link";

import type { TreasuryAccount, TreasuryAccountDetail } from "@/lib/domain/access";
import { formatLocalizedAmount } from "@/lib/amounts";
import { PageContentHeader } from "@/components/ui/page-content-header";
import { texts } from "@/lib/texts";

type AccountDetailCardProps = {
  detail: TreasuryAccountDetail | null;
  accounts: TreasuryAccount[];
  currentAccountId?: string;
  accountHrefBase: string;
  detailPageHref: string;
  currentPage?: number;
  secondaryActionHref?: string;
  secondaryActionLabel?: string;
  emptyAccountsLabel?: string;
};

const MOVEMENTS_PER_PAGE = 10;

function formatPaginationText(template: string, values: Record<string, number>) {
  return template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ""));
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
  detailPageHref,
  currentPage = 1,
  secondaryActionHref,
  secondaryActionLabel,
  emptyAccountsLabel = texts.dashboard.treasury.empty_accounts
}: AccountDetailCardProps) {
  const safeCurrentPage = Number.isFinite(currentPage) && currentPage > 0 ? Math.floor(currentPage) : 1;
  const totalMovements = detail?.movements.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalMovements / MOVEMENTS_PER_PAGE));
  const activePage = Math.min(safeCurrentPage, totalPages);
  const paginatedMovements = detail
    ? detail.movements.slice((activePage - 1) * MOVEMENTS_PER_PAGE, activePage * MOVEMENTS_PER_PAGE)
    : [];
  const movementGroups = detail
    ? Array.from(
        paginatedMovements.reduce((groups, movement) => {
          const currentGroup = groups.get(movement.movementDate) ?? [];
          currentGroup.push(movement);
          groups.set(movement.movementDate, currentGroup);
          return groups;
        }, new Map<string, typeof paginatedMovements>()).entries()
      )
        .sort(([leftDate], [rightDate]) => rightDate.localeCompare(leftDate))
        .map(([movementDate, movements]) => ({
          movementDate,
          movements: [...movements].sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        }))
    : [];
  const rangeStart = totalMovements === 0 ? 0 : (activePage - 1) * MOVEMENTS_PER_PAGE + 1;
  const rangeEnd = totalMovements === 0 ? 0 : Math.min(activePage * MOVEMENTS_PER_PAGE, totalMovements);
  const previousPageHref = `${detailPageHref}?page=${activePage - 1}`;
  const nextPageHref = `${detailPageHref}?page=${activePage + 1}`;

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
              <div className="max-w-md rounded-xl border border-border bg-secondary/50 p-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {texts.dashboard.treasury.detail_account_label}
                  </p>
                  <p className="mt-1 text-base font-semibold text-foreground">{detail.account.name}</p>
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

                  {totalPages > 1 ? (
                    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-foreground">
                          {formatPaginationText(texts.dashboard.treasury.detail_pagination_status, {
                            current: activePage,
                            total: totalPages
                          })}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {formatPaginationText(texts.dashboard.treasury.detail_pagination_range, {
                            from: rangeStart,
                            to: rangeEnd,
                            total: totalMovements
                          })}
                        </p>
                      </div>

                      <div className="flex gap-3">
                        {activePage > 1 ? (
                          <Link
                            href={previousPageHref}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                          >
                            {texts.dashboard.treasury.detail_pagination_previous_cta}
                          </Link>
                        ) : (
                          <span className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm font-semibold text-muted-foreground">
                            {texts.dashboard.treasury.detail_pagination_previous_cta}
                          </span>
                        )}

                        {activePage < totalPages ? (
                          <Link
                            href={nextPageHref}
                            className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
                          >
                            {texts.dashboard.treasury.detail_pagination_next_cta}
                          </Link>
                        ) : (
                          <span className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-secondary/30 px-4 py-3 text-sm font-semibold text-muted-foreground">
                            {texts.dashboard.treasury.detail_pagination_next_cta}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
            </>
          ) : null}
        </div>
      </section>
    </main>
  );
}
