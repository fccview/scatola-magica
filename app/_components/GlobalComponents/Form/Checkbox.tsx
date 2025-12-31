import { InputHTMLAttributes, forwardRef } from "react";

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ label, description, className = "", ...props }, ref) => {
    return (
      <label className="flex items-start gap-3 cursor-pointer group">
        <div className="relative flex items-center justify-center mt-0.5">
          <input
            ref={ref}
            type="checkbox"
            className="peer h-5 w-5 cursor-pointer appearance-none rounded border-2 border-outline bg-surface transition-all checked:border-primary checked:bg-primary disabled:cursor-not-allowed disabled:opacity-50"
            {...props}
          />
          <span className="pointer-events-none absolute text-white opacity-0 peer-checked:opacity-100 material-symbols-outlined text-base">
            check
          </span>
        </div>
        {(label || description) && (
          <div className="flex-1">
            {label && (
              <div className="text-sm font-medium text-on-surface group-hover:text-primary transition-colors">
                {label}
              </div>
            )}
            {description && (
              <div className="text-xs text-on-surface-variant mt-0.5">
                {description}
              </div>
            )}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = "Checkbox";

export default Checkbox;
