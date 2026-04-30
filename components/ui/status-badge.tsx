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
        // text-eyebrow ya incluye font-weight 600 + letter-spacing 0.08em
        // (tokens en lib/tokens/typography.ts). No agregar font-semibold ni
        // tracking-card-eyebrow extra — quedaba 28px de alto + 0.18em
        // de tracking, demasiado pesado para un chip de estado.
        "inline-flex min-h-6 items-center gap-1 rounded-full border px-2.5 py-0.5 text-eyebrow uppercase",
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
