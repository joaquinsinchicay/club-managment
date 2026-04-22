import { redirect } from "next/navigation";

import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { getAuthenticatedSessionContext } from "@/lib/auth/service";
import { canAccessHrModule } from "@/lib/domain/authorization";
import { texts } from "@/lib/texts";

export default async function RrhhPage() {
  const context = await getAuthenticatedSessionContext();

  if (!context || !canAccessHrModule(context.activeMembership)) {
    redirect("/dashboard");
  }

  const rrhhTexts = texts.rrhh;

  return (
    <main className="px-3.5 py-6">
      <header className="mb-6 grid gap-1">
        <span className="text-eyebrow uppercase text-muted-foreground">
          {rrhhTexts.page_title}
        </span>
        <h1 className="text-h2 font-semibold tracking-tight text-foreground">
          {rrhhTexts.placeholder_title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {rrhhTexts.page_description}
        </p>
      </header>

      <Card padding="comfortable" tone="muted">
        <CardHeader
          eyebrow={rrhhTexts.placeholder_available_soon}
          title={rrhhTexts.placeholder_title}
          description={rrhhTexts.placeholder_description}
        />
        <CardBody>
          <p className="text-sm text-muted-foreground">
            {rrhhTexts.page_description}
          </p>
        </CardBody>
      </Card>
    </main>
  );
}
