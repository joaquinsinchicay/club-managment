import { type ReactNode } from "react";

import { cn } from "@/lib/utils";

type EmptyStateVariant = "card" | "dashed" | "inline";

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  variant?: EmptyStateVariant;
  className?: string;
};

const variantClasses: Record<EmptyStateVariant, string> = {
  card: "rounded-card border border-border bg-card px-6 py-8",
  dashed: "rounded-card border border-dashed border-border bg-secondary/30 px-6 py-8",
  inline: "px-4 py-6",
};

export function EmptyState({
  title,
  description,
  icon,
  action,
  variant = "dashed",
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-2 text-center",
        variantClasses[variant],
        className,
      )}
    >
      {icon ? <div className="text-muted-foreground">{icon}</div> : null}
      <p className="text-label font-semibold text-foreground">{title}</p>
      {description ? (
        <p className="text-small text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
