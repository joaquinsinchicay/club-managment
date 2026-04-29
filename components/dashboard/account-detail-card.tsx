import type { TreasuryAccount, TreasuryAccountDetail } from "@/lib/domain/access";
import { formatLocalizedAmount } from "@/lib/amounts";
import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChipLink } from "@/components/ui/chip";
import {
  DataTable,
  DataTableAmount,
  DataTableBody,
  DataTableChip,
  DataTableRow,
} from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import { LinkButton } from "@/components/ui/link-button";
import { PageContentHeader } from "@/components/ui/page-content-header";
import type { TreasuryMovementType } from "@/lib/domain/access";
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

function getBulletClassName(type: TreasuryMovementType | string): string {
  if (type === "ingreso") return "bg-ds-green";
  if (type === "egreso") return "bg-ds-red";
  return "bg-ds-slate-400";
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

      <Card as="section" className="w-full max-w-5xl p-6 sm:p-8" padding="none">
        <div className="space-y-5">
          {accounts.length > 0 ? (
            <div className="grid gap-2">
              <p className="text-sm font-medium text-foreground">
                {texts.dashboard.treasury.account_switch_label}
              </p>
              <div className="flex flex-wrap gap-2">
                {accounts.map((account) => (
                  <ChipLink
                    key={account.id}
                    href={`${accountHrefBase}/${account.id}`}
                    active={account.id === currentAccountId}
                  >
                    {account.name}
                  </ChipLink>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState title={emptyAccountsLabel ?? ""} />
          )}

          {detail ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                {detail.balances.map((balance) => (
                  <div
                    key={`${detail.account.accountId}-${balance.currencyCode}`}
                    className="rounded-card border border-border bg-card px-4 py-4"
                  >
                    <p className="text-xs font-semibold uppercase tracking-card-eyebrow text-muted-foreground">
                      {balance.currencyCode}
                    </p>
                    <p className="mt-1 text-xl font-semibold tracking-tight text-foreground">
                      {formatLocalizedAmount(balance.amount)}
                    </p>
                  </div>
                ))}
              </div>

              {detail.movements.length === 0 ? (
                <EmptyState title={texts.dashboard.treasury.detail_empty_movements} />
              ) : (
                <DataTable density="compact">
                  {movementGroups.map((group, groupIndex) => (
                    <section key={group.movementDate}>
                      <div className={`flex items-center gap-3 bg-secondary-faint px-4 py-2 ${groupIndex > 0 ? "border-t border-border/60" : ""}`}>
                        <p className="text-eyebrow font-semibold uppercase text-muted-foreground">
                          {formatMovementGroupDate(group.movementDate)}
                        </p>
                      </div>

                      <DataTableBody>
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
                            <DataTableRow
                              key={movement.movementId}
                              as="article"
                              density="compact"
                              useGrid={false}
                            >
                              <div className="flex items-start gap-3">
                                <span
                                  className={`mt-1.5 size-2 shrink-0 rounded-full ${getBulletClassName(movement.movementType)}`}
                                  aria-hidden="true"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-start justify-between gap-3">
                                    <p
                                      className="overflow-hidden font-semibold leading-snug text-foreground"
                                      style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2 }}
                                    >
                                      {movement.concept}
                                    </p>
                                    <DataTableAmount
                                      type={movement.movementType}
                                      currencyCode={movement.currencyCode}
                                      amount={movement.amount}
                                      className="shrink-0"
                                    />
                                  </div>

                                  <div className="mt-1.5 flex items-center justify-between gap-2">
                                    <div className="flex flex-wrap gap-1">
                                      <DataTableChip>{detail.account.name}</DataTableChip>
                                      {movement.categoryName ? (
                                        <DataTableChip>{movement.categoryName}</DataTableChip>
                                      ) : null}
                                      {movement.activityName ? (
                                        <DataTableChip>{movement.activityName}</DataTableChip>
                                      ) : null}
                                    </div>
                                    <p className="shrink-0 text-meta tabular-nums text-muted-foreground">
                                      {formatMovementDateTime(movement.createdAt)}
                                    </p>
                                  </div>

                                  <div className="mt-1">
                                    <p className="text-meta text-muted-foreground">{meta}</p>
                                  </div>
                                </div>
                              </div>
                            </DataTableRow>
                          );
                        })}
                      </DataTableBody>
                    </section>
                  ))}

                  {totalPages > 1 ? (
                    <div className="flex flex-col gap-3 rounded-card border border-border bg-card px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
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
                          <LinkButton href={previousPageHref}>
                            {texts.dashboard.treasury.detail_pagination_previous_cta}
                          </LinkButton>
                        ) : (
                          <span className={buttonClass({ variant: "secondary", className: "cursor-not-allowed border-border bg-secondary-subtle text-muted-foreground hover:bg-secondary-subtle" })}>
                            {texts.dashboard.treasury.detail_pagination_previous_cta}
                          </span>
                        )}

                        {activePage < totalPages ? (
                          <LinkButton href={nextPageHref}>
                            {texts.dashboard.treasury.detail_pagination_next_cta}
                          </LinkButton>
                        ) : (
                          <span className={buttonClass({ variant: "secondary", className: "cursor-not-allowed border-border bg-secondary-subtle text-muted-foreground hover:bg-secondary-subtle" })}>
                            {texts.dashboard.treasury.detail_pagination_next_cta}
                          </span>
                        )}
                      </div>
                    </div>
                  ) : null}
                </DataTable>
              )}
            </>
          ) : null}
        </div>
      </Card>
    </main>
  );
}
