import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type StatusBadgeTone = "success" | "danger" | "warning" | "neutral" | "accent";

type StatusBadgeProps = HTMLAttributes<HTMLSpanElement> & {
  label: string;
  tone?: StatusBadgeTone;
  /** Cuando true, prefija un bullet decorativo del color del tone. */
  withDot?: boolean;
};

const TONE_CLASSNAME: Record<StatusBadgeTone, string> = {
  success: "border-success/20 bg-success/10 text-success",
  danger: "border-destructive/20 bg-destructive/10 text-destructive",
  warning: "border-warning/20 bg-warning/10 text-warning",
  neutral: "border-border bg-secondary text-foreground",
  accent: "border-foreground bg-foreground text-background"
};

const DOT_CLASSNAME: Record<StatusBadgeTone, string> = {
  success: "bg-success",
  danger: "bg-destructive",
  warning: "bg-warning",
  neutral: "bg-muted-foreground",
  accent: "bg-background"
};

export const StatusBadge = forwardRef<HTMLSpanElement, StatusBadgeProps>(function StatusBadge(
  { label, tone = "neutral", withDot = false, className, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      {...rest}
      className={cn(
        // Tipografía: text-eyebrow es el token canónico para micro-labels
        // uppercase (10px / weight 600 / letter-spacing 0.08em — definido
        // en lib/tokens/typography.ts:14). Antes usaba text-meta +
        // font-semibold + tracking-card-eyebrow (0.18em); el token
        // tracking-card-eyebrow está reservado para "Eyebrow uppercase
        // de <CardHeader> y derivados" según typography.ts:39 — no aplica
        // a chips. Las dimensiones (min-h, padding, gap) preservan el
        // contrato visual previo del badge: si se quiere modificar, hay
        // que codificar una taxonomía de tamaños en CLAUDE.md primero.
        "inline-flex min-h-7 items-center gap-1.5 rounded-full border px-3 py-1 text-eyebrow uppercase",
        TONE_CLASSNAME[tone],
        className
      )}
    >
      {withDot ? (
        <span aria-hidden="true" className={cn("size-1.5 rounded-full", DOT_CLASSNAME[tone])} />
      ) : null}
      {label}
    </span>
  );
});
