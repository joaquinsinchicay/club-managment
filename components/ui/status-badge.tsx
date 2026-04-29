import { cn } from "@/lib/utils";

type StatusBadgeTone = "success" | "danger" | "warning" | "neutral" | "accent";

type StatusBadgeProps = {
  label: string;
  tone?: StatusBadgeTone;
  /** Cuando true, prefija un bullet decorativo del color del tone. */
  withDot?: boolean;
  className?: string;
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

export function StatusBadge({
  label,
  tone = "neutral",
  withDot = false,
  className
}: StatusBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex min-h-7 items-center gap-1.5 rounded-full border px-3 py-1 text-meta font-semibold uppercase tracking-card-eyebrow",
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
}
