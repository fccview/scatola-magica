import { forwardRef } from "react";

interface SwitchProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: string;
  description?: string;
  className?: string;
}

const Switch = forwardRef<HTMLDivElement, SwitchProps>(
  (
    {
      id,
      checked,
      onChange,
      disabled = false,
      label,
      description,
      className = "",
    },
    ref
  ) => {
    const handleClick = () => {
      if (!disabled) {
        onChange(!checked);
      }
    };

    return (
      <div
        ref={ref}
        className={`flex items-center justify-between cursor-pointer select-none ${className}`}
        onClick={handleClick}
      >
        <div>
          {label && (
            <h3 className="text-base font-medium text-on-surface">{label}</h3>
          )}
          {description && (
            <p className="text-sm text-on-surface-variant">{description}</p>
          )}
        </div>
        <button
          id={id}
          type="button"
          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
            checked ? "bg-primary" : "bg-surface-variant"
          } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation();
            handleClick();
          }}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
              checked ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </div>
    );
  }
);

Switch.displayName = "Switch";

export default Switch;
