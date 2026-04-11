"use client";

import { type ReactNode } from "react";

import { formatLocalizedAmount } from "@/lib/amounts";
import type { TreasuryMovementType } from "@/lib/domain/access";
import { texts } from "@/lib/texts";
import { cn } from "@/lib/utils";

type SecretariaMovementListItem = {
  movementId: string;
  movementDisplayId: string;
  concept: string;
  createdAt: string;
  createdByUserName: string;
  accountName: string;
  movementType: TreasuryMovementType;
  currencyCode: string;
  amount: number;
  categoryName: string;
  activityName: string | null;
  receiptNumber: string | null;
  calendarEventTitle: string | null;
  transferReference: string | null;
  fxOperationReference: string | null;
  action?: ReactNode;
};

type SecretariaMovementListProps = {
  items: SecretariaMovementListItem[];
  conceptLabel: string;
  accountLabel: string;
  detailLabel: string;
  amountLabel: string;
  actionsLabel: string;
  createdByLabel: string;
};

function getMovementAmountClassName(movementType: TreasuryMovementType) {
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

function getReferenceSuffix(value: string) {
  return value.slice(-6);
}

export function SecretariaMovementList({
  items,
  conceptLabel,
  accountLabel,
  detailLabel,
  amountLabel,
  actionsLabel,
  createdByLabel
}: SecretariaMovementListProps) {
  return (
    <div className="overflow-hidden rounded-[18px] border border-border">
      <div className="hidden bg-secondary/20 px-4 py-3 md:grid md:grid-cols-[minmax(0,1.75fr)_minmax(180px,0.8fr)_minmax(220px,1fr)_minmax(170px,0.8fr)_88px] md:items-center md:gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {conceptLabel}
        </p>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {accountLabel}
        </p>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {detailLabel}
        </p>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:text-right">
          {amountLabel}
        </p>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:text-right">
          {actionsLabel}
        </p>
      </div>

      <div className="grid gap-3 bg-card p-3 md:gap-0 md:bg-transparent md:p-0">
        {items.map((item, index) => (
          <article
            key={item.movementId}
            className={cn(
              "rounded-[18px] border border-border bg-card p-4 shadow-soft md:grid md:grid-cols-[minmax(0,1.75fr)_minmax(180px,0.8fr)_minmax(220px,1fr)_minmax(170px,0.8fr)_88px] md:items-start md:gap-4 md:rounded-none md:border-x-0 md:border-b-0 md:p-5 md:shadow-none",
              index === items.length - 1 && "md:last:rounded-b-[18px]"
            )}
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                {item.movementDisplayId}
              </p>
              <p
                className="mt-1 overflow-hidden text-pretty text-base font-semibold leading-6 text-foreground"
                style={{
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 2
                }}
              >
                {item.concept}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                {formatMovementDateTime(item.createdAt)} · {createdByLabel} {item.createdByUserName}
              </p>
            </div>

            <div className="mt-4 grid gap-2 text-sm text-muted-foreground md:mt-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground md:hidden">
                {accountLabel}
              </p>
              <p className="font-medium text-foreground">{item.accountName}</p>
            </div>

            <div className="mt-4 grid gap-2 text-sm text-muted-foreground md:mt-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground md:hidden">
                {detailLabel}
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex min-h-8 items-center rounded-full border border-border bg-card px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {item.categoryName || texts.dashboard.treasury.detail_uncategorized_category}
                </span>
              </div>
              {item.transferReference ? (
                <p>
                  <span className="font-medium text-foreground">{texts.dashboard.treasury.detail_transfer_label}</span>{" "}
                  {getReferenceSuffix(item.transferReference)}
                </p>
              ) : null}
              {item.fxOperationReference ? (
                <p>
                  <span className="font-medium text-foreground">{texts.dashboard.treasury.detail_fx_label}</span>{" "}
                  {getReferenceSuffix(item.fxOperationReference)}
                </p>
              ) : null}
              {item.receiptNumber ? (
                <p>
                  <span className="font-medium text-foreground">{texts.dashboard.treasury.detail_receipt_label}</span>{" "}
                  {item.receiptNumber}
                </p>
              ) : null}
              {item.activityName ? (
                <p>
                  <span className="font-medium text-foreground">{texts.dashboard.treasury.detail_activity_label}</span>{" "}
                  {item.activityName}
                </p>
              ) : null}
              {item.calendarEventTitle ? (
                <p>
                  <span className="font-medium text-foreground">{texts.dashboard.treasury.detail_calendar_label}</span>{" "}
                  {item.calendarEventTitle}
                </p>
              ) : null}
            </div>

            <div className="mt-4 md:mt-0 md:text-right">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground md:hidden">
                {amountLabel}
              </p>
              <p
                className={cn(
                  "text-2xl font-semibold tracking-tight md:text-[1.75rem]",
                  getMovementAmountClassName(item.movementType)
                )}
              >
                {item.movementType === "egreso" ? "-" : "+"} {item.currencyCode} {formatLocalizedAmount(item.amount)}
              </p>
            </div>

            <div className="mt-4 flex min-h-10 items-center justify-start md:mt-0 md:justify-end">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground md:hidden">
                {actionsLabel}
              </p>
              {item.action ?? <span aria-hidden="true" className="text-xs font-medium text-muted-foreground">-</span>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
