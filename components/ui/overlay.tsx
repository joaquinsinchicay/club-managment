"use client";

import { type HTMLAttributes, type ReactNode, useEffect } from "react";

import { Spinner } from "@/components/ui/pending-form";
import { cn } from "@/lib/utils";

let bodyScrollLockCount = 0;
let previousBodyOverflow: string | null = null;

function lockBodyScroll() {
  if (bodyScrollLockCount === 0) {
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }

  bodyScrollLockCount += 1;
}

function unlockBodyScroll() {
  if (bodyScrollLockCount === 0) {
    return;
  }

  bodyScrollLockCount -= 1;

  if (bodyScrollLockCount === 0) {
    document.body.style.overflow = previousBodyOverflow ?? "";
    previousBodyOverflow = null;
  }
}

export function useBodyScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) {
      return;
    }

    lockBodyScroll();

    return () => {
      unlockBodyScroll();
    };
  }, [active]);
}

type BlockingOverlayProps = {
  open: boolean;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  onBackdropClick?: () => void;
  onEscape?: () => void;
  lockScroll?: boolean;
} & HTMLAttributes<HTMLDivElement>;

export function BlockingOverlay({
  open,
  children,
  className,
  contentClassName,
  onBackdropClick,
  onEscape,
  lockScroll = true,
  ...props
}: BlockingOverlayProps) {
  useBodyScrollLock(open && lockScroll);

  useEffect(() => {
    if (!open || !onEscape) {
      return;
    }

    const escapeHandler: () => void = onEscape;

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        escapeHandler();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onEscape, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className={cn("fixed inset-0 z-50 bg-slate-950/45", className)}
      onClick={onBackdropClick}
      {...props}
    >
      <div className={cn("flex min-h-full w-full", contentClassName)} onClick={(event) => event.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

export function BlockingStatusOverlay({
  open,
  label
}: {
  open: boolean;
  label: string;
}) {
  return (
    <BlockingOverlay
      open={open}
      className="z-[55]"
      contentClassName="items-center justify-center p-4 sm:p-6"
      role="status"
      aria-live="polite"
    >
      <div className="flex w-full max-w-md items-center gap-3 rounded-[28px] border border-border bg-card px-5 py-4 text-sm font-semibold text-foreground shadow-soft sm:px-6 sm:py-5">
        <Spinner className="size-5 shrink-0" />
        <span>{label}</span>
      </div>
    </BlockingOverlay>
  );
}
