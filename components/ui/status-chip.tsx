import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * StatusChip — primitivo del Design System (sección 07).
 *
 * "Date chip" / "session chip" para headers. Container neutro (border + bg-card)
 * con dot opcional semántico y contenido compuesto children-based.
 *
 * Ejemplos canónicos del DS:
 *   "Vie · 17/04/2026" con dot success (día activo).
 *   "Jornada abierta · 14 movs" con dot success.
 *   "Jornada pendiente" con dot warning.
 *   "Jornada cerrada" con dot danger.
 *
 * "Respiran más que badges": padding más generoso (py-1.5 vs py-1) y tipografía
 * `text-small` (no uppercase) en lugar de `text-eyebrow`.
 *
 * Diferencia con primos cercanos:
 *  - `<Badge>`: estado semántico uppercase con bg tintado. Label simple, no
 *    children compuesto.
 *  - `<ChipButton>`: filtro toggleable.
 */

export type StatusChipTone = "success" | "danger" | "warning" | "neutral";

type StatusChipProps = HTMLAttributes<HTMLSpanElement> & {
  /** Bullet decorativo. Default: false. */
  dot?: boolean;
  /** Tone semántico del dot. Solo se aplica cuando `dot=true`. */
  tone?: StatusChipTone;
  children: ReactNode;
};

const DOT_CLASSNAME: Record<StatusChipTone, string> = {
  success: "bg-ds-green",
  danger: "bg-ds-red",
  warning: "bg-ds-amber",
  neutral: "bg-muted-foreground",
};

export const StatusChip = forwardRef<HTMLSpanElement, StatusChipProps>(function StatusChip(
  { dot = false, tone = "neutral", className, children, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      {...rest}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-small font-semibold text-muted-foreground",
        className
      )}
    >
      {dot ? (
        <span
          aria-hidden="true"
          className={cn("size-1.5 rounded-full", DOT_CLASSNAME[tone])}
        />
      ) : null}
      {children}
    </span>
  );
});
