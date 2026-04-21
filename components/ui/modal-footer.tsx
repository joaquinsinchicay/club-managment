"use client";

import { Button, buttonClass } from "@/components/ui/button";
import { PendingSubmitButton } from "@/components/ui/pending-form";
import { cn } from "@/lib/utils";

type ModalFooterProps = {
  onCancel: () => void;
  cancelLabel: string;
  submitLabel: string;
  pendingLabel: string;
  submitDisabled?: boolean;
  cancelDisabled?: boolean;
  submitVariant?: "primary" | "destructive" | "dark";
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
  className,
}: ModalFooterProps) {
  return (
    <div className={cn("grid grid-cols-2 gap-3 border-t border-border/60 pt-4", className)}>
      <Button
        type="button"
        variant="secondary"
        size="md"
        radius="btn"
        fullWidth
        onClick={onCancel}
        disabled={cancelDisabled}
      >
        {cancelLabel}
      </Button>
      <PendingSubmitButton
        idleLabel={submitLabel}
        pendingLabel={pendingLabel}
        disabled={submitDisabled}
        className={buttonClass({ variant: submitVariant, size: "md", radius: "btn", fullWidth: true })}
      />
    </div>
  );
}
