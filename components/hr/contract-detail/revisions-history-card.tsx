import { buttonClass } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DataTableChip } from "@/components/ui/data-table";
import { EmptyState } from "@/components/ui/empty-state";
import {
  formatAmount,
  formatMonthYear,
  formatPercent,
} from "@/lib/contract-detail-helpers";
import type { StaffContractRevision } from "@/lib/domain/staff-contract-revision";
import { texts } from "@/lib/texts";

const cdTexts = texts.rrhh.contract_detail;

export function RevisionsHistoryCard({
  revisions,
  clubCurrencyCode,
  description,
  canNewRevision,
  onRevise,
}: {
  revisions: StaffContractRevision[];
  clubCurrencyCode: string;
  description: string;
  canNewRevision: boolean;
  onRevise: () => void;
}) {
  return (
    <Card padding="comfortable">
      <CardHeader
        title={cdTexts.history_title}
        description={description}
        action={
          canNewRevision ? (
            <button
              type="button"
              onClick={onRevise}
              className={buttonClass({ variant: "accent-rrhh", size: "sm" })}
            >
              {cdTexts.history_new_cta}
            </button>
          ) : undefined
        }
        divider
      />
      <CardBody>
        {revisions.length === 0 ? (
          <EmptyState
            title={cdTexts.history_empty_title}
            description={cdTexts.history_empty_description}
            variant="dashed"
          />
        ) : (
          <ul className="grid gap-2">
            {revisions.map((revision, index) => {
              const prior = revisions[index + 1];
              const delta =
                prior && prior.amount !== 0
                  ? ((revision.amount - prior.amount) / prior.amount) * 100
                  : null;
              const isCurrent = revision.endDate === null;
              const rangeLabel = isCurrent
                ? cdTexts.history_range_open_template.replace(
                    "{from}",
                    formatMonthYear(revision.effectiveDate),
                  )
                : cdTexts.history_range_template
                    .replace("{from}", formatMonthYear(revision.effectiveDate))
                    .replace("{to}", formatMonthYear(revision.endDate));
              return (
                <li
                  key={revision.id}
                  className={`flex flex-wrap items-center justify-between gap-3 rounded-card border px-4 py-3 ${
                    isCurrent
                      ? "border-ds-pink-050 bg-ds-pink-050/50"
                      : "border-border bg-card"
                  }`}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={`mt-1.5 size-2 shrink-0 rounded-full ${
                        isCurrent ? "bg-ds-pink" : "bg-ds-slate-300"
                      }`}
                    />
                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="break-words text-sm font-semibold text-foreground">
                          {rangeLabel}
                        </span>
                        {isCurrent ? (
                          <DataTableChip tone="info">
                            {cdTexts.history_current_badge}
                          </DataTableChip>
                        ) : null}
                        {!prior ? (
                          <DataTableChip tone="neutral">
                            {cdTexts.history_initial_tag}
                          </DataTableChip>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        {delta !== null ? (
                          <span>
                            {cdTexts.history_percent_vs_previous_template.replace(
                              "{deltaPercent}",
                              formatPercent(delta),
                            )}
                          </span>
                        ) : null}
                        {revision.reason ? (
                          <span className="break-words">· {revision.reason}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <span className="shrink-0 font-semibold tabular-nums text-foreground">
                    {formatAmount(revision.amount, clubCurrencyCode)}
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
