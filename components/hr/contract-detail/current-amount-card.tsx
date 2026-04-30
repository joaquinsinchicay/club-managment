import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatAmount } from "@/lib/contract-detail-helpers";
import type { StaffContract } from "@/lib/domain/staff-contract";

export function CurrentAmountCard({
  contract,
  clubCurrencyCode,
  eyebrow,
  subtitle,
  canNewRevision,
  onRevise,
  newRevisionLabel,
}: {
  contract: StaffContract;
  clubCurrencyCode: string;
  eyebrow: string;
  subtitle: string;
  canNewRevision: boolean;
  onRevise: () => void;
  newRevisionLabel: string;
}) {
  return (
    <Card padding="comfortable" tone="accent-rrhh">
      <div className="flex min-w-0 flex-col gap-3">
        <p className="break-words text-xs font-semibold uppercase tracking-card-eyebrow text-ds-pink-700">
          {eyebrow}
        </p>
        <p className="break-words text-2xl font-bold tabular-nums text-foreground sm:text-h1">
          {formatAmount(contract.currentAmount, clubCurrencyCode)}
        </p>
        <p className="break-words text-sm text-muted-foreground">{subtitle}</p>
        {canNewRevision ? (
          <button
            type="button"
            onClick={onRevise}
            className={buttonClass({ variant: "accent-rrhh", size: "md" })}
          >
            {newRevisionLabel}
          </button>
        ) : null}
      </div>
    </Card>
  );
}
