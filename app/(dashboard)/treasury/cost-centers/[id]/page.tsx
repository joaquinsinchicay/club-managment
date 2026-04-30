import { notFound, redirect } from "next/navigation";

import { unlinkMovementFromCostCenterAction } from "@/app/(dashboard)/treasury/cost-centers/actions";
import { buttonClass } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import {
  DataTable,
  DataTableActions,
  DataTableAmount,
  DataTableBody,
  DataTableCell,
  DataTableChip,
  DataTableEmpty,
  DataTableHeadCell,
  DataTableHeader,
  DataTableRow,
} from "@/components/ui/data-table";
import { LinkButton } from "@/components/ui/link-button";
import { PageContentHeader } from "@/components/ui/page-content-header";
import { Badge } from "@/components/ui/badge";
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
      <PageContentHeader
        eyebrow={TYPE_LABEL[costCenter.type]}
        title={costCenter.name}
        description={costCenter.description ?? undefined}
        backHref="/treasury?tab=cost_centers"
        backLabel={tCC.detail_back_cta}
        actions={
          <Badge
            tone={costCenter.status === "activo" ? "success" : "neutral"}
            label={STATUS_LABEL[costCenter.status]}
          />
        }
      />

      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card padding="compact">
          <CardBody>
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
          </CardBody>
        </Card>
        <Card padding="compact">
          <CardBody>
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
          </CardBody>
        </Card>
        <Card padding="compact">
          <CardBody>
            <p className="text-eyebrow font-semibold uppercase text-muted-foreground">
              {tCC.detail_badges_section_title}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {badges.length === 0 ? (
                <p className="text-sm text-muted-foreground">{tCC.detail_badges_empty}</p>
              ) : (
                badges.map((b) => (
                  <Chip key={b.kind} tone="neutral" size="sm">
                    {BADGE_LABEL[b.kind]}
                  </Chip>
                ))
              )}
            </div>
          </CardBody>
        </Card>
      </section>

      {/* Movements linked to this cost center (US-53 § 8 — Scenario 08) */}
      <Card padding="none">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">{tCC.detail_movements_title}</h2>
          <span className="text-xs text-muted-foreground">{movements.length}</span>
        </header>

        {movements.length === 0 ? (
          <DataTableEmpty title={tCC.detail_movements_empty} />
        ) : (
          <DataTable
            density="compact"
            gridColumns="110px 100px minmax(0,1.6fr) minmax(0,1fr) 140px 110px"
          >
            <DataTableHeader>
              <DataTableHeadCell>{tCC.detail_movements_column_date}</DataTableHeadCell>
              <DataTableHeadCell>{tCC.detail_movements_column_type}</DataTableHeadCell>
              <DataTableHeadCell>{tCC.detail_movements_column_description}</DataTableHeadCell>
              <DataTableHeadCell>{tCC.detail_movements_column_account}</DataTableHeadCell>
              <DataTableHeadCell align="right">{tCC.detail_movements_column_amount}</DataTableHeadCell>
              <DataTableHeadCell />
            </DataTableHeader>
            <DataTableBody>
              {movements.map((mov) => (
                <DataTableRow key={mov.movementId} density="compact" hoverReveal>
                  <DataTableCell>
                    <span className="font-semibold tabular-nums">{formatDate(mov.movementDate)}</span>
                  </DataTableCell>
                  <DataTableCell>
                    <DataTableChip tone={mov.movementType === "ingreso" ? "income" : "expense"}>
                      {mov.movementType}
                    </DataTableChip>
                  </DataTableCell>
                  <DataTableCell>
                    <div className="flex flex-col">
                      <span className="truncate">{mov.concept ?? "—"}</span>
                      {mov.categoryName ? (
                        <span className="text-xs text-muted-foreground">{mov.categoryName}</span>
                      ) : null}
                    </div>
                  </DataTableCell>
                  <DataTableCell>{mov.accountName}</DataTableCell>
                  <DataTableCell align="right">
                    <DataTableAmount
                      type={mov.movementType === "ingreso" ? "ingreso" : "egreso"}
                      currencyCode={mov.currencyCode}
                      amount={mov.amount}
                    />
                  </DataTableCell>
                  <DataTableCell align="right">
                    <DataTableActions>
                      <form action={unlinkMovementFromCostCenterAction} className="inline">
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
                    </DataTableActions>
                  </DataTableCell>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </Card>

      {/* Audit log */}
      <Card padding="none">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold">{tCC.audit_log_title}</h2>
          <span className="text-xs text-muted-foreground">{auditLog.length}</span>
        </header>

        {auditLog.length === 0 ? (
          <DataTableEmpty title={tCC.audit_log_empty} />
        ) : (
          <DataTable density="compact">
            <DataTableBody>
              {auditLog.map((entry) => (
                <DataTableRow key={entry.id} density="compact" useGrid={false}>
                  <div className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      <DataTableChip tone="neutral">
                        {AUDIT_ACTION_LABEL[entry.actionType]}
                      </DataTableChip>
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
                  </div>
                </DataTableRow>
              ))}
            </DataTableBody>
          </DataTable>
        )}
      </Card>
    </main>
  );
}
