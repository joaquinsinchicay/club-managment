import { CardShell } from "@/components/ui/card-shell";
import { texts } from "@/lib/texts";
import type { SessionContext } from "@/lib/auth/service";

type DashboardCardProps = {
  context: SessionContext;
};

export function DashboardCard({ context }: DashboardCardProps) {
  const membership = context.activeMemberships.find(
    (item) => item.clubId === context.activeClub?.id
  );

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <CardShell
        eyebrow={texts.dashboard.eyebrow}
        title={texts.dashboard.title}
        description={texts.dashboard.description}
      >
        <div className="space-y-4 text-sm text-muted-foreground">
          <div className="grid gap-3 rounded-2xl border border-border bg-secondary/70 p-4">
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
                {texts.dashboard.role_label}
              </p>
              <p className="mt-1 text-base font-semibold capitalize text-foreground">
                {membership?.role ?? texts.dashboard.role_pending}
              </p>
            </div>
          </div>
        </div>
      </CardShell>
    </main>
  );
}
