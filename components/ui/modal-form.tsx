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
// Altura fija (44px + 2px border = 46px). Usamos `h-11` en lugar de
// `min-h-11 py-3` para que <input> y <select appearance-none> rindan
// exactamente al mismo alto — cuando dejamos que el line-height calcule
// el box, los selects pintaban 1px mas cortos que los inputs. Los textareas
// overrideen esto (ver FormTextarea).
export const CONTROL_CLASSNAME =
  "h-11 w-full rounded-card border border-border bg-card px-4 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-foreground/10";
export const CONTROL_DISABLED_CLASSNAME = "disabled:opacity-60";
export const FIELD_LABEL_CLASSNAME = "text-xs font-semibold text-foreground";
export const FORM_SECTION_LABEL_CLASSNAME =
  "text-xs font-semibold uppercase tracking-section text-muted-foreground";
export const FORM_HELP_TEXT_CLASSNAME = "text-xs text-muted-foreground";
export const FORM_ERROR_CLASSNAME = "text-xs font-medium text-destructive";
export const FORM_READONLY_CLASSNAME =
  "inline-flex h-11 w-full items-center rounded-card border border-border bg-secondary-readonly px-4 text-sm text-muted-foreground";
export const FORM_CHECKBOX_CARD_CLASSNAME =
  "flex min-h-11 cursor-pointer items-center gap-3 rounded-card border border-border bg-card px-4 py-3 text-sm text-foreground transition hover:bg-secondary-hover has-[:checked]:border-foreground has-[:checked]:bg-secondary-hover";
export const FORM_BANNER_WARNING_CLASSNAME =
  "rounded-card border border-warning/20 bg-warning/10 px-4 py-3 text-xs leading-5 text-foreground";
export const FORM_BANNER_DESTRUCTIVE_CLASSNAME =
  "rounded-card border border-destructive/20 bg-destructive/10 px-4 py-3 text-xs leading-5 text-foreground";
export const FORM_BANNER_INFO_CLASSNAME =
  "rounded-card border border-info/20 bg-info/10 px-4 py-3 text-xs leading-5 text-foreground";
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

// Normaliza el render del <select>: appearance-none + chevron SVG externo
// para que mida y se vea exactamente igual que <FormInput>.
const SELECT_CHEVRON_CLASSNAME =
  "appearance-none bg-[url('data:image/svg+xml;utf8,<svg%20xmlns=%22http://www.w3.org/2000/svg%22%20width=%2216%22%20height=%2216%22%20viewBox=%220%200%2024%2024%22%20fill=%22none%22%20stroke=%22currentColor%22%20stroke-width=%222%22%20stroke-linecap=%22round%22%20stroke-linejoin=%22round%22><polyline%20points=%226%209%2012%2015%2018%209%22/></svg>')] bg-no-repeat bg-[right_1rem_center] pr-10";

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(function FormSelect(
  { className, children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      className={cn(
        CONTROL_CLASSNAME,
        CONTROL_DISABLED_CLASSNAME,
        SELECT_CHEVRON_CLASSNAME,
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
});

type FormTextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

// Textarea override: quita el `h-11` del CONTROL_CLASSNAME para que pueda
// crecer segun `rows` + permite resize vertical. Mantiene `py-3` propio.
export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(function FormTextarea(
  { className, rows = 3, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        CONTROL_CLASSNAME,
        "!h-auto min-h-[5rem] py-3 resize-y",
        CONTROL_DISABLED_CLASSNAME,
        className,
      )}
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
  warning: "font-bold text-warning",
  destructive: "font-bold text-destructive",
  info: "font-bold text-info",
};

type FormBannerProps = HTMLAttributes<HTMLDivElement> & {
  variant?: FormBannerVariant;
  icon?: ReactNode;
  /**
   * Opcional. CTA o control alineado a la derecha (toggle, link, button).
   * Cuando se informa, el banner usa layout `justify-between` en desktop
   * y se apila en mobile — el texto queda en un <span> (no en <p>) para
   * poder convivir con un <button> dentro del mismo banner.
   */
  action?: ReactNode;
  children: ReactNode;
};

export function FormBanner({
  variant = "warning",
  icon,
  action,
  children,
  className,
  ...rest
}: FormBannerProps) {
  const accentClass = cn("mr-1", BANNER_ACCENT_BY_VARIANT[variant]);

  if (action !== undefined) {
    return (
      <div
        className={cn(
          BANNER_CLASS_BY_VARIANT[variant],
          "flex flex-wrap items-center justify-between gap-3",
          className,
        )}
        {...rest}
      >
        <span className="leading-[1.5]">
          <span className={accentClass} aria-hidden="true">
            {icon ?? "!"}
          </span>
          {children}
        </span>
        {action}
      </div>
    );
  }

  return (
    <div className={cn(BANNER_CLASS_BY_VARIANT[variant], className)} {...rest}>
      <p className="leading-[1.5]">
        <span className={accentClass} aria-hidden="true">
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
