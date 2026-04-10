"use client";

import { type ReactNode } from "react";

import { formatLocalizedAmount } from "@/lib/amounts";
import type { TreasuryMovementType } from "@/lib/domain/access";
import { cn } from "@/lib/utils";

type MovementListItem = {
  movementId: string;
  concept: string;
  createdAt: string;
  createdByUserName: string;
  accountName: string;
  movementType: TreasuryMovementType;
  currencyCode: string;
  amount: number;
  action?: ReactNode;
};

type MovementListProps = {
  items: MovementListItem[];
  conceptLabel: string;
  amountLabel: string;
  accountLabel: string;
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

export function MovementList({
  items,
  conceptLabel,
  amountLabel,
  accountLabel,
  actionsLabel,
  createdByLabel
}: MovementListProps) {
  return (
    <div>
      <div className="hidden rounded-t-[18px] border border-border bg-secondary/20 px-4 py-3 md:grid md:grid-cols-[minmax(0,1.7fr)_minmax(180px,0.95fr)_minmax(150px,0.9fr)_88px] md:items-center md:gap-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {conceptLabel}
        </p>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:text-right">
          {amountLabel}
        </p>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
          {accountLabel}
        </p>
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground md:text-right">
          {actionsLabel}
        </p>
      </div>

      <div className="grid gap-3 md:gap-0">
        {items.map((item, index) => (
          <article
            key={item.movementId}
            className={cn(
              "rounded-[18px] border border-border bg-card p-4 shadow-soft md:grid md:grid-cols-[minmax(0,1.7fr)_minmax(180px,0.95fr)_minmax(150px,0.9fr)_88px] md:items-center md:gap-4 md:rounded-none md:border-t-0 md:p-5 md:shadow-none",
              index === items.length - 1 && "md:rounded-b-[18px]"
            )}
          >
            <div className="min-w-0">
              <p
                className="overflow-hidden text-pretty text-base font-semibold leading-6 text-foreground"
                style={{
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 2
                }}
              >
                {item.concept}
              </p>
              <p className="mt-2 text-xs uppercase tracking-[0.14em] text-muted-foreground">
                {formatMovementDateTime(item.createdAt)} · {createdByLabel} {item.createdByUserName}
              </p>
            </div>

            <div className="mt-4 space-y-2 md:mt-0 md:justify-self-end md:text-right">
              <p className={cn("text-[1.7rem] font-semibold leading-none tracking-tight", getMovementAmountClassName(item.movementType))}>
                {item.movementType === "egreso" ? "-" : "+"} {item.currencyCode} {formatLocalizedAmount(item.amount)}
              </p>
            </div>

            <div className="mt-4 md:mt-0">
              <p className="inline-flex min-h-9 items-center rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                {item.accountName}
              </p>
            </div>

            <div className="mt-4 flex min-h-10 items-center justify-start md:mt-0 md:justify-end">
              {item.action ?? <span aria-hidden="true" className="text-xs font-medium text-muted-foreground">-</span>}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
