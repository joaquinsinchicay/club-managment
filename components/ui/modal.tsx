"use client";

import { type ComponentPropsWithoutRef, type ReactNode, useEffect } from "react";

import { texts } from "@/lib/texts";
import { cn } from "@/lib/utils";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  panelClassName?: string;
  closeDisabled?: boolean;
};

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  panelClassName,
  closeDisabled = false
}: ModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !closeDisabled) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [closeDisabled, open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/45 p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-modal-title"
      aria-describedby={description ? "app-modal-description" : undefined}
      onClick={closeDisabled ? undefined : onClose}
    >
      <div
        className={cn(
          "w-full max-w-3xl rounded-[28px] border border-border bg-card p-5 shadow-soft sm:p-6",
          panelClassName
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 id="app-modal-title" className="text-xl font-semibold tracking-tight text-card-foreground">
              {title}
            </h2>
            {description ? (
              <p id="app-modal-description" className="text-sm leading-6 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={closeDisabled}
            className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-border bg-card px-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
            aria-label={texts.app.modal_close_cta}
          >
            {texts.app.modal_close_cta}
          </button>
        </div>

        <div className="mt-5">{children}</div>
      </div>
    </div>
  );
}

type ModalTriggerButtonProps = ComponentPropsWithoutRef<"button">;

export function ModalTriggerButton({ className, type = "button", ...props }: ModalTriggerButtonProps) {
  return (
    <button
      type={type}
      className={cn(
        "inline-flex min-h-11 items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold transition",
        className
      )}
      {...props}
    />
  );
}
