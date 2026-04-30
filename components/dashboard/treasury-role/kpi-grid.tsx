import { formatLocalizedAmount } from "@/lib/amounts";
import { texts } from "@/lib/texts";
import { getCurrencySymbol } from "@/lib/treasury-ui-helpers";
import type { TotalBalance } from "@/lib/treasury-role-helpers";
import { cn } from "@/lib/utils";
import type { TreasuryRoleDashboard } from "@/lib/domain/access";

export function CurrencyChip({ code }: { code: string }) {
  return (
    <span className="inline-flex shrink-0 items-center rounded-xs bg-ds-slate-100 px-1.5 py-0.5 text-eyebrow font-semibold text-ds-slate-600">
      {code}
    </span>
  );
}

export function KpiGrid({
  totalBalances,
  accountCount,
  monthlyStats,
  pendingConciliationCount,
}: {
  totalBalances: TotalBalance[];
  accountCount: number;
  monthlyStats: TreasuryRoleDashboard["monthlyStats"];
  pendingConciliationCount: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
      {/* ── Saldo total ── */}
      <div className="rounded-card border border-border bg-card px-3.5 py-3">
        <p className="text-eyebrow font-semibold uppercase text-muted-foreground">
          {texts.dashboard.treasury_role.kpi_total_balance_label}
        </p>
        <div className="mt-2 flex flex-col">
          {totalBalances.length === 0 ? (
            <p className="py-1 text-h2 font-bold tabular-nums text-foreground">—</p>
          ) : (
            totalBalances.map((b, i) => (
              <div
                key={b.currencyCode}
                className={cn(
                  "flex items-center justify-between gap-2 py-1.5",
                  i < totalBalances.length - 1 && "border-b border-border"
                )}
              >
                <CurrencyChip code={b.currencyCode} />
                <span className="text-h4 tabular-nums tracking-tight text-foreground">
                  {`${getCurrencySymbol(b.currencyCode)} `}
                  {formatLocalizedAmount(b.amount)}
                </span>
              </div>
            ))
          )}
        </div>
        <p className="mt-1.5 text-meta text-ds-slate-500">
          {accountCount} {texts.dashboard.treasury_role.kpi_accounts_count_label}
        </p>
      </div>

      {/* ── Ingresos del mes ── */}
      <div className="rounded-card border border-border bg-card px-3.5 py-3">
        <p className="text-eyebrow font-semibold uppercase text-muted-foreground">
          {texts.dashboard.treasury_role.kpi_monthly_income_label}
        </p>
        <div className="mt-2 flex flex-col">
          {monthlyStats.length === 0 ? (
            <p className="py-1 text-h2 font-bold tabular-nums text-ds-green-700">—</p>
          ) : (
            monthlyStats.map((s, i) => (
              <div
                key={s.currencyCode}
                className={cn(
                  "flex items-center justify-between gap-2 py-1.5",
                  i < monthlyStats.length - 1 && "border-b border-border"
                )}
              >
                <span
                  className={cn(
                    "font-bold tabular-nums tracking-tight text-ds-green-700",
                    i === 0 ? "text-h4" : "text-small"
                  )}
                >
                  + {`${getCurrencySymbol(s.currencyCode)} `}
                  {formatLocalizedAmount(s.ingreso)}
                </span>
                <CurrencyChip code={s.currencyCode} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Egresos del mes ── */}
      <div className="rounded-card border border-border bg-card px-3.5 py-3">
        <p className="text-eyebrow font-semibold uppercase text-muted-foreground">
          {texts.dashboard.treasury_role.kpi_monthly_expenses_label}
        </p>
        <div className="mt-2 flex flex-col">
          {monthlyStats.length === 0 ? (
            <p className="py-1 text-h2 font-bold tabular-nums text-ds-red-700">—</p>
          ) : (
            monthlyStats.map((s, i) => (
              <div
                key={s.currencyCode}
                className={cn(
                  "flex items-center justify-between gap-2 py-1.5",
                  i < monthlyStats.length - 1 && "border-b border-border"
                )}
              >
                <span
                  className={cn(
                    "font-bold tabular-nums tracking-tight text-ds-red-700",
                    i === 0 ? "text-h4" : "text-small"
                  )}
                >
                  − {`${getCurrencySymbol(s.currencyCode)} `}
                  {formatLocalizedAmount(s.egreso)}
                </span>
                <CurrencyChip code={s.currencyCode} />
              </div>
            ))
          )}
        </div>
      </div>

      {/* ── Sin conciliar ── */}
      <div className="rounded-card border border-border bg-card px-3.5 py-3">
        <p className="text-eyebrow font-semibold uppercase text-muted-foreground">
          {texts.dashboard.treasury_role.kpi_pending_conciliation_label}
        </p>
        <p className="mt-2 text-[2rem] font-bold leading-none tracking-tight text-ds-blue-700 tabular-nums">
          {pendingConciliationCount}
        </p>
        <p className="mt-1.5 text-meta text-ds-slate-500">
          {texts.dashboard.treasury_role.kpi_pending_conciliation_meta}
        </p>
      </div>
    </div>
  );
}
