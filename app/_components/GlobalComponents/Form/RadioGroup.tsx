"use client";

export interface RadioOption {
  value: string;
  label: string;
  description?: string;
}

interface RadioGroupProps {
  options: RadioOption[];
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
}

export default function RadioGroup({
  options,
  value,
  onChange,
  disabled = false,
  className = "",
}: RadioGroupProps) {
  function handleSelect(optionValue: string) {
    if (!disabled && optionValue !== value) {
      onChange(optionValue);
    }
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {options.map((option) => {
        const isSelected = value === option.value;

        return (
          <div
            key={option.value}
            className={`p-4 bg-surface-container rounded-lg cursor-pointer transition-colors ${
              isSelected
                ? "border border-dashed border-primary bg-primary/5"
                : "hover:bg-surface-container-high"
            } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
            onClick={() => handleSelect(option.value)}
          >
            <div className="text-on-surface font-medium">{option.label}</div>
            {option.description && (
              <p className="text-xs text-on-surface-variant mt-1">
                {option.description}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
