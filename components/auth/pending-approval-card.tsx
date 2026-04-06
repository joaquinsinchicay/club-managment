import { AppHeader } from "@/components/navigation/app-header";
import { CardShell } from "@/components/ui/card-shell";
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
        <CardShell
          eyebrow={texts.auth.pending_approval.eyebrow}
          title={texts.auth.pending_approval.title}
          description={texts.auth.pending_approval.description}
        >
          <div className="space-y-4 text-sm text-muted-foreground">
            <div className="rounded-2xl border border-border bg-secondary/70 p-4">
              <p className="font-medium text-foreground">{context.user.fullName}</p>
              <p>{context.user.email}</p>
            </div>
            <p>{texts.auth.pending_approval.next_step}</p>
          </div>
        </CardShell>
      </main>
    </div>
  );
}
