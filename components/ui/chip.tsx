import Link, { type LinkProps } from "next/link";
import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

export type ChipTone = "neutral" | "income" | "expense" | "warning" | "info" | "accent";
export type ChipSize = "sm" | "md";

const toneClasses: Record<ChipTone, string> = {
  neutral: "bg-secondary-pressed text-foreground",
  income: "bg-ds-green-050 text-ds-green-700",
  expense: "bg-ds-red-050 text-ds-red-700",
  warning: "bg-ds-amber-050 text-ds-amber-700",
  info: "bg-ds-blue-050 text-ds-blue-700",
  accent: "bg-foreground text-background",
};

const sizeClasses: Record<ChipSize, string> = {
  sm: "px-2 py-0.5 text-small",
  md: "px-3 py-1 text-xs",
};

function chipClass({
  tone = "neutral",
  size = "md",
  className,
}: {
  tone?: ChipTone;
  size?: ChipSize;
  className?: string;
}) {
  return cn(
    "inline-flex items-center rounded-chip font-semibold",
    sizeClasses[size],
    toneClasses[tone],
    className,
  );
}

type ChipProps = HTMLAttributes<HTMLSpanElement> & {
  tone?: ChipTone;
  size?: ChipSize;
  children: ReactNode;
};

export const Chip = forwardRef<HTMLSpanElement, ChipProps>(function Chip(
  { tone, size, className, children, ...rest },
  ref,
) {
  return (
    <span ref={ref} {...rest} className={chipClass({ tone, size, className })}>
      {children}
    </span>
  );
});

type ChipButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  tone?: ChipTone;
  size?: ChipSize;
  active?: boolean;
  children: ReactNode;
};

export const ChipButton = forwardRef<HTMLButtonElement, ChipButtonProps>(
  function ChipButton(
    { tone = "neutral", size = "md", active = false, className, children, type = "button", ...rest },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        aria-pressed={active}
        className={cn(
          "border border-border transition focus:outline-none focus:ring-2 focus:ring-foreground/10",
          active
            ? chipClass({ tone: "accent", size, className: "border-foreground" })
            : chipClass({ tone, size, className: "hover:bg-secondary" }),
          className,
        )}
        {...rest}
      >
        {children}
      </button>
    );
  },
);

type ChipLinkProps = Omit<LinkProps, "href"> &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps | "children"> & {
    href: LinkProps["href"];
    tone?: ChipTone;
    size?: ChipSize;
    active?: boolean;
    children: ReactNode;
  };

export const ChipLink = forwardRef<HTMLAnchorElement, ChipLinkProps>(function ChipLink(
  { tone = "neutral", size = "md", active = false, className, children, href, ...rest },
  ref,
) {
  return (
    <Link
      ref={ref}
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "border border-border transition focus:outline-none focus:ring-2 focus:ring-foreground/10",
        active
          ? chipClass({ tone: "accent", size, className: "border-foreground" })
          : chipClass({ tone, size, className: "hover:bg-secondary" }),
        className,
      )}
      {...rest}
    >
      {children}
    </Link>
  );
});
