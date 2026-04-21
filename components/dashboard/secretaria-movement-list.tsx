"use client";

import { type ReactNode } from "react";

import {
  DataTable,
  DataTableActions,
  DataTableAmount,
  DataTableBody,
  DataTableChip,
  DataTableRow,
} from "@/components/ui/data-table";
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

function getBulletClassName(type: TreasuryMovementType): string {
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

function getReferenceSuffix(value: string) {
  return value.slice(-6);
}

export function SecretariaMovementList({ items }: SecretariaMovementListProps) {
  return (
    <DataTable density="compact">
      <DataTableBody>
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
            <DataTableRow
              key={item.movementId}
              as="article"
              density="compact"
              hoverReveal={Boolean(item.action)}
              useGrid={false}
            >
              <div className="flex items-start gap-3">
                <span
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${getBulletClassName(item.movementType)}`}
                  aria-hidden="true"
                />

                <div className="min-w-0 flex-1">
                  {/* Concept + amount */}
                  <div className="flex items-start justify-between gap-3">
                    <p
                      className="overflow-hidden font-semibold leading-snug text-foreground"
                      style={{ display: "-webkit-box", WebkitBoxOrient: "vertical", WebkitLineClamp: 2 }}
                    >
                      {item.concept}
                    </p>
                    <DataTableAmount
                      type={item.movementType}
                      currencyCode={item.currencyCode}
                      amount={item.amount}
                      className="shrink-0"
                    />
                  </div>

                  {/* Tags + datetime */}
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <div className="flex flex-wrap gap-1">
                      <DataTableChip>{item.accountName}</DataTableChip>
                      {item.categoryName ? <DataTableChip>{item.categoryName}</DataTableChip> : null}
                      {item.activityName ? <DataTableChip>{item.activityName}</DataTableChip> : null}
                    </div>
                    <p className="shrink-0 text-meta tabular-nums text-muted-foreground">
                      {formatMovementDateTime(item.createdAt)}
                    </p>
                  </div>

                  {/* Meta row + edit button */}
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p className="text-meta text-muted-foreground">{meta}</p>
                    {item.action ? <DataTableActions>{item.action}</DataTableActions> : null}
                  </div>
                </div>
              </div>
            </DataTableRow>
          );
        })}
      </DataTableBody>
    </DataTable>
  );
}
