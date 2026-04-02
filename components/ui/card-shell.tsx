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
        "w-full max-w-md rounded-[28px] border border-border/70 bg-card p-6 shadow-soft sm:p-8",
        className
      )}
    >
      <div className="mb-6 space-y-3">
        <span className="inline-flex rounded-full bg-accent/14 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-foreground">
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
