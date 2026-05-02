"use client";

import { useState } from "react";

import { buttonClass } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { GoogleLogo } from "@/components/ui/google-logo";
import { Spinner } from "@/components/ui/pending-form";
import { Badge } from "@/components/ui/badge";
import { app as txtApp, auth as txtAuth } from "@/lib/texts";

export function GoogleLoginCard() {
  const [isRedirecting, setIsRedirecting] = useState(false);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card maxWidth="md" padding="spacious" className="rounded-dialog">
        <header className="mb-6 space-y-3">
          <Badge label={txtApp.badge} tone="neutral" />
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight text-card-foreground">
              {txtAuth.login.title}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              {txtAuth.login.description}
            </p>
          </div>
        </header>
        <div className="space-y-4">
          <a
            aria-disabled={isRedirecting}
            className={buttonClass({
              variant: "primary",
              fullWidth: true,
              className: "grid grid-cols-[20px_minmax(0,1fr)_20px] gap-3",
            })}
            href="/auth/google/start"
            onClick={() => setIsRedirecting(true)}
          >
            {isRedirecting ? (
              <span className="col-span-3 inline-flex items-center justify-center gap-2">
                <Spinner />
                <span>{txtAuth.login.loading}</span>
              </span>
            ) : (
              <>
                <GoogleLogo />
                <span className="text-center">{txtAuth.login.google_sign_in_cta}</span>
                <span aria-hidden="true" />
              </>
            )}
          </a>
          <p className="text-center text-sm text-muted-foreground">
            {txtAuth.login.helper}
          </p>
        </div>
      </Card>
    </main>
  );
}
