import { cn } from "@/lib/utils";

type CardShellProps = Readonly<{
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
  className?: string;
}>;

export function CardShell({
  eyebrow,
  title,
  description,
  children,
  className
}: CardShellProps) {
  return (
    <section
      className={cn(
        "w-full max-w-md rounded-dialog border border-border bg-card p-6 sm:p-8",
        className
      )}
    >
      <div className="mb-6 space-y-3">
        <span className="inline-flex rounded-full border border-border bg-secondary px-3 py-1 text-xs font-semibold uppercase tracking-card-eyebrow text-muted-foreground">
          {eyebrow}
        </span>
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight text-card-foreground">{title}</h1>
          <p className="text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
