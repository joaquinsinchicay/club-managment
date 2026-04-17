import type React from "react";
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

function getBulletColor(type: "ingreso" | "egreso" | string): string {
  if (type === "ingreso") return "var(--green)";
  if (type === "egreso") return "var(--red)";
  return "var(--slate-400)";
}

function getAmountColor(type: "ingreso" | "egreso" | string): string {
  if (type === "ingreso") return "var(--green-700)";
  if (type === "egreso") return "var(--red-700)";
  return "var(--slate-700)";
}

function formatAmount(type: "ingreso" | "egreso" | string, currencyCode: string, amount: number): string {
  const sign = type === "ingreso" ? "+" : type === "egreso" ? "-" : "";
  const symbol = currencyCode === "ARS" ? "$" : "US$";
  return `${sign}${symbol} ${formatLocalizedAmount(amount)}`;
}

function formatMovementDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
}

const chipStyle: React.CSSProperties = {
  background: "var(--slate-100)",
  color: "var(--slate-600)",
  borderRadius: 4,
  fontSize: 10,
  fontWeight: 600,
  padding: "2px 6px",
  lineHeight: "16px"
};

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
                <div className="overflow-hidden rounded-[18px] border border-border bg-card">
                  {movementGroups.map((group, groupIndex) => (
                    <section key={group.movementDate}>
                      <div className={`flex items-center gap-3 px-4 py-2 ${groupIndex > 0 ? "border-t border-border" : ""} bg-secondary/20`}>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                          {formatMovementGroupDate(group.movementDate)}
                        </p>
                      </div>

                      <div className="divide-y divide-border">
                        {group.movements.map((movement) => {
                          const meta = [
                            movement.movementDisplayId,
                            movement.createdByUserName,
                            movement.receiptNumber
                              ? `${texts.dashboard.treasury.detail_receipt_label} ${movement.receiptNumber}`
                              : null,
                            movement.transferReference
                              ? `${texts.dashboard.treasury.detail_transfer_label} ${getTransferReferenceSuffix(movement.transferReference)}`
                              : null,
                            movement.fxOperationReference
                              ? `${texts.dashboard.treasury.detail_fx_label} ${getTransferReferenceSuffix(movement.fxOperationReference)}`
                              : null,
                            movement.calendarEventTitle
                          ]
                            .filter(Boolean)
                            .join(" · ");

                          return (
                            <article key={movement.movementId} className="px-4 py-3 transition-colors hover:bg-slate-50">
                              <div className="flex items-start gap-3">
                                <span
                                  className="mt-1.5 size-2 shrink-0 rounded-full"
                                  style={{ background: getBulletColor(movement.movementType) }}
                                  aria-hidden="true"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-3">
                                    <p
                                      className="overflow-hidden text-[14px] font-semibold leading-snug text-foreground"
                                      style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2 }}
                                    >
                                      {movement.concept}
                                    </p>
                                    <p
                                      className="shrink-0 text-[14px] font-semibold tabular-nums"
                                      style={{ color: getAmountColor(movement.movementType) }}
                                    >
                                      {formatAmount(movement.movementType, movement.currencyCode, movement.amount)}
                                    </p>
                                  </div>

                                  <div className="mt-1.5 flex items-center justify-between gap-2">
                                    <div className="flex flex-wrap gap-1">
                                      <span style={chipStyle}>{detail.account.name}</span>
                                      {movement.categoryName ? (
                                        <span style={chipStyle}>{movement.categoryName}</span>
                                      ) : null}
                                      {movement.activityName ? (
                                        <span style={chipStyle}>{movement.activityName}</span>
                                      ) : null}
                                    </div>
                                    <p className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                                      {formatMovementDateTime(movement.createdAt)}
                                    </p>
                                  </div>

                                  <div className="mt-1">
                                    <p className="text-[11px] text-muted-foreground">{meta}</p>
                                  </div>
                                </div>
                              </div>
                            </article>
                          );
                        })}
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
