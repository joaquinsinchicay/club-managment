import { forwardRef, type HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type MetaPillProps = HTMLAttributes<HTMLSpanElement> & {
  label: string;
  value: string;
};

export const MetaPill = forwardRef<HTMLSpanElement, MetaPillProps>(function MetaPill(
  { label, value, className, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      {...rest}
      className={cn(
        "inline-flex items-center gap-2 rounded-full border border-border/70 bg-card px-3 py-2 text-xs text-foreground",
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
