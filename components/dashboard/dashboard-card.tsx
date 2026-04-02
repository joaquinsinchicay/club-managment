import { AppHeader } from "@/components/navigation/app-header";
import { CardShell } from "@/components/ui/card-shell";
import { texts } from "@/lib/texts";
import type { SessionContext } from "@/lib/auth/service";

type DashboardCardProps = {
  context: SessionContext;
};

export function DashboardCard({ context }: DashboardCardProps) {
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
                  {context.activeMembership?.role ?? texts.dashboard.role_pending}
                </p>
              </div>
            </div>
          </div>
        </CardShell>
      </main>
    </div>
  );
}
