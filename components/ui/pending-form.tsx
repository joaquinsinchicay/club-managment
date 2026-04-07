"use client";

import { type ButtonHTMLAttributes, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";

import { cn } from "@/lib/utils";

type SpinnerProps = ComponentPropsWithoutRef<"span">;

export function Spinner({ className, ...props }: SpinnerProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent",
        className
      )}
      {...props}
    />
  );
}

type PendingFieldsetProps = ComponentPropsWithoutRef<"fieldset"> & {
  children: ReactNode;
};

export function PendingFieldset({
  children,
  className,
  disabled,
  ...props
}: PendingFieldsetProps) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <fieldset
      aria-busy={pending}
      disabled={isDisabled}
      className={cn(
        "min-w-0 border-0 p-0 transition-opacity duration-200",
        pending && "pointer-events-none opacity-70",
        className
      )}
      {...props}
    >
      {children}
    </fieldset>
  );
}

type PendingSubmitButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> & {
  idleLabel: string;
  pendingLabel: string;
};

export function PendingSubmitButton({
  className,
  disabled,
  idleLabel,
  pendingLabel,
  type = "submit",
  ...props
}: PendingSubmitButtonProps) {
  const { pending } = useFormStatus();
  const isDisabled = disabled || pending;

  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-disabled={isDisabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 disabled:cursor-not-allowed disabled:opacity-70",
        className
      )}
      {...props}
    >
      {pending ? (
        <>
          <Spinner />
          <span>{pendingLabel}</span>
        </>
      ) : (
        <span>{idleLabel}</span>
      )}
    </button>
  );
}

type PendingStatusTextProps = ComponentPropsWithoutRef<"span"> & {
  idleLabel: string;
  pendingLabel: string;
};

export function PendingStatusText({
  className,
  idleLabel,
  pendingLabel,
  ...props
}: PendingStatusTextProps) {
  const { pending } = useFormStatus();

  return (
    <span
      aria-live="polite"
      className={cn("inline-flex items-center gap-2 text-xs text-muted-foreground", className)}
      {...props}
    >
      {pending ? (
        <>
          <Spinner className="size-3.5" />
          <span>{pendingLabel}</span>
        </>
      ) : (
        <span>{idleLabel}</span>
      )}
    </span>
  );
}
