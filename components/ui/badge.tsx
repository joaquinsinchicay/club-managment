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
 *  - **`<ChipButton>`**: filtro toggleable. Interactivo (`aria-pressed`).
 *  - **`<StatusChip>`**: date/session chip de header ("Vie · 17/04/2026").
 *    Más padding ("respiran más"), contenido compuesto children-based.
 *
 * Antes se llamaba `<StatusBadge>` con prop `withDot`. Renombrado en la
 * alineación del DS sección 07 (2026-04-30) para reflejar la taxonomía
 * canónica del design system.
 */

export type BadgeTone = "success" | "danger" | "warning" | "info" | "neutral" | "accent";

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  label: string;
  tone?: BadgeTone;
  /** Cuando true, prefija un bullet decorativo del color del tone. */
  dot?: boolean;
};

// Tones alineados con DS sección 07 ("Badges (estado)"):
// - bg `ds-{color}-050` + text `ds-{color}-700` — texto oscuro sobre fondo
//   tintado leve, replicando exactamente el visual del DS (Conciliado /
//   Pendiente / Rechazado / FX / Admin). Antes se usaba `bg-{tone}/10
//   text-{tone}` con tokens semánticos HSL: el bg era equivalente pero el
//   texto quedaba 1 nivel más claro de lo que el DS muestra (text-success
//   = HSL medio ≈ #10B780 vs ds-green-700 = #047857).
// - `accent`: era filled negro+texto blanco, divergencia del DS Admin que
//   muestra dot+texto colored sobre bg leve. Ahora `bg-foreground/10
//   text-foreground` (faint dark) replicando el patrón del DS.
const TONE_CLASSNAME: Record<BadgeTone, string> = {
  success: "border-ds-green-050 bg-ds-green-050 text-ds-green-700",
  danger: "border-ds-red-050 bg-ds-red-050 text-ds-red-700",
  warning: "border-ds-amber-050 bg-ds-amber-050 text-ds-amber-700",
  info: "border-ds-blue-050 bg-ds-blue-050 text-ds-blue-700",
  neutral: "border-border bg-secondary text-foreground",
  accent: "border-border bg-foreground/10 text-foreground"
};

const DOT_CLASSNAME: Record<BadgeTone, string> = {
  success: "bg-ds-green",
  danger: "bg-ds-red",
  warning: "bg-ds-amber",
  info: "bg-ds-blue",
  neutral: "bg-muted-foreground",
  accent: "bg-foreground"
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
