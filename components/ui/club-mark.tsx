import { getInitials } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type ClubMarkProps = {
  clubName: string;
  className?: string;
};

export function ClubMark({ clubName, className }: ClubMarkProps) {
  const initials = getInitials(clubName, "C");

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-meta font-bold tracking-eyebrow text-primary-foreground",
        className
      )}
    >
      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-success" />
      <span>{initials}</span>
    </span>
  );
}
