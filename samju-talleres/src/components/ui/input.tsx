import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface FieldProps {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}

export type InputProps = InputHTMLAttributes<HTMLInputElement> & FieldProps;

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      id,
      label,
      hint,
      error,
      "aria-describedby": describedBy,
      "aria-invalid": ariaInvalid,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const controlId = id ?? generatedId;
    const hintId = `${controlId}-hint`;
    const errorId = `${controlId}-error`;
    const descriptionIds = [
      describedBy,
      hint && !error ? hintId : undefined,
      error ? errorId : undefined,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="w-full">
        {label && (
          <label
            className="mb-1.5 block text-sm font-medium text-foreground"
            htmlFor={controlId}
          >
            {label}
          </label>
        )}
        <input
          {...props}
          ref={ref}
          id={controlId}
          type={type}
          aria-invalid={error ? true : ariaInvalid}
          aria-describedby={descriptionIds || undefined}
          className={cn(
            "flex h-10 w-full rounded-lg border border-line bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70 aria-[invalid=true]:border-rose-foreground",
            className,
          )}
        />
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-xs text-muted">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="mt-1.5 text-xs text-rose-foreground" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & FieldProps;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(
  (
    {
      className,
      id,
      label,
      hint,
      error,
      children,
      "aria-describedby": describedBy,
      "aria-invalid": ariaInvalid,
      ...props
    },
    ref,
  ) => {
    const generatedId = useId();
    const controlId = id ?? generatedId;
    const hintId = `${controlId}-hint`;
    const errorId = `${controlId}-error`;
    const descriptionIds = [
      describedBy,
      hint && !error ? hintId : undefined,
      error ? errorId : undefined,
    ]
      .filter(Boolean)
      .join(" ");

    return (
      <div className="w-full">
        {label && (
          <label
            className="mb-1.5 block text-sm font-medium text-foreground"
            htmlFor={controlId}
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            {...props}
            ref={ref}
            id={controlId}
            aria-invalid={error ? true : ariaInvalid}
            aria-describedby={descriptionIds || undefined}
            className={cn(
              "flex h-10 w-full appearance-none rounded-lg border border-line bg-surface px-3 py-2 pr-10 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:opacity-70 aria-[invalid=true]:border-rose-foreground",
              className,
            )}
          >
            {children}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
          />
        </div>
        {hint && !error && (
          <p id={hintId} className="mt-1.5 text-xs text-muted">
            {hint}
          </p>
        )}
        {error && (
          <p id={errorId} className="mt-1.5 text-xs text-rose-foreground" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  },
);

Select.displayName = "Select";
