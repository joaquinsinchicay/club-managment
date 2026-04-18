import Link from "next/link";
import { redirect } from "next/navigation";

import { PageContentHeader } from "@/components/ui/page-content-header";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatLocalizedAmount } from "@/lib/amounts";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import {
  canAccessDashboardSummary,
  canAccessClubSettingsNavigation,
  canOperateSecretaria,
  canOperateTesoreria
} from "@/lib/domain/authorization";
import {
  getDashboardTreasuryCardForActiveClub,
  getTreasuryRoleDashboardForActiveClub
} from "@/lib/services/treasury-service";
import { texts } from "@/lib/texts";

function getSessionTone(status: "open" | "closed" | "not_started") {
  if (status === "open") {
    return "success";
  }

  if (status === "closed") {
    return "danger";
  }

  return "warning";
}

function getSessionLabel(status: "open" | "closed" | "not_started") {
  if (status === "open") {
    return texts.dashboard.treasury.session_open;
  }

  if (status === "closed") {
    return texts.dashboard.treasury.session_closed;
  }

  return texts.dashboard.treasury.session_not_started;
}

export default async function DashboardPage() {
  const context = await getAuthenticatedSessionContext();

  if (!context) {
    redirect("/login");
  }

  if (context.activeMemberships.length === 0 || !context.activeClub || !context.activeMembership) {
    redirect("/pending-approval");
  }

  if (!canAccessDashboardSummary(context.activeMembership)) {
    redirect("/dashboard/secretaria");
  }

  const canOperateSecretariaRole = canOperateSecretaria(context.activeMembership);
  const canOperateTesoreriaRole = canOperateTesoreria(context.activeMembership);
  const canAccessSettings = canAccessClubSettingsNavigation(context.activeMembership);
  const treasuryCard = canOperateSecretariaRole ? await getDashboardTreasuryCardForActiveClub() : null;
  const treasuryRoleDashboard = canOperateTesoreriaRole ? await getTreasuryRoleDashboardForActiveClub() : null;

  const secretariaTotal = treasuryCard
    ? treasuryCard.accounts.reduce(
        (total, account) => total + account.balances.reduce((sum, balance) => sum + balance.amount, 0),
        0
      )
    : 0;
  const tesoreriaTotal = treasuryRoleDashboard
    ? treasuryRoleDashboard.accounts.reduce(
        (total, account) => total + account.balances.reduce((sum, balance) => sum + balance.amount, 0),
        0
      )
    : 0;

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:py-8">
      <PageContentHeader
        eyebrow={texts.header.navigation.dashboard}
        title={texts.dashboard.overview.title}
        description={texts.dashboard.overview.description}
      />

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {canOperateSecretariaRole && treasuryCard ? (
          <article className="rounded-dialog border border-border bg-card p-5">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <p className="text-meta font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                    {texts.header.navigation.secretaria}
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                    {texts.dashboard.overview.secretaria_title}
                  </h2>
                </div>
                {treasuryCard.sessionStatus === "unresolved" ? null : (
                  <StatusBadge
                    label={getSessionLabel(treasuryCard.sessionStatus)}
                    tone={getSessionTone(treasuryCard.sessionStatus)}
                  />
                )}
              </div>

              <div className="space-y-1">
                <p className="text-meta font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {texts.dashboard.overview.visible_accounts_label}
                </p>
                <p className="text-4xl font-semibold tracking-tight text-foreground">
                  {treasuryCard.accounts.length}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-secondary/50 p-4">
                <p className="text-meta font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {texts.dashboard.overview.total_balance_label}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  {formatLocalizedAmount(secretariaTotal)}
                </p>
              </div>

              <Link
                href="/dashboard/secretaria"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
              >
                {texts.dashboard.overview.open_module_cta}
              </Link>
            </div>
          </article>
        ) : null}

        {canOperateTesoreriaRole && treasuryRoleDashboard ? (
          <article className="rounded-dialog border border-border bg-card p-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-meta font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {texts.header.navigation.tesoreria}
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  {texts.dashboard.overview.tesoreria_title}
                </h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-secondary/50 p-4">
                  <p className="text-meta font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {texts.dashboard.overview.visible_accounts_label}
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                    {treasuryRoleDashboard.accounts.length}
                  </p>
                </div>

                <div className="rounded-xl border border-border bg-secondary/50 p-4">
                  <p className="text-meta font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {texts.dashboard.overview.recent_movements_label}
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                    {treasuryRoleDashboard.movementGroups.reduce(
                      (total, group) =>
                        total + group.accounts.reduce((accountTotal, account) => accountTotal + account.movements.length, 0),
                      0
                    )}
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-secondary/50 p-4">
                <p className="text-meta font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {texts.dashboard.overview.total_balance_label}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  {formatLocalizedAmount(tesoreriaTotal)}
                </p>
              </div>

              <Link
                href="/dashboard/treasury"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
              >
                {texts.dashboard.overview.open_module_cta}
              </Link>
            </div>
          </article>
        ) : null}

        {canAccessSettings ? (
          <article className="rounded-dialog border border-border bg-card p-5">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-meta font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {texts.dashboard.overview.settings_title}
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  {texts.dashboard.overview.settings_title}
                </h2>
              </div>

              <p className="text-sm leading-6 text-muted-foreground">
                {texts.dashboard.overview.settings_description}
              </p>

              <Link
                href="/settings/club"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-xl border border-border bg-card px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
              >
                {texts.dashboard.overview.open_settings_cta}
              </Link>
            </div>
          </article>
        ) : null}
      </section>
    </main>
  );
}
