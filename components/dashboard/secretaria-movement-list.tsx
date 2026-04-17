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

function formatMovementDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(date);
}

function getReferenceSuffix(value: string) {
  return value.slice(-6);
}

function MovementDot({ movementType, isTransfer }: { movementType: TreasuryMovementType; isTransfer: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "mt-[3px] size-[6px] shrink-0 rounded-full",
        isTransfer
          ? "bg-slate-400"
          : movementType === "ingreso"
            ? "bg-emerald-500"
            : "bg-red-500"
      )}
    />
  );
}

export function SecretariaMovementList({
  items
}: SecretariaMovementListProps) {
  return (
    <div className="flex flex-col">
      {items.map((item, index) => {
        const isTransfer = Boolean(item.transferReference || item.fxOperationReference);

        const footerParts: string[] = [item.movementDisplayId];
        if (item.createdByUserName) footerParts.push(item.createdByUserName);
        if (item.receiptNumber) footerParts.push(item.receiptNumber);
        if (item.transferReference) footerParts.push(`${texts.dashboard.treasury.detail_transfer_label} ${getReferenceSuffix(item.transferReference)}`);
        if (item.fxOperationReference) footerParts.push(`${texts.dashboard.treasury.detail_fx_label} ${getReferenceSuffix(item.fxOperationReference)}`);
        if (item.calendarEventTitle) footerParts.push(item.calendarEventTitle);

        return (
          <article
            key={item.movementId}
            className={cn(
              "group flex items-start justify-between gap-3 px-4 py-3 transition-colors hover:bg-secondary/40",
              index > 0 && "border-t border-border/60"
            )}
          >
            <div className="flex min-w-0 flex-1 flex-col gap-1">
              <div className="flex items-start gap-2">
                <MovementDot movementType={item.movementType} isTransfer={isTransfer} />
                <p className="text-[14px] font-semibold leading-snug tracking-tight text-foreground">
                  {item.concept}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 pl-[14px]">
                <span className="inline-flex items-center rounded-[4px] bg-secondary px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-muted-foreground">
                  {isTransfer ? "Transferencia interna" : item.accountName}
                </span>
                {item.categoryName && !isTransfer ? (
                  <>
                    <span aria-hidden="true" className="text-[10px] text-border">·</span>
                    <span className="text-[11px] font-medium text-muted-foreground">{item.categoryName}</span>
                  </>
                ) : null}
                {item.activityName ? (
                  <>
                    <span aria-hidden="true" className="text-[10px] text-border">·</span>
                    <span className="text-[11px] text-muted-foreground/70">{item.activityName}</span>
                  </>
                ) : null}
              </div>

              <p className="flex flex-wrap items-center gap-x-1.5 gap-y-0 pl-[14px] font-mono text-[10px] text-muted-foreground/60">
                {footerParts.map((part, i) => (
                  <span key={i} className="flex items-center gap-1.5">
                    {i > 0 && <span aria-hidden="true" className="text-border">·</span>}
                    {part}
                  </span>
                ))}
              </p>
            </div>

            <div className="flex shrink-0 flex-col items-end gap-1">
              <p
                className={cn(
                  "text-[16px] font-bold leading-none tracking-tight tabular-nums",
                  isTransfer
                    ? "text-slate-600"
                    : item.movementType === "ingreso"
                      ? "text-emerald-700"
                      : "text-red-700"
                )}
              >
                {isTransfer ? "" : item.movementType === "ingreso" ? "+ " : "− "}
                {item.currencyCode === "ARS" ? "$ " : `${item.currencyCode} `}
                {formatLocalizedAmount(item.amount)}
              </p>
              <p className="text-[10px] tabular-nums text-muted-foreground/60">
                {formatMovementDateTime(item.createdAt)}
              </p>
              {item.action ? (
                <div className="opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                  {item.action}
                </div>
              ) : null}
            </div>
          </article>
        );
      })}
    </div>
  );
}
