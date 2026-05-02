import { redirect } from "next/navigation";

import { Card } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { PageContentHeader } from "@/components/ui/page-content-header";
import { Badge } from "@/components/ui/badge";
import { formatLocalizedAmount } from "@/lib/amounts";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import {
  canAccessDashboardSummary,
  canAccessClubSettingsNavigation,
  canOperateSecretaria,
  canOperateTesoreria
} from "@/lib/domain/authorization";
import {
  ensureDailyCashSessionGuardSafe,
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
    redirect("/secretary");
  }

  const canOperateSecretariaRole = canOperateSecretaria(context.activeMembership);
  const canOperateTesoreriaRole = canOperateTesoreria(context.activeMembership);
  const canAccessSettings = canAccessClubSettingsNavigation(context.activeMembership);

  // Guard de jornada vencida (antes vivía en el layout root, hoy se invoca
  // explícitamente solo en las pages que muestran info de jornada).
  await ensureDailyCashSessionGuardSafe({
    activeClub: { id: context.activeClub.id },
    user: { id: context.user.id }
  });

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
          <Card as="article" padding="compact">
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-2">
                  <p className="text-meta font-semibold uppercase tracking-card-eyebrow text-muted-foreground">
                    {texts.header.navigation.secretaria}
                  </p>
                  <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                    {texts.dashboard.overview.secretaria_title}
                  </h2>
                </div>
                {treasuryCard.sessionStatus === "unresolved" ? null : (
                  <Badge
                    label={getSessionLabel(treasuryCard.sessionStatus)}
                    tone={getSessionTone(treasuryCard.sessionStatus)}
                  />
                )}
              </div>

              <div className="space-y-1">
                <p className="text-meta font-semibold uppercase tracking-card-eyebrow text-muted-foreground">
                  {texts.dashboard.overview.visible_accounts_label}
                </p>
                <p className="text-4xl font-semibold tracking-tight text-foreground">
                  {treasuryCard.accounts.length}
                </p>
              </div>

              <div className="rounded-card border border-border bg-secondary-hover p-4">
                <p className="text-meta font-semibold uppercase tracking-card-eyebrow text-muted-foreground">
                  {texts.dashboard.overview.total_balance_label}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  {formatLocalizedAmount(secretariaTotal)}
                </p>
              </div>

              <LinkButton href="/secretary" variant="primary" fullWidth>
                {texts.dashboard.overview.open_module_cta}
              </LinkButton>
            </div>
          </Card>
        ) : null}

        {canOperateTesoreriaRole && treasuryRoleDashboard ? (
          <Card as="article" padding="compact">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-meta font-semibold uppercase tracking-card-eyebrow text-muted-foreground">
                  {texts.header.navigation.tesoreria}
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  {texts.dashboard.overview.tesoreria_title}
                </h2>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-card border border-border bg-secondary-hover p-4">
                  <p className="text-meta font-semibold uppercase tracking-card-eyebrow text-muted-foreground">
                    {texts.dashboard.overview.visible_accounts_label}
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                    {treasuryRoleDashboard.accounts.length}
                  </p>
                </div>

                <div className="rounded-card border border-border bg-secondary-hover p-4">
                  <p className="text-meta font-semibold uppercase tracking-card-eyebrow text-muted-foreground">
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

              <div className="rounded-card border border-border bg-secondary-hover p-4">
                <p className="text-meta font-semibold uppercase tracking-card-eyebrow text-muted-foreground">
                  {texts.dashboard.overview.total_balance_label}
                </p>
                <p className="mt-2 text-2xl font-semibold tracking-tight text-foreground">
                  {formatLocalizedAmount(tesoreriaTotal)}
                </p>
              </div>

              <LinkButton href="/treasury" variant="primary" fullWidth>
                {texts.dashboard.overview.open_module_cta}
              </LinkButton>
            </div>
          </Card>
        ) : null}

        {canAccessSettings ? (
          <Card as="article" padding="compact">
            <div className="space-y-4">
              <div className="space-y-2">
                <p className="text-meta font-semibold uppercase tracking-card-eyebrow text-muted-foreground">
                  {texts.dashboard.overview.settings_title}
                </p>
                <h2 className="text-2xl font-semibold tracking-tight text-foreground">
                  {texts.dashboard.overview.settings_title}
                </h2>
              </div>

              <p className="text-sm leading-6 text-muted-foreground">
                {texts.dashboard.overview.settings_description}
              </p>

              <LinkButton href="/settings" variant="secondary" fullWidth>
                {texts.dashboard.overview.open_settings_cta}
              </LinkButton>
            </div>
          </Card>
        ) : null}
      </section>
    </main>
  );
}
