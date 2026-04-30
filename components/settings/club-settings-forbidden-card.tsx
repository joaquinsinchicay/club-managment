import { Card } from "@/components/ui/card";
import { PageContentHeader } from "@/components/ui/page-content-header";
import { Badge } from "@/components/ui/badge";
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

      <Card maxWidth="2xl" padding="spacious" className="rounded-dialog">
        <header className="mb-6 space-y-3">
          <Badge label={texts.settings.club.eyebrow} tone="neutral" />
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-card-foreground">
              {texts.settings.club.forbidden_title}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              {texts.settings.club.forbidden_description}
            </p>
          </div>
        </header>
        <div className="space-y-4">
          <StatusMessage tone="destructive" message={texts.settings.club.forbidden_description} />
        </div>
      </Card>
    </main>
  );
}
