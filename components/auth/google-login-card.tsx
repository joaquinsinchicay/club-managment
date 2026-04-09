"use client";

import { useState } from "react";

import { CardShell } from "@/components/ui/card-shell";
import { GoogleLogo } from "@/components/ui/google-logo";
import { Spinner } from "@/components/ui/pending-form";
import { texts } from "@/lib/texts";

export function GoogleLoginCard() {
  const [isRedirecting, setIsRedirecting] = useState(false);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <CardShell
        eyebrow={texts.app.badge}
        title={texts.auth.login.title}
        description={texts.auth.login.description}
      >
        <div className="space-y-4">
          <a
            aria-disabled={isRedirecting}
            className="grid min-h-11 w-full grid-cols-[20px_minmax(0,1fr)_20px] items-center gap-3 rounded-2xl bg-foreground px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95"
            href="/auth/google/start"
            onClick={() => setIsRedirecting(true)}
          >
            {isRedirecting ? (
              <span className="col-span-3 inline-flex items-center justify-center gap-2">
                <Spinner />
                <span>{texts.auth.login.loading}</span>
              </span>
            ) : (
              <>
                <GoogleLogo />
                <span className="text-center">{texts.auth.login.google_sign_in_cta}</span>
                <span aria-hidden="true" />
              </>
            )}
          </a>
          <p className="text-center text-sm text-muted-foreground">
            {texts.auth.login.helper}
          </p>
        </div>
      </CardShell>
    </main>
  );
}
