"use client";

import { type ReactNode } from "react";

import { formatLocalizedAmount } from "@/lib/amounts";
import type { TreasuryMovementType } from "@/lib/domain/access";
import { texts } from "@/lib/texts";

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
};

function getBulletColor(type: TreasuryMovementType): string {
  if (type === "ingreso") return "var(--green)";
  if (type === "egreso") return "var(--red)";
  return "var(--slate-400)";
}

function getAmountColor(type: TreasuryMovementType): string {
  if (type === "ingreso") return "var(--green-700)";
  if (type === "egreso") return "var(--red-700)";
  return "var(--slate-700)";
}

function formatAmount(type: TreasuryMovementType, currencyCode: string, amount: number): string {
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

function getReferenceSuffix(value: string) {
  return value.slice(-6);
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

export function SecretariaMovementList({ items }: SecretariaMovementListProps) {
  return (
    <div className="divide-y divide-border">
      {items.map((item) => {
        const meta = [
          item.movementDisplayId,
          item.createdByUserName,
          item.receiptNumber ? `${texts.dashboard.treasury.detail_receipt_label} ${item.receiptNumber}` : null,
          item.transferReference
            ? `${texts.dashboard.treasury.detail_transfer_label} ${getReferenceSuffix(item.transferReference)}`
            : null,
          item.fxOperationReference
            ? `${texts.dashboard.treasury.detail_fx_label} ${getReferenceSuffix(item.fxOperationReference)}`
            : null,
          item.calendarEventTitle
        ]
          .filter(Boolean)
          .join(" · ");

        return (
          <article key={item.movementId} className="group px-4 py-3 transition-colors hover:bg-slate-50">
            <div className="flex items-start gap-3">
              <span
                className="mt-1.5 size-2 shrink-0 rounded-full"
                style={{ background: getBulletColor(item.movementType) }}
                aria-hidden="true"
              />

              <div className="min-w-0 flex-1">
                {/* Concept + amount */}
                <div className="flex items-start justify-between gap-3">
                  <p
                    className="overflow-hidden text-[14px] font-semibold leading-snug text-foreground"
                    style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2 }}
                  >
                    {item.concept}
                  </p>
                  <p
                    className="shrink-0 text-[14px] font-semibold tabular-nums"
                    style={{ color: getAmountColor(item.movementType) }}
                  >
                    {formatAmount(item.movementType, item.currencyCode, item.amount)}
                  </p>
                </div>

                {/* Tags + datetime */}
                <div className="mt-1.5 flex items-center justify-between gap-2">
                  <div className="flex flex-wrap gap-1">
                    <span style={chipStyle}>{item.accountName}</span>
                    {item.categoryName ? <span style={chipStyle}>{item.categoryName}</span> : null}
                    {item.activityName ? <span style={chipStyle}>{item.activityName}</span> : null}
                  </div>
                  <p className="shrink-0 text-[11px] tabular-nums text-muted-foreground">
                    {formatMovementDateTime(item.createdAt)}
                  </p>
                </div>

                {/* Meta row + edit button */}
                <div className="mt-1 flex items-center justify-between gap-2">
                  <p className="text-[11px] text-muted-foreground">{meta}</p>
                  {item.action ? (
                    <div className="shrink-0 opacity-0 transition-opacity group-hover:opacity-100">
                      {item.action}
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
