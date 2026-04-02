import { CardShell } from "@/components/ui/card-shell";
import { texts } from "@/lib/texts";
import type { User } from "@/lib/domain/access";

type PendingApprovalCardProps = {
  user: User;
};

export function PendingApprovalCard({ user }: PendingApprovalCardProps) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <CardShell
        eyebrow={texts.auth.pending_approval.eyebrow}
        title={texts.auth.pending_approval.title}
        description={texts.auth.pending_approval.description}
      >
        <div className="space-y-4 text-sm text-muted-foreground">
          <div className="rounded-2xl border border-border bg-secondary/70 p-4">
            <p className="font-medium text-foreground">{user.fullName}</p>
            <p>{user.email}</p>
          </div>
          <p>{texts.auth.pending_approval.next_step}</p>
        </div>
      </CardShell>
    </main>
  );
}
