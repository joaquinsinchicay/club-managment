import { cn } from "@/lib/utils";

type ProgressBarSize = "sm" | "md";

const SIZE_CLASSNAMES: Record<ProgressBarSize, string> = {
  sm: "h-1.5",
  md: "h-2",
};

type ProgressBarProps = {
  value: number;
  size?: ProgressBarSize;
  trackClassName?: string;
  fillClassName?: string;
  ariaLabel?: string;
};

export function ProgressBar({
  value,
  size = "sm",
  trackClassName,
  fillClassName,
  ariaLabel,
}: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(100, value));

  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={clamped}
      aria-label={ariaLabel}
      className={cn(
        "w-full overflow-hidden rounded-full bg-secondary",
        SIZE_CLASSNAMES[size],
        trackClassName,
      )}
    >
      <div
        className={cn(
          "h-full rounded-full bg-foreground transition-all",
          fillClassName,
        )}
        style={{ width: `${clamped}%` }}
      />
    </div>
  );
}
