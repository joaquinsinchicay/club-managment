"use client";

import { type ReactNode } from "react";

type SettingsTabShellProps = {
  searchPlaceholder?: string;
  searchValue?: string;
  onSearch?: (value: string) => void;
  ctaLabel?: string;
  onCta?: () => void;
  children: ReactNode;
};

export function SettingsTabShell({
  searchPlaceholder,
  searchValue,
  onSearch,
  ctaLabel,
  onCta,
  children
}: SettingsTabShellProps) {
  const showSearchOrCta = onSearch || ctaLabel;

  return (
    <div className="space-y-4">
      {showSearchOrCta ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {onSearch ? (
            <div className="relative flex-1">
              <svg
                className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="search"
                placeholder={searchPlaceholder}
                value={searchValue ?? ""}
                onChange={(e) => onSearch(e.target.value)}
                className="min-h-11 w-full rounded-card border border-border bg-card py-3 pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>
          ) : null}

          {ctaLabel && onCta ? (
            <button
              type="button"
              onClick={onCta}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-card bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground transition hover:opacity-95 sm:shrink-0"
            >
              <span aria-hidden="true">+</span>
              {ctaLabel}
            </button>
          ) : null}
        </div>
      ) : null}

      {children}
    </div>
  );
}
