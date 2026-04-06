import { CardShell } from "@/components/ui/card-shell";
import { texts } from "@/lib/texts";

export function GoogleLoginCard() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <CardShell
        eyebrow={texts.app.badge}
        title={texts.auth.login.title}
        description={texts.auth.login.description}
      >
        <div className="space-y-4">
          <a
            className="flex min-h-11 w-full items-center justify-center rounded-2xl bg-foreground px-4 py-3 text-center text-sm font-semibold text-primary-foreground transition hover:opacity-95"
            href="/auth/google/start"
          >
            {texts.auth.login.google_sign_in_cta}
          </a>
          <p className="text-center text-sm text-muted-foreground">
            {texts.auth.login.helper}
          </p>
        </div>
      </CardShell>
    </main>
  );
}
