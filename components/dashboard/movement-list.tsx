"use client";

import { type ReactNode } from "react";

import {
  DataTable,
  DataTableAmount,
  DataTableBody,
  DataTableCell,
  DataTableChip,
  DataTableHeader,
  DataTableHeadCell,
  DataTableRow,
} from "@/components/ui/data-table";
import type { TreasuryMovementType } from "@/lib/domain/access";

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

const GRID_COLUMNS =
  "minmax(0,1.7fr) minmax(180px,0.95fr) minmax(150px,0.9fr) 88px";

function formatMovementDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
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
    <DataTable density="comfortable" gridColumns={GRID_COLUMNS}>
      <DataTableHeader>
        <DataTableHeadCell>{conceptLabel}</DataTableHeadCell>
        <DataTableHeadCell align="right">{amountLabel}</DataTableHeadCell>
        <DataTableHeadCell>{accountLabel}</DataTableHeadCell>
        <DataTableHeadCell align="right">{actionsLabel}</DataTableHeadCell>
      </DataTableHeader>

      <DataTableBody>
        {items.map((item) => (
          <DataTableRow key={item.movementId} as="article">
            <DataTableCell>
              <p
                className="overflow-hidden text-pretty font-semibold leading-6 text-foreground"
                style={{
                  display: "-webkit-box",
                  WebkitBoxOrient: "vertical",
                  WebkitLineClamp: 2
                }}
              >
                {item.concept}
              </p>
              <p className="mt-1.5 text-meta text-muted-foreground">
                {formatMovementDateTime(item.createdAt)} · {createdByLabel} {item.createdByUserName}
              </p>
            </DataTableCell>

            <DataTableCell align="right" className="mt-3 md:mt-0">
              <DataTableAmount
                type={item.movementType}
                currencyCode={item.currencyCode}
                amount={item.amount}
                size="display"
              />
            </DataTableCell>

            <DataTableCell className="mt-3 md:mt-0">
              <DataTableChip>{item.accountName}</DataTableChip>
            </DataTableCell>

            <DataTableCell align="right" className="mt-3 md:mt-0">
              {item.action ?? <span aria-hidden="true" className="text-meta text-muted-foreground">-</span>}
            </DataTableCell>
          </DataTableRow>
        ))}
      </DataTableBody>
    </DataTable>
  );
}
