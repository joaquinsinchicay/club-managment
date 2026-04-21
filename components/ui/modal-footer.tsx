"use client";

import { Button, buttonClass } from "@/components/ui/button";
import { PendingSubmitButton } from "@/components/ui/pending-form";
import { cn } from "@/lib/utils";

type ModalFooterSize = "sm" | "md";
type ModalFooterAlign = "stretch" | "end";

type ModalFooterProps = {
  onCancel?: () => void;
  cancelLabel?: string;
  submitLabel: string;
  pendingLabel: string;
  submitDisabled?: boolean;
  cancelDisabled?: boolean;
  submitVariant?: "primary" | "destructive" | "dark";
  size?: ModalFooterSize;
  align?: ModalFooterAlign;
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
  align = "stretch",
  className,
}: ModalFooterProps) {
  const hasCancel = typeof onCancel === "function";
  // Para mantener botones de ancho idéntico siempre, `align="end"` con cancel
  // también usa grid de 2 columnas (limitado a max-w-xs y alineado a la derecha).
  // `align="end"` sin cancel cae a flex con botón autoancho.
  const fullWidth = align === "stretch" || (align === "end" && hasCancel);
  const layoutClass =
    align === "stretch"
      ? hasCancel
        ? "grid grid-cols-2 gap-3"
        : "grid grid-cols-1"
      : hasCancel
        ? "ml-auto grid w-full max-w-xs grid-cols-2 gap-3"
        : "flex items-center justify-end gap-2";

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
          fullWidth={fullWidth}
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
        className={buttonClass({ variant: submitVariant, size, radius: "btn", fullWidth })}
      />
    </div>
  );
}
