import { type ElementType, type HTMLAttributes, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type CardPadding = "none" | "compact" | "comfortable";
export type CardTone = "default" | "muted" | "accent-rrhh";

type CardProps = HTMLAttributes<HTMLElement> & {
  as?: ElementType;
  padding?: CardPadding;
  tone?: CardTone;
};

const paddingClasses: Record<CardPadding, string> = {
  none: "",
  compact: "p-4",
  comfortable: "p-5 md:p-6",
};

const toneClasses: Record<CardTone, string> = {
  default: "bg-card",
  muted: "bg-secondary-readonly",
  "accent-rrhh": "bg-ds-pink-050 border-ds-pink-050",
};

export function Card({
  as,
  padding = "comfortable",
  tone = "default",
  className,
  children,
  ...rest
}: CardProps) {
  const Tag = (as ?? "section") as ElementType;
  return (
    <Tag
      {...rest}
      className={cn(
        "rounded-shell border border-border",
        toneClasses[tone],
        paddingClasses[padding],
        className,
      )}
    >
      {children}
    </Tag>
  );
}

type CardHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  action?: ReactNode;
  divider?: boolean;
  className?: string;
};

export function CardHeader({
  title,
  description,
  eyebrow,
  action,
  divider = false,
  className,
}: CardHeaderProps) {
  return (
    <header
      className={cn(
        "flex items-start justify-between gap-3",
        divider && "border-b border-border pb-4",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-1">
        {eyebrow ? (
          <span className="text-meta font-semibold uppercase tracking-card-eyebrow text-muted-foreground">
            {eyebrow}
          </span>
        ) : null}
        <p className="text-card-title font-semibold text-foreground">{title}</p>
        {description ? (
          <p className="text-small text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </header>
  );
}

type CardBodyProps = HTMLAttributes<HTMLDivElement>;

export function CardBody({ className, ...rest }: CardBodyProps) {
  return <div className={cn("flex flex-col gap-4", className)} {...rest} />;
}

type CardFooterProps = HTMLAttributes<HTMLDivElement>;

export function CardFooter({ className, ...rest }: CardFooterProps) {
  return (
    <footer
      className={cn("flex items-center justify-end gap-2 border-t border-border pt-4", className)}
      {...rest}
    />
  );
}
