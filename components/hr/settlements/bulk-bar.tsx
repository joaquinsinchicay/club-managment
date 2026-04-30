import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { formatAmount, type SelectionMode } from "@/lib/settlements-list-helpers";
import { texts } from "@/lib/texts";

const sTexts = texts.rrhh.settlements;

export function BulkBar({
  count,
  total,
  clubCurrencyCode,
  selectionMode,
  onClear,
  onApprove,
  onPay,
}: {
  count: number;
  total: number;
  clubCurrencyCode: string;
  selectionMode: SelectionMode;
  onClear: () => void;
  onApprove: () => void;
  onPay: () => void;
}) {
  return (
    <Card
      tone="muted"
      padding="none"
      className="flex flex-wrap items-center justify-between gap-3 px-4 py-3"
    >
      <span className="text-sm font-medium text-foreground">
        {sTexts.bulk_selected_prefix}
        {count} · {formatAmount(total, clubCurrencyCode)}
        {selectionMode === "mixed" ? (
          <span className="ml-2 text-xs text-ds-amber-700">{sTexts.bulk_mixed_note}</span>
        ) : null}
      </span>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={onClear}>
          {sTexts.bulk_clear_cta}
        </Button>
        {selectionMode === "approve" ? (
          <Button variant="primary" size="sm" onClick={onApprove}>
            {sTexts.bulk_approve_cta}
          </Button>
        ) : null}
        {selectionMode === "pay" ? (
          <Button variant="primary" size="sm" onClick={onPay}>
            {sTexts.bulk_pay_cta}
          </Button>
        ) : null}
      </div>
    </Card>
  );
}
