import { Card } from "@/components/ui/card";
import { FormSection } from "@/components/ui/modal-form";
import { StatusBadge } from "@/components/ui/status-badge";
import { texts } from "@/lib/texts";

type PlaceholderTabProps = {
  eyebrow: string;
  title: string;
  description: string;
};

export function PlaceholderTab({ eyebrow, title, description }: PlaceholderTabProps) {
  return (
    <Card tone="muted" className="border-dashed p-6 sm:p-8">
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <FormSection>{eyebrow}</FormSection>
          <StatusBadge
            label={texts.settings.club.placeholders.coming_soon_badge}
            tone="warning"
          />
        </div>
        <h3 className="text-lg font-semibold text-foreground sm:text-xl">{title}</h3>
        <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
    </Card>
  );
}
