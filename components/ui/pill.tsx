import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * Pill — primitivo del Design System (sección 07).
 *
 * Componente para **tier/plan**: sin dot, más tipográfico que `<Badge>`.
 * Variante outlined → filled cuando `active=true`. Ejemplos canónicos:
 *   "Módulo base" (outlined), "Plan Pro" (outlined), "Plan Enterprise"
 *   (active accent), "Add-on" (outlined).
 *
 * Diferencia con primos cercanos:
 *  - `<Badge>`: estado semántico ("Pendiente", "Aprobado"). Lleva dot.
 *  - `<ChipButton>`: filtro toggleable. Interactivo.
 *  - `<StatusChip>`: date/session chip con padding más generoso.
 *
 * Sin children compuesto — solo label uppercase. Sin dot. Si necesitás un
 * componente con dot, usar `<Badge>` o `<StatusChip>`.
 */

export type PillTone = "neutral" | "accent" | "info";

type PillProps = HTMLAttributes<HTMLSpanElement> & {
  /** Cuando true, bg filled según tone. Default: false (outlined). */
  active?: boolean;
  /** Tone aplicable solo cuando active=true. Default: accent. */
  tone?: PillTone;
  children: ReactNode;
};

const ACTIVE_CLASSNAME: Record<PillTone, string> = {
  neutral: "bg-secondary-pressed border-foreground/20 text-foreground",
  accent: "bg-foreground border-foreground text-background",
  info: "bg-info border-info text-info-foreground",
};

const OUTLINED_CLASSNAME =
  "bg-transparent border-border text-muted-foreground";

export const Pill = forwardRef<HTMLSpanElement, PillProps>(function Pill(
  { active = false, tone = "accent", className, children, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      {...rest}
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-eyebrow uppercase",
        active ? ACTIVE_CLASSNAME[tone] : OUTLINED_CLASSNAME,
        className
      )}
    >
      {children}
    </span>
  );
});
