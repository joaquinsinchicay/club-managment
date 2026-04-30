import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/**
 * Badge — primitivo del Design System (sección 07).
 *
 * Componente de **estado semántico** uppercase: dot opcional + texto, con bg
 * tintado leve según tone. Ejemplos canónicos: "Conciliado" (success),
 * "Pendiente" (warning), "Rechazado" (danger), "Archivado" (neutral),
 * "Admin" (accent).
 *
 * Diferencia con primos cercanos del DS:
 *  - **`<Pill>`**: tier/plan ("Plan Pro", "Add-on"). Sin dot, más tipográfico.
 *  - **`<ChipButton>`**: filtro toggleable. Interactivo (`aria-pressed`).
 *  - **`<StatusChip>`**: date/session chip de header ("Vie · 17/04/2026").
 *    Más padding ("respiran más"), contenido compuesto children-based.
 *
 * Antes se llamaba `<StatusBadge>` con prop `withDot`. Renombrado en la
 * alineación del DS sección 07 (2026-04-30) para reflejar la taxonomía
 * canónica del design system.
 */

export type BadgeTone = "success" | "danger" | "warning" | "neutral" | "accent";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  label: string;
  tone?: BadgeTone;
  /** Cuando true, prefija un bullet decorativo del color del tone. */
  dot?: boolean;
};

const TONE_CLASSNAME: Record<BadgeTone, string> = {
  success: "border-success/20 bg-success/10 text-success",
  danger: "border-destructive/20 bg-destructive/10 text-destructive",
  warning: "border-warning/20 bg-warning/10 text-warning",
  neutral: "border-border bg-secondary text-foreground",
  accent: "border-foreground bg-foreground text-background"
};

const DOT_CLASSNAME: Record<BadgeTone, string> = {
  success: "bg-success",
  danger: "bg-destructive",
  warning: "bg-warning",
  neutral: "bg-muted-foreground",
  accent: "bg-background"
};

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { label, tone = "neutral", dot = false, className, ...rest },
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
      {dot ? (
        <span aria-hidden="true" className={cn("size-1.5 rounded-full", DOT_CLASSNAME[tone])} />
      ) : null}
      {label}
    </span>
  );
});
