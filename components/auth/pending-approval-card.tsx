import { AppHeader } from "@/components/navigation/app-header";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { SessionContext } from "@/lib/auth/service";
import { texts } from "@/lib/texts";

type PendingApprovalCardProps = {
  context: SessionContext;
};

export function PendingApprovalCard({ context }: PendingApprovalCardProps) {
  return (
    <div className="min-h-screen">
      <AppHeader context={context} />

      <main className="mx-auto w-full max-w-5xl px-4 py-10">
        <Card maxWidth="md" padding="spacious" className="rounded-dialog">
          <header className="mb-6 space-y-3">
            <Badge label={texts.auth.pending_approval.eyebrow} tone="neutral" />
            <div className="space-y-2">
              <h1 className="text-2xl font-semibold tracking-tight text-card-foreground">
                {texts.auth.pending_approval.title}
              </h1>
              <p className="text-sm leading-6 text-muted-foreground">
                {texts.auth.pending_approval.description}
              </p>
            </div>
          </header>
          <div className="space-y-4 text-sm text-muted-foreground">
            <Card tone="muted" padding="compact">
              <CardBody>
                <p className="font-medium text-foreground">{context.user.fullName}</p>
                <p>{context.user.email}</p>
              </CardBody>
            </Card>
            <p>{texts.auth.pending_approval.next_step}</p>
          </div>
        </Card>
      </main>
    </div>
  );
}
