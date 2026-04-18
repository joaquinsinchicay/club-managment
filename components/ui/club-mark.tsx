import { cn } from "@/lib/utils";

type ClubMarkProps = {
  clubName: string;
  className?: string;
};

function getClubInitials(clubName: string) {
  return clubName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function ClubMark({ clubName, className }: ClubMarkProps) {
  const initials = getClubInitials(clubName) || "C";

  return (
    <span
      aria-hidden="true"
      className={cn(
        "relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-foreground text-meta font-bold tracking-[0.08em] text-primary-foreground",
        className
      )}
    >
      <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-success" />
      <span>{initials}</span>
    </span>
  );
}
