"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";

import { getInitials } from "@/components/ui/avatar";
import { Modal } from "@/components/ui/modal";
import { ModalFooter } from "@/components/ui/modal-footer";
import { auth as txtAuth, header as txtHeader } from "@/lib/texts";

type AvatarSessionMenuProps = {
  fullName: string;
  email: string;
  avatarUrl: string | null;
};

export function AvatarSessionMenu({
  fullName,
  email,
  avatarUrl
}: AvatarSessionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const fallbackDescriptionId = "avatar-fallback-description";
  const [isOpen, setIsOpen] = useState(false);
  const [isConfirmingSignOut, setIsConfirmingSignOut] = useState(false);
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
        aria-label={txtHeader.avatar_menu.trigger_aria_label}
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
              {txtHeader.avatar_menu.fallback_initials_label}
            </span>
          </>
        )}
      </button>

      {isOpen ? (
        <div
          role="menu"
          aria-label={txtHeader.avatar_menu.menu_aria_label}
          className="absolute right-0 top-14 z-20 min-w-56 rounded-dialog border border-border bg-card p-2 shadow-soft"
        >
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              setIsConfirmingSignOut(true);
            }}
            className="w-full rounded-btn px-4 py-3 text-left text-sm font-medium text-destructive transition hover:bg-destructive/10"
          >
            {txtHeader.avatar_menu.sign_out}
          </button>
        </div>
      ) : null}

      <Modal
        open={isConfirmingSignOut}
        onClose={() => setIsConfirmingSignOut(false)}
        title={txtAuth.sign_out.confirm_title}
        description={txtAuth.sign_out.confirm_description}
        size="sm"
      >
        <form action="/auth/sign-out" method="get">
          <ModalFooter
            onCancel={() => setIsConfirmingSignOut(false)}
            cancelLabel={txtAuth.sign_out.cancel_cta}
            submitLabel={txtAuth.sign_out.confirm_cta}
            pendingLabel={txtAuth.sign_out.loading}
            submitVariant="destructive"
          />
        </form>
      </Modal>
    </div>
  );
}
