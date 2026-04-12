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

function getMovementAmountClassName(movementType: "ingreso" | "egreso") {
  return movementType === "ingreso" ? "text-success" : "text-destructive";
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

function formatMovementGroupDate(value: string) {
  const date = new Date(`${value}T00:00:00`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "long"
  }).format(date);
}

function getTransferReferenceSuffix(value: string) {
  return value.slice(-6);
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
              <div className="grid gap-3 sm:grid-cols-2">
                {detail.balances.map((balance) => (
                  <div
                    key={`${detail.account.accountId}-${balance.currencyCode}`}
                    className="rounded-xl border border-border bg-card px-4 py-4"
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

                      <div className="overflow-hidden rounded-[18px] border border-border">
                        <div className="hidden bg-secondary/20 px-4 py-3 md:grid md:grid-cols-[minmax(0,1.75fr)_minmax(180px,0.8fr)_minmax(220px,1fr)_minmax(170px,0.8fr)] md:items-center md:gap-4">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            {texts.dashboard.treasury.movements_concept_label}
                          </p>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            {texts.dashboard.treasury.movements_account_label}
                          </p>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                            {texts.dashboard.treasury.movements_detail_label}
                          </p>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:text-right">
                            {texts.dashboard.treasury.movements_amount_label}
                          </p>
                        </div>

                        <div className="grid gap-3 bg-card p-3 md:gap-0 md:bg-transparent md:p-0">
                          {group.movements.map((movement, index) => (
                            <article
                              key={movement.movementId}
                              className={`rounded-[18px] border border-border bg-card p-4 shadow-soft md:grid md:grid-cols-[minmax(0,1.75fr)_minmax(180px,0.8fr)_minmax(220px,1fr)_minmax(170px,0.8fr)] md:items-start md:gap-4 md:rounded-none md:border-x-0 md:border-b-0 md:p-5 md:shadow-none ${
                                index === 0 ? "md:border-t-0" : ""
                              } ${index === group.movements.length - 1 ? "md:last:rounded-b-[18px]" : ""}`}
                            >
                              <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                                  {movement.movementDisplayId}
                                </p>
                                <p className="mt-1 text-base font-semibold text-foreground">{movement.concept}</p>
                                <p className="mt-2 text-sm text-muted-foreground">
                                  {formatMovementDateTime(movement.createdAt)} · {movement.createdByUserName}
                                </p>
                              </div>

                              <div className="mt-4 grid gap-2 text-sm text-muted-foreground md:mt-0">
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground md:hidden">
                                  {texts.dashboard.treasury.movements_account_label}
                                </p>
                                <p className="font-medium text-foreground">{detail.account.name}</p>
                              </div>

                              <div className="mt-4 grid gap-2 text-sm text-muted-foreground md:mt-0">
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground md:hidden">
                                  {texts.dashboard.treasury.movements_detail_label}
                                </p>
                                <div className="flex flex-wrap gap-2">
                                  <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                    {movement.categoryName || texts.dashboard.treasury.detail_uncategorized_category}
                                  </span>
                                  {movement.activityName ? (
                                    <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                                      {movement.activityName}
                                    </span>
                                  ) : null}
                                </div>
                                {movement.transferReference ? (
                                  <p>
                                    <span className="font-medium text-foreground">
                                      {texts.dashboard.treasury.detail_transfer_label}
                                    </span>{" "}
                                    {getTransferReferenceSuffix(movement.transferReference)}
                                  </p>
                                ) : null}
                              </div>

                              <div className="mt-4 md:mt-0 md:text-right">
                                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground md:hidden">
                                  {texts.dashboard.treasury.movements_amount_label}
                                </p>
                                <p
                                  className={`text-2xl font-semibold tracking-tight md:text-[1.75rem] ${getMovementAmountClassName(
                                    movement.movementType
                                  )}`}
                                >
                                  {movement.movementType === "egreso" ? "-" : "+"} {movement.currencyCode}{" "}
                                  {formatLocalizedAmount(movement.amount)}
                                </p>
                              </div>
                            </article>
                          ))}
                        </div>
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
