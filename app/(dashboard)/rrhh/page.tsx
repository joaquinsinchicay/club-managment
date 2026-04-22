import { redirect } from "next/navigation";

import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canAccessHrModule, canOperateHrSettlements } from "@/lib/domain/authorization";
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

export default async function RrhhPage() {
  const context = await getAuthenticatedSessionContext();

  if (!context || !canAccessHrModule(context.activeMembership)) {
    redirect("/dashboard");
  }

  const rrhhTexts = texts.rrhh;
  const home = rrhhTexts.home;
  const dashboard = rrhhTexts.dashboard;
  const canSettlements = canOperateHrSettlements(context.activeMembership);
  const clubCurrencyCode = context.activeClub!.currencyCode;

  const summaryResult = await getHrDashboardSummary();
  const summary = summaryResult.ok
    ? summaryResult.summary
    : {
        pendingConfirm: { count: 0, totalAmount: 0 },
        pendingPay: { count: 0, totalAmount: 0 },
        projectedMonth: 0,
        executedMonth: 0,
        vacantStructures: 0,
        alertsCount: 0,
        periodYear: new Date().getFullYear(),
        periodMonth: new Date().getMonth() + 1,
      };

  const periodLabel = formatPeriod(summary.periodYear, summary.periodMonth);

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      <header className="grid gap-1">
        <span className="text-eyebrow uppercase text-muted-foreground">
          {rrhhTexts.page_title}
        </span>
        <h1 className="text-h2 font-semibold tracking-tight text-foreground">
          {home.title}
        </h1>
        <p className="text-sm text-muted-foreground">{home.description}</p>
      </header>

      <section className="grid gap-3">
        <header className="flex items-end justify-between gap-3">
          <div className="grid gap-1">
            <span className="text-eyebrow uppercase text-muted-foreground">
              {dashboard.section_eyebrow}
            </span>
            <h2 className="text-lg font-semibold text-foreground">
              {dashboard.section_title}{" "}
              <span className="text-sm font-normal text-muted-foreground">
                · {periodLabel}
              </span>
            </h2>
          </div>
          <LinkButton href="/rrhh/reports" variant="secondary" size="sm">
            {dashboard.reports_cta}
          </LinkButton>
        </header>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Card padding="comfortable">
            <CardHeader
              eyebrow={dashboard.card_pending_confirm_eyebrow}
              title={dashboard.card_pending_confirm_title}
              description={dashboard.card_pending_confirm_description}
            />
            <CardBody>
              <div className="flex flex-col gap-1">
                <span className="text-h2 font-semibold text-foreground">
                  {summary.pendingConfirm.count}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatAmount(summary.pendingConfirm.totalAmount, clubCurrencyCode)}
                </span>
                {canSettlements && summary.pendingConfirm.count > 0 ? (
                  <LinkButton
                    href="/rrhh/settlements?status=generada"
                    variant="secondary"
                    size="sm"
                  >
                    {dashboard.card_pending_confirm_cta}
                  </LinkButton>
                ) : null}
              </div>
            </CardBody>
          </Card>

          <Card padding="comfortable">
            <CardHeader
              eyebrow={dashboard.card_pending_pay_eyebrow}
              title={dashboard.card_pending_pay_title}
              description={dashboard.card_pending_pay_description}
            />
            <CardBody>
              <div className="flex flex-col gap-1">
                <span className="text-h2 font-semibold text-foreground">
                  {summary.pendingPay.count}
                </span>
                <span className="text-sm text-muted-foreground">
                  {formatAmount(summary.pendingPay.totalAmount, clubCurrencyCode)}
                </span>
                {canSettlements && summary.pendingPay.count > 0 ? (
                  <LinkButton
                    href="/rrhh/settlements?status=confirmada"
                    variant="secondary"
                    size="sm"
                  >
                    {dashboard.card_pending_pay_cta}
                  </LinkButton>
                ) : null}
              </div>
            </CardBody>
          </Card>

          <Card padding="comfortable">
            <CardHeader
              eyebrow={dashboard.card_projected_eyebrow}
              title={dashboard.card_projected_title}
              description={dashboard.card_projected_description}
            />
            <CardBody>
              <span className="text-h2 font-semibold text-foreground">
                {formatAmount(summary.projectedMonth, clubCurrencyCode)}
              </span>
              <span className="block text-xs text-muted-foreground">
                {dashboard.card_projected_note}
              </span>
            </CardBody>
          </Card>

          <Card padding="comfortable">
            <CardHeader
              eyebrow={dashboard.card_executed_eyebrow}
              title={dashboard.card_executed_title}
              description={dashboard.card_executed_description}
            />
            <CardBody>
              <span className="text-h2 font-semibold text-foreground">
                {formatAmount(summary.executedMonth, clubCurrencyCode)}
              </span>
            </CardBody>
          </Card>

          <Card padding="comfortable">
            <CardHeader
              eyebrow={dashboard.card_vacant_eyebrow}
              title={dashboard.card_vacant_title}
              description={dashboard.card_vacant_description}
            />
            <CardBody>
              <div className="flex flex-col gap-1">
                <span className="text-h2 font-semibold text-foreground">
                  {summary.vacantStructures}
                </span>
                <LinkButton href="/settings?tab=rrhh" variant="secondary" size="sm">
                  {dashboard.card_vacant_cta}
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
                      ? "text-h2 font-semibold text-amber-700"
                      : "text-h2 font-semibold text-foreground"
                  }
                >
                  {summary.alertsCount}
                </span>
                {summary.alertsCount > 0 ? (
                  <LinkButton href="/settings?tab=rrhh" variant="secondary" size="sm">
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

      <section className="grid gap-3 sm:grid-cols-2">
        <Card padding="comfortable">
          <CardHeader
            eyebrow={home.settlements_eyebrow}
            title={home.settlements_title}
            description={home.settlements_description}
          />
          <CardBody>
            {canSettlements ? (
              <LinkButton href="/rrhh/settlements" variant="primary">
                {home.settlements_cta}
              </LinkButton>
            ) : (
              <p className="text-xs text-muted-foreground">{home.no_access_note}</p>
            )}
          </CardBody>
        </Card>

        <Card padding="comfortable" tone="muted">
          <CardHeader
            eyebrow={rrhhTexts.placeholder_available_soon}
            title={home.masters_title}
            description={home.masters_description}
          />
          <CardBody>
            <LinkButton href="/settings?tab=rrhh" variant="secondary">
              {home.masters_cta}
            </LinkButton>
          </CardBody>
        </Card>
      </section>
    </main>
  );
}
