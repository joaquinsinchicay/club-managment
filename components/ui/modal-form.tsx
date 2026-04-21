import {
  forwardRef,
  type InputHTMLAttributes,
  type LabelHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
  type HTMLAttributes,
} from "react";

import { cn } from "@/lib/utils";

export const FORM_GRID_CLASSNAME = "grid gap-4 sm:grid-cols-2";
export const FORM_GRID_PADDING_CLASSNAME = "px-5 py-5";
export const FIELD_CLASSNAME = "grid gap-2 text-sm text-foreground";
export const FULL_WIDTH_FIELD_CLASSNAME = "sm:col-span-2";
export const CONTROL_CLASSNAME =
  "min-h-11 w-full rounded-card border border-border bg-card px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10";
export const CONTROL_DISABLED_CLASSNAME = "disabled:opacity-60";
export const FIELD_LABEL_CLASSNAME = "text-xs font-semibold text-foreground";
export const FORM_SECTION_LABEL_CLASSNAME =
  "text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground";
export const FORM_HELP_TEXT_CLASSNAME = "text-xs text-muted-foreground";
export const FORM_ERROR_CLASSNAME = "text-xs font-medium text-destructive";
export const FORM_READONLY_CLASSNAME =
  "inline-flex min-h-11 w-full items-center rounded-card border border-border bg-secondary/40 px-4 py-3 text-sm text-muted-foreground";
export const FORM_CHECKBOX_CARD_CLASSNAME =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-card border border-border bg-card px-4 py-3 text-sm text-foreground transition hover:bg-secondary/50 has-[:checked]:border-foreground has-[:checked]:bg-secondary/50";
export const FORM_BANNER_WARNING_CLASSNAME =
  "rounded-card border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-slate-700";
export const FORM_BANNER_DESTRUCTIVE_CLASSNAME =
  "rounded-card border border-red-200 bg-red-50 px-4 py-3 text-xs leading-5 text-slate-700";
export const FORM_BANNER_INFO_CLASSNAME =
  "rounded-card border border-blue-200 bg-blue-50 px-4 py-3 text-xs leading-5 text-slate-700";
export const REQUIRED_SUFFIX = " *";

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

type FormFieldLabelProps = LabelHTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  required?: boolean;
};

export function FormFieldLabel({ children, required = false, className, ...rest }: FormFieldLabelProps) {
  return (
    <span className={cn(FIELD_LABEL_CLASSNAME, className)} {...rest}>
      {children}
      {required ? <span className="text-destructive" aria-hidden="true">{REQUIRED_SUFFIX}</span> : null}
    </span>
  );
}

type FormSectionProps = HTMLAttributes<HTMLParagraphElement> & {
  children: ReactNode;
  required?: boolean;
};

export function FormSection({ children, required = false, className, ...rest }: FormSectionProps) {
  return (
    <p className={cn(FORM_SECTION_LABEL_CLASSNAME, className)} {...rest}>
      {children}
      {required ? <span className="text-destructive" aria-hidden="true">{REQUIRED_SUFFIX}</span> : null}
    </p>
  );
}

type FormHelpTextProps = HTMLAttributes<HTMLParagraphElement> & {
  children: ReactNode;
};

export function FormHelpText({ children, className, ...rest }: FormHelpTextProps) {
  return (
    <p className={cn(FORM_HELP_TEXT_CLASSNAME, className)} {...rest}>
      {children}
    </p>
  );
}

type FormErrorProps = HTMLAttributes<HTMLParagraphElement> & {
  children: ReactNode;
};

export function FormError({ children, className, ...rest }: FormErrorProps) {
  return (
    <p aria-live="assertive" className={cn(FORM_ERROR_CLASSNAME, className)} {...rest}>
      {children}
    </p>
  );
}

type FormInputProps = InputHTMLAttributes<HTMLInputElement>;

export const FormInput = forwardRef<HTMLInputElement, FormInputProps>(function FormInput(
  { className, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      className={cn(CONTROL_CLASSNAME, CONTROL_DISABLED_CLASSNAME, className)}
      {...rest}
    />
  );
});

type FormSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  children: ReactNode;
};

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(function FormSelect(
  { className, children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(CONTROL_CLASSNAME, CONTROL_DISABLED_CLASSNAME, className)}
      {...rest}
    >
      {children}
    </select>
  );
});

type FormTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(function FormTextarea(
  { className, rows = 3, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(CONTROL_CLASSNAME, "resize-y", CONTROL_DISABLED_CLASSNAME, className)}
      {...rest}
    />
  );
});

type FormReadonlyProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
};

export function FormReadonly({ children, className, ...rest }: FormReadonlyProps) {
  return (
    <div className={cn(FORM_READONLY_CLASSNAME, className)} {...rest}>
      {children}
    </div>
  );
}

type FormBannerVariant = "warning" | "destructive" | "info";

const BANNER_CLASS_BY_VARIANT: Record<FormBannerVariant, string> = {
  warning: FORM_BANNER_WARNING_CLASSNAME,
  destructive: FORM_BANNER_DESTRUCTIVE_CLASSNAME,
  info: FORM_BANNER_INFO_CLASSNAME,
};

const BANNER_ACCENT_BY_VARIANT: Record<FormBannerVariant, string> = {
  warning: "font-bold text-amber-700",
  destructive: "font-bold text-red-700",
  info: "font-bold text-blue-700",
};

type FormBannerProps = HTMLAttributes<HTMLDivElement> & {
  variant?: FormBannerVariant;
  icon?: ReactNode;
  children: ReactNode;
};

export function FormBanner({
  variant = "warning",
  icon,
  children,
  className,
  ...rest
}: FormBannerProps) {
  return (
    <div className={cn(BANNER_CLASS_BY_VARIANT[variant], className)} {...rest}>
      <p className="leading-[1.5]">
        <span className={cn("mr-1", BANNER_ACCENT_BY_VARIANT[variant])} aria-hidden="true">
          {icon ?? "!"}
        </span>
        {children}
      </p>
    </div>
  );
}

type FormCheckboxCardProps = {
  name: string;
  value: string;
  label: ReactNode;
  description?: ReactNode;
  defaultChecked?: boolean;
  checked?: boolean;
  onChange?: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
};

export function FormCheckboxCard({
  name,
  value,
  label,
  description,
  defaultChecked,
  checked,
  onChange,
  disabled = false,
  className,
  id,
}: FormCheckboxCardProps) {
  const inputId = id ?? `${name}-${value}`;
  return (
    <label
      htmlFor={inputId}
      className={cn(FORM_CHECKBOX_CARD_CLASSNAME, disabled && "cursor-not-allowed opacity-60", className)}
    >
      <input
        id={inputId}
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        checked={checked}
        disabled={disabled}
        onChange={onChange ? (event) => onChange(event.target.checked) : undefined}
        className="size-4 rounded border-border text-foreground focus:ring-foreground"
      />
      <span className="flex min-w-0 flex-col">
        <span className="font-medium">{label}</span>
        {description ? <span className="text-xs text-muted-foreground">{description}</span> : null}
      </span>
    </label>
  );
}
