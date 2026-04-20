import { texts } from "@/lib/texts";

type PlaceholderTabProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PlaceholderTab({ eyebrow, title, description }: PlaceholderTabProps) {
  return (
    <section className="rounded-shell border border-dashed border-border bg-secondary/30 p-6 sm:p-8">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {eyebrow}
          </span>
          <span className="inline-flex items-center rounded-full border border-warning/40 bg-warning/10 px-3 py-1 text-xs font-semibold text-warning">
            {texts.settings.club.placeholders.coming_soon_badge}
          </span>
        </div>
        <h3 className="text-lg font-semibold text-foreground sm:text-xl">{title}</h3>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
    </section>
  );
}
