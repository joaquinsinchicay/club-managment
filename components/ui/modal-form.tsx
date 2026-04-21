import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export const FORM_GRID_CLASSNAME = "grid gap-4 sm:grid-cols-2";
export const FORM_GRID_PADDING_CLASSNAME = "px-5 py-5";
export const FIELD_CLASSNAME = "grid gap-2 text-sm text-foreground";
export const FULL_WIDTH_FIELD_CLASSNAME = "sm:col-span-2";
export const CONTROL_CLASSNAME =
  "min-h-11 w-full rounded-card border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10";
export const CONTROL_DISABLED_CLASSNAME = "disabled:opacity-60";
export const FIELD_LABEL_CLASSNAME = "text-xs font-semibold text-foreground";
export const REQUIRED_SUFFIX = " *";
export const MODAL_FOOTER_CLASSNAME =
  "flex items-center justify-end gap-2 border-t border-border px-5 py-4";

type FormFieldProps = {
  children: ReactNode;
  fullWidth?: boolean;
  className?: string;
};

export function FormField({ children, fullWidth = false, className }: FormFieldProps) {
  return (
    <label className={cn(FIELD_CLASSNAME, fullWidth && FULL_WIDTH_FIELD_CLASSNAME, className)}>
      {children}
    </label>
  );
}
