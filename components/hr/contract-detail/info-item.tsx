import { texts } from "@/lib/texts";

const cdTexts = texts.rrhh.contract_detail;

export function InfoItem({
  label,
  value,
}: {
  label: string;
  value: string | null | undefined;
}) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs font-semibold uppercase tracking-card-eyebrow text-muted-foreground">
        {label}
      </dt>
      <dd className="break-words text-sm text-foreground">
        {value && value.length > 0 ? value : cdTexts.info_value_fallback}
      </dd>
    </div>
  );
}
