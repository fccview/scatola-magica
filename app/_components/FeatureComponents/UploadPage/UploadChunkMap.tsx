import { ChunkState } from "@/app/_types/enums";

const CHUNK_STYLES: Record<ChunkState, string> = {
  [ChunkState.WAITING]: "bg-surface-variant",
  [ChunkState.SENDING]: "bg-primary/60 fx-blink",
  [ChunkState.RETRYING]: "bg-error fx-blink",
  [ChunkState.DONE]: "bg-primary",
};

interface UploadChunkMapProps {
  chunks: ChunkState[];
}

const UploadChunkMap = ({ chunks }: UploadChunkMapProps) => {
  if (chunks.length < 2) return null;

  return (
    <div className="flex gap-0.5" aria-hidden="true">
      {chunks.map((state, index) => (
        <span
          key={index}
          className={`h-1.5 flex-1 rounded-sm transition-colors duration-300 ${CHUNK_STYLES[state]}`}
        />
      ))}
    </div>
  );
};

export default UploadChunkMap;
