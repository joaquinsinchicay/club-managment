import { ChipButton } from "@/components/ui/chip";
import {
  STATUS_FILTERS,
  type PeriodValue,
  type StatusFilter,
} from "@/lib/settlements-list-helpers";
import { texts } from "@/lib/texts";
import type { PayrollSettlementStatus } from "@/lib/domain/payroll-settlement";
import { PeriodPicker } from "./period-picker";

const sTexts = texts.rrhh.settlements;

export function FiltersBar({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  totalForPeriod,
  countsByStatus,
  periodFilter,
  onPeriodFilterChange,
  periodLabelLong,
}: {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  totalForPeriod: number;
  countsByStatus: Map<PayrollSettlementStatus, number>;
  periodFilter: PeriodValue;
  onPeriodFilterChange: (next: PeriodValue) => void;
  periodLabelLong: string;
}) {
  return (
    <div className="rounded-card border border-border bg-card px-4 py-3">
      <input
        type="search"
        placeholder={sTexts.search_placeholder}
        value={search}
        onChange={(e) => onSearchChange(e.target.value)}
        className="w-full rounded-btn border border-border bg-background px-3 py-2 text-sm"
      />
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-1.5">
          {STATUS_FILTERS.map((f) => {
            const count =
              f.value === "all"
                ? totalForPeriod
                : countsByStatus.get(f.value as PayrollSettlementStatus) ?? 0;
            return (
              <ChipButton
                key={f.value}
                active={statusFilter === f.value}
                onClick={() => onStatusFilterChange(f.value)}
              >
                {f.label} · {count}
              </ChipButton>
            );
          })}
        </div>
        <PeriodPicker
          value={periodFilter}
          label={periodLabelLong}
          onChange={onPeriodFilterChange}
        />
      </div>
    </div>
  );
}
