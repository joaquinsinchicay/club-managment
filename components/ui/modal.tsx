"use client";

import { type ReactNode } from "react";

import { texts } from "@/lib/texts";
import { BlockingOverlay } from "@/components/ui/overlay";

type ModalSize = "sm" | "md" | "lg";

type ModalProps = {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  size?: ModalSize;
  closeDisabled?: boolean;
  hideCloseButton?: boolean;
};

const sizeClasses: Record<ModalSize, string> = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl",
};

export function Modal({
  open,
  title,
  description,
  onClose,
  children,
  size = "md",
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
        className={`flex max-h-[calc(100dvh-24px)] w-full flex-col rounded-toast border border-border bg-card shadow-soft sm:max-h-[calc(100dvh-48px)] ${sizeClasses[size]}`}
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
              className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-muted-foreground transition hover:bg-secondary hover:text-foreground disabled:cursor-not-allowed disabled:opacity-60"
              aria-label={texts.app.modal_close_aria}
            >
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          ) : null}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">{children}</div>
      </div>
    </BlockingOverlay>
  );
}
