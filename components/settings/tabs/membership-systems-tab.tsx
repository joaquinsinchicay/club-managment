import type { ReceiptFormat } from "@/lib/domain/access";
import { DEFAULT_RECEIPT_EXAMPLE, DEFAULT_RECEIPT_MIN_LABEL, DEFAULT_RECEIPT_PATTERN } from "@/lib/receipt-formats";
import { texts } from "@/lib/texts";

type MembershipSystemsTabProps = {
  receiptFormats: ReceiptFormat[];
};

export function MembershipSystemsTab({ receiptFormats }: MembershipSystemsTabProps) {
  const receiptFormat = receiptFormats[0];

  return (
    <div className="grid gap-4 rounded-[24px] border border-border/70 bg-[linear-gradient(180deg,rgba(248,250,252,0.92)_0%,rgba(255,255,255,0.98)_100%)] p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.settings.club.treasury.receipt_name_label}</span>
          <div className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground">
            {receiptFormat?.name ?? texts.settings.club.treasury.empty_receipt_formats}
          </div>
        </div>

        <div className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.settings.club.treasury.receipt_example_label}</span>
          <div className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground">
            {receiptFormat?.example ?? DEFAULT_RECEIPT_EXAMPLE}
          </div>
        </div>

        <div className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.settings.club.treasury.receipt_pattern_label}</span>
          <div className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground">
            {receiptFormat?.pattern ?? DEFAULT_RECEIPT_PATTERN}
          </div>
        </div>

        <div className="grid gap-2 text-sm text-foreground">
          <span className="font-medium">{texts.settings.club.treasury.receipt_min_label}</span>
          <div className="min-h-11 rounded-2xl border border-border bg-card px-4 py-3 text-sm text-foreground">
            {DEFAULT_RECEIPT_MIN_LABEL}
          </div>
        </div>
      </div>

      <p className="text-xs leading-5 text-muted-foreground">
        {texts.settings.club.treasury.receipt_formats_read_only}
      </p>
    </div>
  );
}
