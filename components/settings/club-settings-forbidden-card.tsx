import { CardShell } from "@/components/ui/card-shell";
import { PageContentHeader } from "@/components/ui/page-content-header";
import { StatusMessage } from "@/components/ui/status-message";
import { texts } from "@/lib/texts";

export function ClubSettingsForbiddenCard() {
  return (
    <main className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-6 sm:py-8">
      <PageContentHeader
        eyebrow={texts.settings.club.eyebrow}
        title={texts.settings.club.forbidden_title}
        description={texts.settings.club.forbidden_description}
        backHref="/dashboard"
        backLabel={texts.settings.club.back_to_dashboard_cta}
      />

      <CardShell
        eyebrow={texts.settings.club.eyebrow}
        title={texts.settings.club.forbidden_title}
        description={texts.settings.club.forbidden_description}
        className="max-w-2xl"
      >
        <div className="space-y-4">
          <StatusMessage tone="destructive" message={texts.settings.club.forbidden_description} />
        </div>
      </CardShell>
    </main>
  );
}
