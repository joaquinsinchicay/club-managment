import Link from "next/link";

import { CardShell } from "@/components/ui/card-shell";
import { StatusMessage } from "@/components/ui/status-message";
import { texts } from "@/lib/texts";

export function ClubSettingsForbiddenCard() {
  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-10">
      <CardShell
        eyebrow={texts.settings.club.eyebrow}
        title={texts.settings.club.forbidden_title}
        description={texts.settings.club.forbidden_description}
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <StatusMessage tone="destructive" message={texts.settings.club.forbidden_description} />
          <Link
            href="/dashboard"
            className="flex min-h-11 w-full items-center justify-center rounded-2xl bg-foreground px-4 py-3 text-center text-sm font-semibold text-primary-foreground transition hover:opacity-95"
          >
            {texts.settings.club.back_to_dashboard_cta}
          </Link>
        </div>
      </CardShell>
    </main>
  );
}
