import { redirect } from "next/navigation";

import { RrhhModuleNav } from "@/components/hr/rrhh-module-nav";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import {
  DataTable,
  DataTableBody,
  DataTableCell,
  DataTableEmpty,
  DataTableRow,
} from "@/components/ui/data-table";
import Link from "next/link";

import { LinkButton } from "@/components/ui/link-button";
import { FormBanner } from "@/components/ui/modal-form";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canAccessHrModule, canOperateHrSettlements } from "@/lib/domain/authorization";
import { hasMembershipRole } from "@/lib/domain/membership-roles";
import type { PayrollSettlementStatus } from "@/lib/domain/payroll-settlement";
import { getHrDashboardSummary } from "@/lib/services/hr-dashboard-service";
import { texts } from "@/lib/texts";

function formatAmount(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat("es-AR", {
      style: "currency",
      currency: currencyCode,
      minimumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${currencyCode} ${amount.toFixed(2)}`;
  }
}

function formatPeriod(year: number, month: number): string {
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}`;
}

const WEEKDAY_FMT = new Intl.DateTimeFormat("es-AR", { weekday: "short" });

function formatDueDateLabel(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  if (diffDays >= 0 && diffDays <= 7) {
    const weekday = WEEKDAY_FMT.format(date).replace(/\.$/, "");
    return `${weekday} ${dd}/${mm}`;
  }
  return `${dd}/${mm}/${date.getFullYear()}`;
}

function templateFill(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => String(values[key] ?? `{${key}}`));
}

function settlementStatusLabel(
  status: PayrollSettlementStatus | null,
  dashboard: typeof texts.rrhh.dashboard,
): string {
  if (!status) return "—";
  switch (status) {
    case "generada":
      return dashboard.settlement_status_generada;
    case "aprobada_rrhh":
      return dashboard.settlement_status_aprobada_rrhh;
    case "pagada":
      return dashboard.settlement_status_pagada;
    case "anulada":
      return dashboard.settlement_status_anulada;
    default:
      return status;
  }
}

function milestoneDaysChip(daysUntil: number, dashboard: typeof texts.rrhh.dashboard): string {
  if (daysUntil === 0) return dashboard.milestones_days_today;
  if (daysUntil < 0) {
    return templateFill(dashboard.milestones_days_overdue_template, {
      days: Math.abs(daysUntil),
    });
  }
  return templateFill(dashboard.milestones_days_template, { days: daysUntil });
}

export default async function RrhhPage() {
  const context = await getAuthenticatedSessionContext();

  if (!context || !canAccessHrModule(context.activeMembership)) {
    redirect("/dashboard");
  }

  const rrhhTexts = texts.rrhh;
  const dashboard = rrhhTexts.dashboard;
  const canSettlements = canOperateHrSettlements(context.activeMembership);
  const hasTreasuryRole = context.activeMembership
    ? hasMembershipRole(context.activeMembership, "tesoreria")
    : false;
  const clubCurrencyCode = context.activeClub!.currencyCode;

  const summaryResult = await getHrDashboardSummary();
  const summary = summaryResult.ok
    ? summaryResult.summary
    : {
        pendingApprove: { count: 0, totalAmount: 0 },
        pendingPay: { count: 0, totalAmount: 0 },
        projectedMonth: 0,
        executedMonth: 0,
        vacantStructures: 0,
        alertsCount: 0,
        periodYear: new Date().getFullYear(),
        periodMonth: new Date().getMonth() + 1,
        currentPeriodSettlements: {
          totalAmount: 0,
          paidCount: 0,
          totalCount: 0,
          dominantStatus: null as PayrollSettlementStatus | null,
        },
        payDueDate: null as string | null,
        activeStaff: { count: 0, additionsLast30d: 0 },
        activeContracts: { count: 0, staleRevisionCount: 0, endingSoonCount: 0 },
        monthlyCost: {
          current: 0,
          previous: 0,
          twoMonthsAgo: 0,
          previousLabel: "",
          twoMonthsAgoLabel: "",
          deltaPct: null as number | null,
        },
        structures: { activeCount: 0, vacantCount: 0, nameList: [] as string[] },
        upcomingMilestones: [] as Array<{
          type: "revision_salarial" | "fin_contrato";
          title: string;
          subtitle: string;
          dueDate: string;
          daysUntil: number;
          href: string;
        }>,
        staleRevisionsAlertCount: 0,
      };

  const periodLabel = formatPeriod(summary.periodYear, summary.periodMonth);
  const currentPeriod = summary.currentPeriodSettlements;
  const progressPct =
    currentPeriod.totalCount > 0
      ? Math.round((currentPeriod.paidCount / currentPeriod.totalCount) * 100)
      : 0;
  const pendingInPeriod = currentPeriod.totalCount - currentPeriod.paidCount;

  const monthlyDeltaLabel = (() => {
    if (summary.monthlyCost.previous === 0) return dashboard.card_monthly_cost_delta_none;
    const pct = summary.monthlyCost.deltaPct ?? 0;
    if (pct > 0)
      return templateFill(dashboard.card_monthly_cost_delta_up_template, { pct });
    if (pct < 0)
      return templateFill(dashboard.card_monthly_cost_delta_down_template, {
        pct: Math.abs(pct),
      });
    return dashboard.card_monthly_cost_delta_flat;
  })();

  return (
    <>
      <RrhhModuleNav activeTab="resumen" />

      {summary.staleRevisionsAlertCount > 0 ? (
        <FormBanner
          variant="warning"
          action={
            canSettlements ? (
              <LinkButton href="/rrhh/contracts" variant="secondary" size="sm">
                {dashboard.alert_revisions_cta}
              </LinkButton>
            ) : null
          }
        >
          {templateFill(dashboard.alert_revisions_template, {
            count: summary.staleRevisionsAlertCount,
          })}
        </FormBanner>
      ) : null}

      <section className="grid gap-3">
        <header className="grid gap-1">
          <span className="text-eyebrow uppercase text-muted-foreground">
            {dashboard.section_eyebrow}
          </span>
          <h2 className="text-lg font-semibold text-foreground">
            {dashboard.section_title}{" "}
            <span className="text-sm font-normal text-muted-foreground">
              · {periodLabel}
            </span>
          </h2>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card padding="comfortable">
            <CardHeader
              eyebrow={dashboard.card_current_period_eyebrow}
              title={templateFill(dashboard.card_current_period_title_template, {
                period: periodLabel,
                status: settlementStatusLabel(currentPeriod.dominantStatus, dashboard),
              })}
            />
            <CardBody>
              {currentPeriod.totalCount > 0 ? (
                <div className="flex flex-col gap-3">
                  <span className="text-h2 font-semibold text-foreground">
                    {formatAmount(currentPeriod.totalAmount, clubCurrencyCode)}
                  </span>
                  <div
                    className="h-1.5 w-full overflow-hidden rounded-full bg-secondary"
                    role="progressbar"
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={progressPct}
                  >
                    <div
                      className="h-full bg-foreground transition-all"
                      style={{ width: `${progressPct}%`, borderRadius: 9999 }}
                    />
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {templateFill(dashboard.card_current_period_progress_template, {
                      paid: currentPeriod.paidCount,
                      total: currentPeriod.totalCount,
                      pending: pendingInPeriod,
                    })}
                  </span>
                </div>
              ) : (
                <span className="text-sm text-muted-foreground">
                  {dashboard.card_current_period_empty}
                </span>
              )}
            </CardBody>
          </Card>

          {hasTreasuryRole ? (
            <Card padding="comfortable">
              <CardHeader
                eyebrow={dashboard.card_pay_this_week_eyebrow}
                title={dashboard.card_pay_this_week_title}
              />
              <CardBody>
                {summary.pendingPay.count > 0 ? (
                  <div className="flex flex-col gap-2">
                    <span className="text-h2 font-semibold text-foreground">
                      {formatAmount(summary.pendingPay.totalAmount, clubCurrencyCode)}
                    </span>
                    <span className="text-sm text-muted-foreground">
                      {templateFill(dashboard.card_pay_this_week_subtitle_template, {
                        count: summary.pendingPay.count,
                        dueDateLabel: summary.payDueDate
                          ? formatDueDateLabel(summary.payDueDate)
                          : "—",
                      })}
                    </span>
                    {canSettlements ? (
                      <LinkButton href="/treasury/payroll" variant="secondary" size="sm">
                        {dashboard.card_pay_this_week_cta}
                      </LinkButton>
                    ) : null}
                  </div>
                ) : (
                  <span className="text-sm text-muted-foreground">
                    {dashboard.card_pay_this_week_empty}
                  </span>
                )}
              </CardBody>
            </Card>
          ) : null}

          <Card padding="comfortable">
            <CardHeader
              eyebrow={dashboard.card_active_staff_eyebrow}
              title={dashboard.card_active_staff_title}
            />
            <CardBody>
              <div className="flex flex-col gap-2">
                <span className="text-h2 font-semibold text-foreground">
                  {summary.activeStaff.count}
                </span>
                <span className="text-sm text-muted-foreground">
                  {summary.activeStaff.additionsLast30d > 0
                    ? templateFill(dashboard.card_active_staff_delta_template, {
                        additions: summary.activeStaff.additionsLast30d,
                      })
                    : dashboard.card_active_staff_delta_zero}
                </span>
                <LinkButton href="/rrhh/staff" variant="secondary" size="sm">
                  {dashboard.card_active_staff_cta}
                </LinkButton>
              </div>
            </CardBody>
          </Card>

          <Card padding="comfortable">
            <CardHeader
              eyebrow={dashboard.card_active_contracts_eyebrow}
              title={dashboard.card_active_contracts_title}
            />
            <CardBody>
              <div className="flex flex-col gap-2">
                <span className="text-h2 font-semibold text-foreground">
                  {summary.activeContracts.count}
                </span>
                <span className="text-sm text-muted-foreground">
                  {summary.activeContracts.staleRevisionCount === 0 &&
                  summary.activeContracts.endingSoonCount === 0
                    ? dashboard.card_active_contracts_subtitle_clean
                    : templateFill(dashboard.card_active_contracts_subtitle_template, {
                        revisions: summary.activeContracts.staleRevisionCount,
                        ending: summary.activeContracts.endingSoonCount,
                      })}
                </span>
                <LinkButton href="/rrhh/contracts" variant="secondary" size="sm">
                  {dashboard.card_active_contracts_cta}
                </LinkButton>
              </div>
            </CardBody>
          </Card>

          <Card padding="comfortable">
            <CardHeader
              eyebrow={dashboard.card_monthly_cost_eyebrow}
              title={dashboard.card_monthly_cost_title}
            />
            <CardBody>
              <div className="flex flex-col gap-1">
                <span className="text-h2 font-semibold text-foreground">
                  {formatAmount(summary.monthlyCost.current, clubCurrencyCode)}
                </span>
                <span
                  className={
                    summary.monthlyCost.deltaPct === null
                      ? "text-sm text-muted-foreground"
                      : (summary.monthlyCost.deltaPct ?? 0) >= 0
                        ? "text-sm font-medium text-ds-amber-700"
                        : "text-sm font-medium text-emerald-700"
                  }
                >
                  {monthlyDeltaLabel}
                </span>
                <span className="text-xs text-muted-foreground">
                  {templateFill(dashboard.card_monthly_cost_history_template, {
                    prevLabel: summary.monthlyCost.previousLabel,
                    prev: formatAmount(summary.monthlyCost.previous, clubCurrencyCode),
                    twoLabel: summary.monthlyCost.twoMonthsAgoLabel,
                    two: formatAmount(summary.monthlyCost.twoMonthsAgo, clubCurrencyCode),
                  })}
                </span>
              </div>
            </CardBody>
          </Card>

          <Card padding="comfortable">
            <CardHeader
              eyebrow={dashboard.card_structures_eyebrow}
              title={dashboard.card_structures_title}
            />
            <CardBody>
              <div className="flex flex-col gap-2">
                <span className="text-h2 font-semibold text-foreground">
                  {summary.structures.activeCount}
                </span>
                {summary.structures.nameList.length > 0 ? (
                  <span className="text-sm text-muted-foreground">
                    {summary.structures.nameList.join(", ")}
                    {summary.structures.activeCount > summary.structures.nameList.length
                      ? ` · ${templateFill(dashboard.card_structures_more_template, {
                          count:
                            summary.structures.activeCount -
                            summary.structures.nameList.length,
                        })}`
                      : ""}
                  </span>
                ) : null}
                <LinkButton href="/rrhh/structures" variant="secondary" size="sm">
                  {dashboard.card_structures_cta}
                </LinkButton>
              </div>
            </CardBody>
          </Card>

          <Card padding="comfortable" tone={summary.alertsCount > 0 ? "default" : "muted"}>
            <CardHeader
              eyebrow={dashboard.card_alerts_eyebrow}
              title={dashboard.card_alerts_title}
              description={dashboard.card_alerts_description}
            />
            <CardBody>
              <div className="flex flex-col gap-1">
                <span
                  className={
                    summary.alertsCount > 0
                      ? "text-h2 font-semibold text-ds-amber-700"
                      : "text-h2 font-semibold text-foreground"
                  }
                >
                  {summary.alertsCount}
                </span>
                {summary.alertsCount > 0 ? (
                  <LinkButton
                    href="/rrhh/staff?contract=without_active"
                    variant="secondary"
                    size="sm"
                  >
                    {dashboard.card_alerts_cta}
                  </LinkButton>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {dashboard.card_alerts_empty}
                  </span>
                )}
              </div>
            </CardBody>
          </Card>
        </div>
      </section>

      <section className="grid gap-3">
        <header className="grid gap-1">
          <span className="text-eyebrow uppercase text-muted-foreground">
            {dashboard.milestones_eyebrow}
          </span>
          <h2 className="text-lg font-semibold text-foreground">
            {dashboard.milestones_title}
          </h2>
        </header>
        {summary.upcomingMilestones.length === 0 ? (
          <DataTableEmpty
            title={dashboard.milestones_empty_title}
            description={dashboard.milestones_empty_description}
          />
        ) : (
          <DataTable density="compact">
            <DataTableBody>
              {summary.upcomingMilestones.map((m) => {
                const tone = m.daysUntil < 0 ? "warning" : m.daysUntil <= 14 ? "info" : "neutral";
                const typeLabel =
                  m.type === "revision_salarial"
                    ? dashboard.milestone_type_revision
                    : dashboard.milestone_type_end_contract;
                return (
                  <Link
                    key={`${m.type}-${m.href}`}
                    href={m.href}
                    className="block rounded-card focus:outline-none focus-visible:ring-2 focus-visible:ring-foreground/20"
                  >
                    <DataTableRow useGrid={false}>
                      <div className="flex flex-1 flex-col gap-0.5">
                        <span className="text-sm font-semibold text-foreground">{m.title}</span>
                        <span className="text-xs text-muted-foreground">
                          {typeLabel} · {m.subtitle}
                        </span>
                      </div>
                      <DataTableCell align="right">
                        <Chip tone={tone} size="sm">
                          {milestoneDaysChip(m.daysUntil, dashboard)}
                        </Chip>
                      </DataTableCell>
                    </DataTableRow>
                  </Link>
                );
              })}
            </DataTableBody>
          </DataTable>
        )}
      </section>
    </>
  );
}
