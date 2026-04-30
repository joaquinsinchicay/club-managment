import Link from "next/link";

import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DataTableChip } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import {
  SETTLEMENT_TONES,
  SPANISH_MONTHS,
  formatAmount,
} from "@/lib/contract-detail-helpers";
import type { PayrollSettlement } from "@/lib/domain/payroll-settlement";
import { texts } from "@/lib/texts";

const cdTexts = texts.rrhh.contract_detail;

export function RecentSettlementsCard({
  settlements,
  clubCurrencyCode,
}: {
  settlements: PayrollSettlement[];
  clubCurrencyCode: string;
}) {
  return (
    <Card padding="comfortable">
      <CardHeader
        title={cdTexts.settlements_title}
        description={cdTexts.settlements_description}
        action={
          <Link
            href="/rrhh/settlements"
            className="text-xs font-semibold text-foreground hover:underline"
          >
            {cdTexts.settlements_see_all_cta}
          </Link>
        }
        divider
      />
      <CardBody>
        {settlements.length === 0 ? (
          <EmptyState
            title={cdTexts.settlements_empty_title}
            description={cdTexts.settlements_empty_description}
            variant="dashed"
          />
        ) : (
          <ul className="grid gap-2">
            {settlements.map((s) => {
              const statusInfo = SETTLEMENT_TONES[s.status];
              const periodLabel = cdTexts.settlements_period_template
                .replace(
                  "{month}",
                  SPANISH_MONTHS[s.periodMonth - 1] ?? String(s.periodMonth),
                )
                .replace("{year}", String(s.periodYear));
              return (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border bg-card px-4 py-3"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <span className="break-words text-sm font-semibold text-foreground">
                      {periodLabel}
                    </span>
                    <DataTableChip tone={statusInfo.tone}>
                      {cdTexts[statusInfo.labelKey] as string}
                    </DataTableChip>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums text-foreground">
                    {formatAmount(s.totalAmount, clubCurrencyCode)}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
