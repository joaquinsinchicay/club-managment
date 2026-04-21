"use client";

import { Button, buttonClass } from "@/components/ui/button";
import { PendingSubmitButton } from "@/components/ui/pending-form";
import { cn } from "@/lib/utils";

type ModalFooterSize = "sm" | "md";

type ModalFooterProps = {
  onCancel?: () => void;
  cancelLabel?: string;
  submitLabel: string;
  pendingLabel: string;
  submitDisabled?: boolean;
  cancelDisabled?: boolean;
  submitVariant?: "primary" | "destructive" | "dark";
  size?: ModalFooterSize;
  className?: string;
};

export function ModalFooter({
  onCancel,
  cancelLabel,
  submitLabel,
  pendingLabel,
  submitDisabled = false,
  cancelDisabled = false,
  submitVariant = "primary",
  size = "md",
  className,
}: ModalFooterProps) {
  const hasCancel = typeof onCancel === "function";
  const layoutClass = hasCancel ? "grid grid-cols-2 gap-3" : "grid grid-cols-1";

  return (
    <div
      className={cn(
        "-mx-5 -mb-5 mt-5 border-t border-border/60 px-5 py-4 sm:-mx-6 sm:-mb-6 sm:px-6 sm:py-5",
        layoutClass,
        className,
      )}
    >
      {hasCancel ? (
        <Button
          type="button"
          variant="secondary"
          size={size}
          radius="btn"
          fullWidth
          onClick={onCancel}
          disabled={cancelDisabled}
        >
          {cancelLabel}
        </Button>
      ) : null}
      <PendingSubmitButton
        idleLabel={submitLabel}
        pendingLabel={pendingLabel}
        disabled={submitDisabled}
        className={buttonClass({ variant: submitVariant, size, radius: "btn", fullWidth: true })}
      />
    </div>
  );
}
