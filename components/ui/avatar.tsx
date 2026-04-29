import { forwardRef, type ReactNode } from "react";

import { cn } from "@/lib/utils";

export type AvatarSize = "xs" | "sm" | "md" | "lg";
export type AvatarTone = "neutral" | "bancaria" | "virtual" | "efectivo" | "accent";
export type AvatarShape = "circle" | "square";

type AvatarProps = {
  name?: string | null;
  email?: string | null;
  fallback?: string;
  size?: AvatarSize;
  tone?: AvatarTone;
  shape?: AvatarShape;
  className?: string;
  children?: ReactNode;
};

const sizeClasses: Record<AvatarSize, string> = {
  xs: "h-6 w-6 text-eyebrow",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
};

const toneClasses: Record<AvatarTone, string> = {
  neutral: "bg-secondary text-foreground",
  bancaria: "bg-ds-blue-050 text-ds-blue-700",
  virtual: "bg-ds-amber-050 text-ds-amber-700",
  efectivo: "bg-ds-green-050 text-ds-green-700",
  accent: "bg-foreground text-background",
};

const shapeClasses: Record<AvatarShape, string> = {
  circle: "rounded-full",
  square: "rounded-card",
};

export function getInitials(
  value?: string | null,
  fallback?: string | null,
): string {
  const source = (value ?? "").trim() || (fallback ?? "").trim();
  if (!source) return "?";
  const letters = source
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase() ?? "")
    .join("");
  return letters || source[0]?.toUpperCase() || "?";
}

export const Avatar = forwardRef<HTMLSpanElement, AvatarProps>(function Avatar(
  {
    name,
    email,
    fallback,
    size = "md",
    tone = "neutral",
    shape = "circle",
    className,
    children,
  },
  ref,
) {
  const initials = children ? null : getInitials(name, email ?? fallback);
  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex shrink-0 items-center justify-center font-semibold leading-none select-none",
        shapeClasses[shape],
        sizeClasses[size],
        toneClasses[tone],
        className,
      )}
      aria-hidden={children ? undefined : true}
    >
      {children ?? initials}
    </span>
  );
});
