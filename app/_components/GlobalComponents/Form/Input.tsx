import { InputHTMLAttributes, forwardRef } from "react";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  description?: string;
  secondary?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    { label, error, description, secondary = false, className = "", ...props },
    ref
  ) => {
    const baseStyles =
      "w-full px-2.5 py-1.5 min-h-[40px] text-sm rounded-lg text-on-surface focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:border-primary focus:border focus:border-dashed";
    const secondaryStyles = secondary ? "bg-surface" : "bg-surface-container";

    const errorStyles = error ? "ring-1 ring-error" : "";

    return (
      <div className="space-y-1.5">
        {label && (
          <label
            htmlFor={props.id}
            className="block text-sm font-medium text-on-surface"
          >
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`${baseStyles} ${secondaryStyles} ${errorStyles} ${className}`}
          {...props}
        />
        {error && <p className="text-sm text-error">{error}</p>}
        {description && !error && (
          <p className="text-sm text-on-surface-variant">{description}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export default Input;
