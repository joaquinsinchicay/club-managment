import { redirect } from "next/navigation";

import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { LinkButton } from "@/components/ui/link-button";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canAccessHrModule, canOperateHrSettlements } from "@/lib/domain/authorization";
import { texts } from "@/lib/texts";

export default async function RrhhPage() {
  const context = await getAuthenticatedSessionContext();

  if (!context || !canAccessHrModule(context.activeMembership)) {
    redirect("/dashboard");
  }

  const rrhhTexts = texts.rrhh;
  const home = rrhhTexts.home;
  const canSettlements = canOperateHrSettlements(context.activeMembership);

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

      <div className="grid gap-4 sm:grid-cols-2">
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
      </div>

      <Card padding="comfortable" tone="muted">
        <CardHeader
          eyebrow={rrhhTexts.placeholder_available_soon}
          title={rrhhTexts.placeholder_title}
          description={rrhhTexts.placeholder_description}
        />
        <CardBody>
          <p className="text-sm text-muted-foreground">{home.upcoming_sections_note}</p>
        </CardBody>
      </Card>
    </main>
  );
}
