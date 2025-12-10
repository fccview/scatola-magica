"use client";

interface PdfViewerProps {
  fileUrl: string;
  fileName: string;
}

export default function PdfViewer({ fileUrl, fileName }: PdfViewerProps) {
  return (
    <iframe
      src={fileUrl}
      title={fileName}
      className="w-full h-[70vh] rounded-lg"
    />
  );
}
