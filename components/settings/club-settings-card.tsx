import { CardShell } from "@/components/ui/card-shell";
import { texts } from "@/lib/texts";
import type { SessionContext } from "@/lib/auth/service";

type ClubSettingsCardProps = {
  context: SessionContext;
};

export function ClubSettingsCard({ context }: ClubSettingsCardProps) {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <CardShell
        eyebrow={texts.settings.club.eyebrow}
        title={texts.settings.club.title}
        description={texts.settings.club.description}
        className="max-w-2xl"
      >
        <div className="rounded-2xl border border-border bg-secondary/70 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {texts.dashboard.club_label}
          </p>
          <p className="mt-1 text-base font-semibold text-foreground">
            {context.activeClub?.name}
          </p>
        </div>
      </CardShell>
    </main>
  );
}
