import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type MetaPillTone = "neutral" | "muted" | "accent";

type MetaPillProps = HTMLAttributes<HTMLSpanElement> & {
  label: string;
  value: string;
  /**
   * Variante visual del pill. Default `neutral` (border-border/70 + bg-card,
   * el comportamiento original). `muted` baja un nivel de énfasis usando
   * bg-secondary-readonly. `accent` invierte (bg-foreground + text-background)
   * para destacar.
   */
  tone?: MetaPillTone;
};

const toneClasses: Record<MetaPillTone, string> = {
  neutral: "border-border/70 bg-card text-foreground",
  muted: "border-border/70 bg-secondary-readonly text-foreground",
  accent: "border-foreground bg-foreground text-background",
};

export const MetaPill = forwardRef<HTMLSpanElement, MetaPillProps>(function MetaPill(
  { label, value, tone = "neutral", className, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      {...rest}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs",
        toneClasses[tone],
        className,
      )}
    >
      <span className="font-semibold uppercase tracking-section text-muted-foreground">
        {label}
      </span>
      <span className="font-medium">{value}</span>
    </span>
  );
});
