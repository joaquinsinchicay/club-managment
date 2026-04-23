import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { unlinkMovementFromCostCenterAction } from "@/app/(dashboard)/treasury/cost-centers/actions";
import { PageContentHeader } from "@/components/ui/page-content-header";
import { buttonClass } from "@/components/ui/button";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import type {
  CostCenterBadge,
  CostCenterPeriodicity,
  CostCenterStatus,
  CostCenterType
} from "@/lib/domain/cost-center";
import { canAccessCostCenters } from "@/lib/domain/authorization";
import { getCostCenterDetail } from "@/lib/services/cost-center-service";
import { texts } from "@/lib/texts";

const tCC = texts.dashboard.treasury_role.cost_centers;

const TYPE_LABEL: Record<CostCenterType, string> = {
  deuda: tCC.type_debt,
  evento: tCC.type_event,
  jornada: tCC.type_workday,
  presupuesto: tCC.type_budget,
  publicidad: tCC.type_advertising,
  sponsor: tCC.type_sponsor
};

const STATUS_LABEL: Record<CostCenterStatus, string> = {
  activo: tCC.status_active,
  inactivo: tCC.status_inactive
};

const PERIODICITY_LABEL: Record<CostCenterPeriodicity, string> = {
  unico: tCC.periodicity_unique,
  mensual: tCC.periodicity_monthly,
  trimestral: tCC.periodicity_quarterly,
  semestral: tCC.periodicity_biannual,
  anual: tCC.periodicity_annual
};

const BADGE_LABEL: Record<CostCenterBadge["kind"], string> = {
  debt_settled: tCC.badge_debt_settled,
  budget_near_limit: tCC.badge_budget_near_limit,
  budget_exceeded: tCC.badge_budget_exceeded,
  goal_met: tCC.badge_goal_met,
  overdue: tCC.badge_overdue
};

const AUDIT_ACTION_LABEL: Record<"created" | "updated" | "closed", string> = {
  created: tCC.audit_log_created,
  updated: tCC.audit_log_updated,
  closed: tCC.audit_log_closed
};

function formatDate(date: string): string {
  const parsed = new Date(`${date}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return date;
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(parsed);
}

function formatDateTime(ts: string): string {
  const parsed = new Date(ts);
  if (Number.isNaN(parsed.getTime())) return ts;
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(parsed);
}

function formatCurrency(amount: number | null, code: string): string {
  if (amount === null || Number.isNaN(amount)) return "—";
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0
    }).format(amount);
  } catch {
    return `${code} ${amount.toLocaleString("es-AR")}`;
  }
}

type PageProps = {
  params: { id: string };
};

export default async function CostCenterDetailPage({ params }: PageProps) {
  const context = await getAuthenticatedSessionContext();
  if (!context) redirect("/login");
  if (!context.activeClub || !context.activeMembership) redirect("/pending-approval");
  if (!canAccessCostCenters(context.activeMembership)) redirect("/treasury");

  const result = await getCostCenterDetail(params.id);

  if (!result.ok) {
    if (result.code === "cost_center_not_found") notFound();
    redirect("/treasury?tab=cost_centers");
  }

  const { costCenter, aggregates, badges, movements, auditLog } = result.data!;
  const executed =
    costCenter.type === "sponsor" || costCenter.type === "publicidad"
      ? aggregates.totalIngreso
      : aggregates.totalEgreso;
  const percent =
    costCenter.amount && costCenter.amount > 0
      ? Math.round((executed / costCenter.amount) * 100)
      : 0;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      <Link
        href="/treasury?tab=cost_centers"
        className="text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        ← {tCC.detail_back_cta}
      </Link>

      <PageContentHeader
        eyebrow={TYPE_LABEL[costCenter.type]}
        title={costCenter.name}
        description={costCenter.description ?? undefined}
        actions={
          <span className="inline-flex items-center gap-1 text-xs font-semibold">
            <span
              className={`inline-block size-1.5 rounded-full ${
                costCenter.status === "activo" ? "bg-emerald-500" : "bg-slate-400"
              }`}
              aria-hidden
            />
            {STATUS_LABEL[costCenter.status]}
          </span>
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-card border border-border bg-card px-4 py-3">
          <p className="text-eyebrow font-semibold uppercase text-muted-foreground">
            {tCC.form_amount_label}
          </p>
          <p className="mt-2 text-h2 font-bold tabular-nums">
            {formatCurrency(costCenter.amount, costCenter.currencyCode)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {tCC.progress_executed_meta
              .replace("{executed}", formatCurrency(executed, costCenter.currencyCode))
              .replace("{percent}", String(percent))}
          </p>
        </div>
        <div className="rounded-card border border-border bg-card px-4 py-3">
          <p className="text-eyebrow font-semibold uppercase text-muted-foreground">
            {tCC.form_start_date_label} — {tCC.form_end_date_label}
          </p>
          <p className="mt-2 text-sm font-semibold">
            {formatDate(costCenter.startDate)}
            {costCenter.endDate ? ` → ${formatDate(costCenter.endDate)}` : ""}
          </p>
          {costCenter.periodicity && (
            <p className="mt-1 text-xs text-muted-foreground">
              {PERIODICITY_LABEL[costCenter.periodicity]}
            </p>
          )}
        </div>
        <div className="rounded-card border border-border bg-card px-4 py-3">
          <p className="text-eyebrow font-semibold uppercase text-muted-foreground">Badges</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {badges.length === 0 ? (
              <p className="text-sm text-muted-foreground">—</p>
            ) : (
              badges.map((b) => (
                <span
                  key={b.kind}
                  className="inline-flex items-center rounded-xs border border-border bg-ds-slate-050 px-2 py-0.5 text-xs font-medium"
                >
                  {BADGE_LABEL[b.kind]}
                </span>
              ))
            )}
          </div>
        </div>
      </section>

      {/* Movements linked to this cost center (US-53 § 8 — Scenario 08) */}
      <section className="rounded-card border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">{tCC.detail_movements_title}</h2>
          <span className="text-xs text-muted-foreground">{movements.length}</span>
        </header>

        {movements.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">{tCC.detail_movements_empty}</p>
        ) : (
          <ul className="divide-y divide-border">
            {movements.map((mov) => (
              <li key={mov.movementId} className="flex items-center gap-3 px-4 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-semibold tabular-nums">{formatDate(mov.movementDate)}</span>
                    <span
                      className={`rounded-xs px-1.5 py-0.5 text-eyebrow font-semibold uppercase ${
                        mov.movementType === "ingreso"
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-ds-rose-050 text-ds-rose-700"
                      }`}
                    >
                      {mov.movementType}
                    </span>
                    <span>{mov.accountName}</span>
                    {mov.categoryName && <span>· {mov.categoryName}</span>}
                  </div>
                  <p className="mt-1 truncate text-sm">{mov.concept ?? "—"}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold tabular-nums">
                    {formatCurrency(mov.amount, mov.currencyCode)}
                  </p>
                  <p className="text-eyebrow uppercase text-muted-foreground">{mov.currencyCode}</p>
                </div>
                <form
                  action={unlinkMovementFromCostCenterAction}
                  // Soft-unlink: only removes the join row; movement is preserved.
                >
                  <input type="hidden" name="movement_id" value={mov.movementId} />
                  <input type="hidden" name="cost_center_id" value={costCenter.id} />
                  <button
                    type="submit"
                    className={buttonClass({ variant: "secondary", size: "sm" })}
                    title={tCC.detail_movements_unlink_confirm}
                  >
                    {tCC.detail_movements_unlink_cta}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Audit log */}
      <section className="rounded-card border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">{tCC.audit_log_title}</h2>
          <span className="text-xs text-muted-foreground">{auditLog.length}</span>
        </header>

        {auditLog.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted-foreground">{tCC.audit_log_empty}</p>
        ) : (
          <ul className="divide-y divide-border">
            {auditLog.map((entry) => (
              <li key={entry.id} className="flex flex-col gap-1 px-4 py-3">
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span className="font-semibold uppercase tracking-wider">
                    {AUDIT_ACTION_LABEL[entry.actionType]}
                  </span>
                  <span>{formatDateTime(entry.changedAt)}</span>
                </div>
                {entry.field && (
                  <p className="text-sm">
                    <span className="font-semibold">{entry.field}</span>
                    {": "}
                    <span className="text-muted-foreground">{entry.oldValue ?? "—"}</span>
                    {" → "}
                    <span>{entry.newValue ?? "—"}</span>
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
