"use client";

import { type ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type EditIconButtonProps = Omit<ComponentPropsWithoutRef<"button">, "children"> & {
  label: string;
};

export function EditIconButton({ label, className, type = "button", ...props }: EditIconButtonProps) {
  return (
    <button
      type={type}
      aria-label={label}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-btn border border-border bg-card text-muted-foreground transition hover:bg-secondary hover:text-foreground",
        className
      )}
      {...props}
    >
      <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
        />
      </svg>
    </button>
  );
}
