interface PreviewStatusProps {
  error?: string | null;
}

const PreviewStatus = ({ error }: PreviewStatusProps) => (
  <div className="flex items-center justify-center py-12">
    {error ? (
      <div className="text-error">{error}</div>
    ) : (
      <div className="text-on-surface-variant">Loading...</div>
    )}
  </div>
);

export default PreviewStatus;
