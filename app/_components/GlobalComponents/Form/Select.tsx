import { SelectHTMLAttributes, forwardRef } from "react";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, error, helperText, className = "", children, ...props }, ref) => {
    const baseStyles =
      "w-full pl-2.5 pr-8 py-1.5 min-h-[40px] text-sm rounded-lg bg-surface-container text-on-surface focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:border-primary focus:border focus:border-dashed cursor-pointer appearance-none";

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
        <div className="relative">
          <select
            ref={ref}
            id={props.id}
            className={`${baseStyles} ${errorStyles} ${className}`}
            {...props}
          >
            {children}
          </select>
          <div className="absolute right-2 top-[58%] -translate-y-[50%] pointer-events-none">
            <Icon icon="keyboard_arrow_down" size="sm" />
          </div>
        </div>
        {error && <p className="text-sm text-error">{error}</p>}
        {helperText && !error && (
          <p className="text-sm text-on-surface-variant">{helperText}</p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export default Select;
