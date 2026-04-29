import { cn } from "@/lib/utils";

type MetaPillProps = {
  label: string;
  value: string;
  className?: string;
};

export function MetaPill({ label, value, className }: MetaPillProps) {
  return (
    <span
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
}
