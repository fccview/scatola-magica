import { UploadPhase } from "@/app/_types/enums";

interface PhaseMeta {
  label: string;
  icon: string;
  isMeasured: boolean;
}

export const PHASE_META: Record<UploadPhase, PhaseMeta> = {
  [UploadPhase.QUEUED]: {
    label: "Waiting in line",
    icon: "hourglass_empty",
    isMeasured: false,
  },
  [UploadPhase.PREPARING]: {
    label: "Picking the perfect chunk size",
    icon: "tune",
    isMeasured: false,
  },
  [UploadPhase.SECURING]: {
    label: "Forging your encryption key",
    icon: "key",
    isMeasured: false,
  },
  [UploadPhase.RESUMING]: {
    label: "Looking for an earlier attempt to resume",
    icon: "history",
    isMeasured: false,
  },
  [UploadPhase.HANDSHAKE]: {
    label: "Opening an upload session",
    icon: "handshake",
    isMeasured: false,
  },
  [UploadPhase.SENDING]: {
    label: "Sending chunks",
    icon: "cloud_upload",
    isMeasured: true,
  },
  [UploadPhase.ASSEMBLING]: {
    label: "Putting it all together on the server",
    icon: "auto_fix_high",
    isMeasured: false,
  },
  [UploadPhase.DONE]: {
    label: "Done",
    icon: "check_circle",
    isMeasured: true,
  },
};
