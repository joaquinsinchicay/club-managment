import { forwardRef, type ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type ButtonVariant =
  | "primary"
  | "secondary"
  | "destructive"
  | "destructive-outline"
  | "dark"
  | "accent-rrhh";
type ButtonSize = "sm" | "md";
type ButtonRadius = "btn" | "card";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  radius?: ButtonRadius;
  fullWidth?: boolean;
};

const variantClasses: Record<ButtonVariant, string> = {
  primary: "bg-foreground text-background hover:opacity-90",
  secondary: "border border-border bg-card text-foreground hover:bg-secondary",
  destructive: "bg-destructive text-white hover:opacity-90",
  "destructive-outline":
    "border border-destructive/30 bg-card text-destructive hover:bg-destructive/10",
  dark: "bg-ds-slate-900 text-white hover:bg-black",
  "accent-rrhh": "bg-ds-pink text-white hover:bg-ds-pink-700",
};

const sizeClasses: Record<ButtonSize, string> = {
  md: "min-h-11 px-4 py-2.5 text-sm font-semibold",
  sm: "min-h-9 px-3 py-2 text-xs font-semibold",
};

const radiusClasses: Record<ButtonRadius, string> = {
  btn: "rounded-btn",
  card: "rounded-card",
};

export function buttonClass({
  variant = "primary",
  size = "md",
  radius = "card",
  fullWidth = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  radius?: ButtonRadius;
  fullWidth?: boolean;
  className?: string;
} = {}) {
  return cn(
    "inline-flex items-center justify-center transition focus:outline-none focus:ring-2 focus:ring-foreground/10 disabled:cursor-not-allowed disabled:opacity-60",
    radiusClasses[radius],
    variantClasses[variant],
    sizeClasses[size],
    fullWidth && "w-full",
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    radius = "card",
    fullWidth = false,
    className,
    type = "button",
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass({ variant, size, radius, fullWidth, className })}
      {...rest}
    />
  );
});
