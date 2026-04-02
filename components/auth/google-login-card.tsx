import Link from "next/link";

import { CardShell } from "@/components/ui/card-shell";
import { StatusMessage } from "@/components/ui/status-message";
import { texts } from "@/lib/texts";

type GoogleLoginCardProps = {
  searchParams?: {
    error?: string;
  };
};

const ERROR_MESSAGES = {
  oauth_cancelled: texts.auth.login.oauth_cancelled,
  oauth_generic_error: texts.auth.login.oauth_generic_error
} as const;

export function GoogleLoginCard({ searchParams }: GoogleLoginCardProps) {
  const errorKey = searchParams?.error as keyof typeof ERROR_MESSAGES | undefined;
  const errorMessage = errorKey ? ERROR_MESSAGES[errorKey] : null;

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <CardShell
        eyebrow={texts.app.badge}
        title={texts.auth.login.title}
        description={texts.auth.login.description}
      >
        <div className="space-y-4">
          {errorMessage ? <StatusMessage tone="destructive" message={errorMessage} /> : null}
          <Link
            className="flex min-h-11 w-full items-center justify-center rounded-2xl bg-foreground px-4 py-3 text-center text-sm font-semibold text-primary-foreground transition hover:opacity-95"
            href="/auth/google/start"
          >
            {texts.auth.login.google_sign_in_cta}
          </Link>
          <p className="text-center text-sm text-muted-foreground">
            {texts.auth.login.helper}
          </p>
        </div>
      </CardShell>
    </main>
  );
}
