import { LinkButton } from "@/components/ui/link-button";
import { cn } from "@/lib/utils";

type PageContentHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  className?: string;
};

export function PageContentHeader({
  eyebrow,
  title,
  description,
  backHref,
  backLabel,
  actions,
  className
}: PageContentHeaderProps) {
  return (
    <section className={cn("flex flex-col gap-5", className)}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-3">
          {eyebrow ? (
            <p className="text-meta font-semibold uppercase tracking-card-eyebrow text-muted-foreground">
              {eyebrow}
            </p>
          ) : null}
          <div className="space-y-2">
            <h1 className="text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">{title}</h1>
            {description ? (
              <p className="max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">{description}</p>
            ) : null}
          </div>
        </div>

        {(backHref && backLabel) || actions ? (
          <div className="flex shrink-0 items-center gap-3">
            {actions}
            {backHref && backLabel ? (
              <LinkButton href={backHref} variant="secondary">{backLabel}</LinkButton>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
