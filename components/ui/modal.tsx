"use client";

import { type ComponentPropsWithoutRef, type ReactNode } from "react";

import { texts } from "@/lib/texts";
import { cn } from "@/lib/utils";
import { BlockingOverlay } from "@/components/ui/overlay";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  panelClassName?: string;
  closeDisabled?: boolean;
  hideCloseButton?: boolean;
};

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  panelClassName,
  closeDisabled = false,
  hideCloseButton = false
}: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <BlockingOverlay
      open={open}
      className="z-50"
      contentClassName="items-end justify-center p-3 sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-modal-title"
      aria-describedby={description ? "app-modal-description" : undefined}
      onBackdropClick={closeDisabled ? undefined : onClose}
      onEscape={closeDisabled ? undefined : onClose}
    >
      <div
        className={cn(
          "flex max-h-[calc(100dvh-24px)] w-full max-w-3xl flex-col rounded-toast border border-border bg-card shadow-soft sm:max-h-[calc(100dvh-48px)]",
          panelClassName
        )}
        onClick={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onPointerDown={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border/60 p-5 sm:p-6">
          <div className="space-y-1">
            <h2 id="app-modal-title" className="text-[18px] font-semibold tracking-tight text-card-foreground">
              {title}
            </h2>
            {description ? (
              <p id="app-modal-description" className="text-[13px] leading-5 text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          {!hideCloseButton ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onClose();
              }}
              disabled={closeDisabled}
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-2xl border border-border bg-card px-3 text-sm font-semibold text-foreground transition hover:bg-secondary"
              aria-label={texts.app.modal_close_cta}
            >
              {texts.app.modal_close_cta}
            </button>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>
      </div>
    </BlockingOverlay>
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
