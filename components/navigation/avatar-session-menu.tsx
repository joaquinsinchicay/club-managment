"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { BlockingOverlay } from "@/components/ui/overlay";
import { Spinner } from "@/components/ui/pending-form";
import { texts } from "@/lib/texts";

type AvatarSessionMenuProps = {
  fullName: string;
  email: string;
  avatarUrl: string | null;
};

function getInitials(fullName: string, email: string) {
  const nameParts = fullName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2);

  if (nameParts.length > 0) {
    return nameParts.map((part) => part[0]?.toUpperCase() ?? "").join("");
  }

  return email.trim()[0]?.toUpperCase() ?? "";
}

export function AvatarSessionMenu({
  fullName,
  email,
  avatarUrl
}: AvatarSessionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const fallbackDescriptionId = "avatar-fallback-description";
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmingSignOut, setIsConfirmingSignOut] = useState(false);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const initials = useMemo(() => getInitials(fullName, email), [email, fullName]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        aria-label={texts.header.avatar_menu.trigger_aria_label}
        aria-describedby={avatarUrl ? undefined : fallbackDescriptionId}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((current) => !current)}
        className="flex min-h-11 min-w-11 items-center justify-center rounded-full border border-border bg-card text-sm font-semibold text-foreground transition hover:bg-secondary"
      >
        {avatarUrl ? (
          <Image
            src={avatarUrl}
            alt=""
            width={44}
            height={44}
            unoptimized
            className="h-11 w-11 rounded-full object-cover"
          />
        ) : (
          <>
            <span aria-hidden="true">{initials}</span>
            <span id={fallbackDescriptionId} className="sr-only">
              {texts.header.avatar_menu.fallback_initials_label}
            </span>
          </>
        )}
      </button>

      {isOpen ? (
        <div
          role="menu"
          aria-label={texts.header.avatar_menu.menu_aria_label}
          className="absolute right-0 top-14 z-20 min-w-56 rounded-3xl border border-border bg-card p-2 shadow-soft"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              setIsConfirmingSignOut(true);
            }}
            className="w-full rounded-2xl px-4 py-3 text-left text-sm font-medium text-destructive transition hover:bg-destructive/10"
          >
            {texts.header.avatar_menu.sign_out}
          </button>
        </div>
      ) : null}

      {isConfirmingSignOut ? (
        <BlockingOverlay
          open
          className="z-30 bg-foreground/40"
          contentClassName="items-center justify-center px-4"
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="sign-out-dialog-title"
            aria-describedby="sign-out-dialog-description"
            className="w-full max-w-sm rounded-[28px] border border-border bg-card p-6 shadow-soft"
          >
            <h2 id="sign-out-dialog-title" className="text-xl font-semibold text-card-foreground">
              {texts.auth.sign_out.confirm_title}
            </h2>
            <p
              id="sign-out-dialog-description"
              className="mt-2 text-sm leading-6 text-muted-foreground"
            >
              {texts.auth.sign_out.confirm_description}
            </p>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                disabled={isSigningOut}
                onClick={() => setIsConfirmingSignOut(false)}
                className="min-h-11 rounded-2xl border border-border bg-secondary px-4 py-3 text-sm font-semibold text-foreground transition hover:bg-muted disabled:opacity-60"
              >
                {texts.auth.sign_out.cancel_cta}
              </button>
              <Link
                href="/auth/sign-out"
                aria-disabled={isSigningOut}
                onClick={() => setIsSigningOut(true)}
                className="flex min-h-11 items-center justify-center rounded-2xl bg-destructive px-4 py-3 text-center text-sm font-semibold text-primary-foreground transition hover:opacity-95 aria-disabled:opacity-60"
              >
                {isSigningOut ? (
                  <>
                    <Spinner />
                    <span>{texts.auth.sign_out.loading}</span>
                  </>
                ) : (
                  texts.auth.sign_out.confirm_cta
                )}
              </Link>
            </div>
          </div>
        </BlockingOverlay>
      ) : null}
    </div>
  );
}
