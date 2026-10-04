"use client";

import { UploadTally } from "@/app/_types/upload";
import { ANIMATIONS } from "@/app/_lib/animations";
import { fmtBytes, fmtEta, fmtSpeed, plural } from "@/app/_lib/upload-format";
import { useMotion } from "@/app/_hooks/useMotion";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";
import Progress from "@/app/_components/GlobalComponents/Layout/Progress";
import LottieAnimation from "@/app/_components/GlobalComponents/Layout/LottieAnimation";
import SparkBurst from "@/app/_components/GlobalComponents/Layout/SparkBurst";

interface UploadSummaryProps {
  tally: UploadTally;
  onRetryFailed: () => void;
  onCancelAll: () => void;
}

const _headline = (tally: UploadTally): string => {
  const total = tally.done + tally.failed + tally.active + tally.queued;
  if (tally.isBusy) return `Uploading ${plural(total, "file")}`;
  if (tally.failed > 0) return `Finished with ${plural(tally.failed, "hiccup")}`;
  if (tally.done === 0) return "Nothing left to upload";
  return tally.done === 1 ? "Your file has landed" : `All ${tally.done} files have landed`;
};

const _subline = (tally: UploadTally): string => {
  const parts = [`${fmtBytes(tally.sentBytes)} of ${fmtBytes(tally.totalBytes)}`];
  if (tally.isBusy && tally.speed > 0) parts.push(fmtSpeed(tally.speed));
  const eta = tally.isBusy ? fmtEta(tally.eta) : "";
  if (eta) parts.push(eta);
  return parts.join(" · ");
};

interface ChipProps {
  icon: string;
  label: string;
  tone: string;
}

const Chip = ({ icon, label, tone }: ChipProps) => (
  <span
    className={`fx-rise inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-surface-container ${tone}`}
  >
    <Icon icon={icon} size="xxs" />
    {label}
  </span>
);

const Badge = ({ tally }: { tally: UploadTally }) => {
  const motion = useMotion();
  const isTriumph = !tally.isBusy && tally.failed === 0 && tally.done > 0;

  if (isTriumph) {
    return (
      <div className="relative w-16 h-16 flex items-center justify-center">
        {motion ? (
          <LottieAnimation
            animationUrl={ANIMATIONS.SUCCESS_CHECKMARK}
            loop={false}
            autoplay={true}
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <Icon icon="check_circle" size="xl" className="text-primary" />
        )}
        <SparkBurst />
      </div>
    );
  }

  return (
    <div className="relative w-16 h-16 flex items-center justify-center">
      <Progress variant="circular" size="lg" value={tally.percent} className="absolute inset-0" />
      <span className="relative text-sm font-semibold tabular-nums text-on-surface">
        {Math.floor(tally.percent)}%
      </span>
    </div>
  );
};

const UploadSummary = ({ tally, onRetryFailed, onCancelAll }: UploadSummaryProps) => (
  <div className="flex items-center gap-4">
    <Badge tally={tally} />

    <div className="flex-1 min-w-0 space-y-1.5">
      <h3 className="text-lg font-semibold text-on-surface truncate">{_headline(tally)}</h3>
      <p className="text-xs text-on-surface-variant tabular-nums">{_subline(tally)}</p>
      <div className="flex flex-wrap gap-1.5">
        {tally.active > 0 && (
          <Chip icon="cloud_upload" label={`${tally.active} uploading`} tone="text-primary" />
        )}
        {tally.queued > 0 && (
          <Chip icon="hourglass_empty" label={`${tally.queued} waiting`} tone="text-on-surface-variant" />
        )}
        {tally.done > 0 && (
          <Chip icon="check" label={`${tally.done} done`} tone="text-primary" />
        )}
        {tally.failed > 0 && (
          <Chip icon="error" label={`${tally.failed} failed`} tone="text-error" />
        )}
      </div>
    </div>

    <div className="flex flex-col gap-2 flex-shrink-0">
      {tally.failed > 0 && (
        <Button size="sm" variant="outlined" onClick={onRetryFailed}>
          Retry failed
        </Button>
      )}
      {tally.isBusy && (
        <Button size="sm" variant="text" onClick={onCancelAll}>
          Cancel all
        </Button>
      )}
    </div>
  </div>
);

export default UploadSummary;
