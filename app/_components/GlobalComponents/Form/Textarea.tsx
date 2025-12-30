import { TextareaHTMLAttributes, forwardRef } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  description?: string;
  secondary?: boolean;
}

const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    { label, error, description, secondary = false, className = "", ...props },
    ref
  ) => {
    const baseStyles =
      "w-full px-2.5 py-1.5 text-sm rounded-lg text-on-surface focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:border-primary focus:border focus:border-dashed resize-y";
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
        <textarea
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

Textarea.displayName = "Textarea";

export default Textarea;

