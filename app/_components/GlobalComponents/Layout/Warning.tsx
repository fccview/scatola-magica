import Card from "@/app/_components/GlobalComponents/Cards/Card";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";

interface WarningProps {
  title: string;
  message: string;
  onDismiss?: () => void;
  variant?: "error" | "warning" | "info";
}

export default function Warning({
  title,
  message,
  onDismiss,
  variant = "warning",
}: WarningProps) {
  const variantStyles = {
    error: "border-l-error bg-error/5",
    warning: "border-l-primary bg-primary/5",
    info: "border-l-primary bg-primary/5",
  };

  const iconColors = {
    error: "text-error",
    warning: "text-primary",
    info: "text-primary",
  };

  const icons = {
    error: "error",
    warning: "warning",
    info: "info",
  };

  return (
    <Card
      variant="outlined"
      className={`p-4 mb-4 border-l-4 ${variantStyles[variant]}`}
    >
      <div className="flex items-start gap-3">
        <Icon icon={icons[variant]} size="md" className={iconColors[variant]} />
        <div className="flex-1">
          <h3 className="font-medium text-on-surface mb-1">{title}</h3>
          <p className="text-sm text-on-surface-variant">{message}</p>
        </div>
        {onDismiss && <IconButton icon="close" size="sm" onClick={onDismiss} />}
      </div>
    </Card>
  );
}
