import { shiftPeriod, type PeriodValue } from "@/lib/settlements-list-helpers";
import { texts } from "@/lib/texts";

const sTexts = texts.rrhh.settlements;

export function PeriodPicker({
  value,
  label,
  onChange,
}: {
  value: PeriodValue;
  label: string;
  onChange: (next: PeriodValue) => void;
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-chip border border-border bg-card px-1 py-0.5 text-xs font-semibold text-foreground">
      <button
        type="button"
        aria-label={sTexts.period_picker_aria_prev}
        onClick={() => onChange(shiftPeriod(value, -1))}
        className="inline-flex size-7 items-center justify-center rounded-full hover:bg-secondary"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <span className="px-2 tabular-nums">{label}</span>
      <button
        type="button"
        aria-label={sTexts.period_picker_aria_next}
        onClick={() => onChange(shiftPeriod(value, 1))}
        className="inline-flex size-7 items-center justify-center rounded-full hover:bg-secondary"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>
    </div>
  );
}
