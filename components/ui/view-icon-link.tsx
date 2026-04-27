import Link from "next/link";

type ViewIconLinkProps = {
  href: string;
  label: string;
};

export function ViewIconLink({ href, label }: ViewIconLinkProps) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="inline-flex size-8 items-center justify-center rounded-btn border border-border bg-card text-muted-foreground transition hover:bg-secondary hover:text-foreground"
    >
      <svg
        className="size-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M1.5 12S5 5 12 5s10.5 7 10.5 7-3.5 7-10.5 7S1.5 12 1.5 12z"
        />
        <circle cx="12" cy="12" r="3" strokeWidth={2} />
      </svg>
    </Link>
  );
}
