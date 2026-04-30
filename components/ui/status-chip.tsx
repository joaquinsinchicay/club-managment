import { forwardRef, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

/**
 * StatusChip — primitivo del Design System (sección 07).
 *
 * "Date chip" / "session chip" para headers. Container neutro (border + bg-card)
 * con dot opcional y contenido compuesto children-based. Ejemplos canónicos:
 *   "Vie · 17/04/2026" con dot semántico.
 *   "Jornada abierta · 14 movs".
 *
 * "Respiran más que badges": padding más generoso (py-1.5 vs py-1) y tipografía
 * `text-small` (no uppercase) en lugar de `text-eyebrow`.
 *
 * Diferencia con primos cercanos:
 *  - `<Badge>`: estado semántico uppercase con bg tintado. Label simple, no
 *    children compuesto.
 *  - `<Pill>`: tier/plan, sin dot, outlined → filled.
 *  - `<ChipButton>`: filtro toggleable.
 *
 * ## dotClassName escape-hatch
 *
 * Los date chips de header de cada módulo usan brand colors para el dot
 * (bg-ds-blue para tesorería, bg-ds-green para secretaría, bg-ds-pink para
 * RRHH). Esos no son tones semánticos — son brand tokens del módulo.
 *
 * Para esos casos, pasar `dotClassName="bg-ds-blue"` directamente. Si se
 * omite y `dot` es true, se usa el `DOT_CLASSNAME[tone]` semántico.
 *
 * Esta es una excepción documentada — no aplicar `dotClassName` para tones
 * que ya existen en `StatusChipTone`. Si una nueva sección necesita un dot
 * brand-specific, usar `dotClassName`. Si necesita un dot semántico, agregar
 * el tone acá.
 */

export type StatusChipTone = "success" | "danger" | "warning" | "neutral";

type StatusChipProps = HTMLAttributes<HTMLSpanElement> & {
  /** Bullet decorativo. Default: false. */
  dot?: boolean;
  /** Tone semántico del dot (no afecta bg/border, que son neutros). */
  tone?: StatusChipTone;
  /**
   * Override de la clase del dot. Usar SOLO para brand colors
   * (ej. bg-ds-blue, bg-ds-pink) que no calzan en tones semánticos.
   */
  dotClassName?: string;
  children: ReactNode;
};

const DOT_CLASSNAME: Record<StatusChipTone, string> = {
  success: "bg-success",
  danger: "bg-destructive",
  warning: "bg-warning",
  neutral: "bg-muted-foreground",
};

export const StatusChip = forwardRef<HTMLSpanElement, StatusChipProps>(function StatusChip(
  { dot = false, tone = "neutral", dotClassName, className, children, ...rest },
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
          className={cn("size-1.5 rounded-full", dotClassName ?? DOT_CLASSNAME[tone])}
        />
      ) : null}
      {children}
    </span>
  );
});
