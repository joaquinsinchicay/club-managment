import { ActiveClubSelector } from "@/components/dashboard/active-club-selector";
import { TreasuryCard } from "@/components/dashboard/treasury-card";
import { AppHeader } from "@/components/navigation/app-header";
import { CardShell } from "@/components/ui/card-shell";
import { formatMembershipRoles } from "@/lib/domain/membership-roles";
import { texts } from "@/lib/texts";
import type { SessionContext } from "@/lib/auth/service";
import type { DashboardTreasuryCard as DashboardTreasuryCardData, TreasuryAccount, TreasuryCategory } from "@/lib/domain/access";

type DashboardCardProps = {
  context: SessionContext;
  setActiveClubAction: (formData: FormData) => Promise<void>;
  treasuryCard: DashboardTreasuryCardData | null;
  treasuryAccounts: TreasuryAccount[];
  treasuryCategories: TreasuryCategory[];
  createTreasuryMovementAction: (formData: FormData) => Promise<void>;
};

export function DashboardCard({
  context,
  setActiveClubAction,
  treasuryCard,
  treasuryAccounts,
  treasuryCategories,
  createTreasuryMovementAction
}: DashboardCardProps) {
  return (
    <div className="min-h-screen">
      <AppHeader context={context} />

      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        <CardShell
          eyebrow={texts.dashboard.eyebrow}
          title={texts.dashboard.title}
          description={texts.dashboard.description}
        >
          <div className="space-y-4 text-sm text-muted-foreground">
            <div className="grid gap-3 rounded-2xl border border-border bg-secondary/70 p-4">
              {context.availableClubs.length > 1 ? (
                <ActiveClubSelector
                  clubs={context.availableClubs}
                  activeClubId={context.activeClub?.id ?? context.availableClubs[0]?.id ?? ""}
                  setActiveClubAction={setActiveClubAction}
                />
              ) : null}
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                  {texts.dashboard.club_label}
                </p>
                <p className="mt-1 text-base font-semibold text-foreground">
                  {context.activeClub?.name}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                  {texts.dashboard.user_label}
                </p>
                <p className="mt-1 text-base font-semibold text-foreground">
                  {context.user.fullName}
                </p>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em]">
                  {context.activeMembership?.roles.length && context.activeMembership.roles.length > 1
                    ? texts.dashboard.roles_label
                    : texts.dashboard.role_label}
                </p>
                <p className="mt-1 text-base font-semibold text-foreground">
                  {context.activeMembership
                    ? formatMembershipRoles(context.activeMembership.roles)
                    : texts.dashboard.role_pending}
                </p>
              </div>
            </div>

            {treasuryCard ? (
              <TreasuryCard
                treasuryCard={treasuryCard}
                accounts={treasuryAccounts}
                categories={treasuryCategories}
                createTreasuryMovementAction={createTreasuryMovementAction}
              />
            ) : null}
          </div>
        </CardShell>
      </main>
    </div>
  );
}
