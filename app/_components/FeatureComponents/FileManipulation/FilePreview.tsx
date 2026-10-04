"use client";

import PdfViewer from "./PdfViewer";
import CsvViewer from "./CsvViewer";
import ArchiveViewer from "./ArchiveViewer";
import DocxViewer from "./DocxViewer";
import SheetViewer from "./SheetViewer";
import SlidesViewer from "./SlidesViewer";
import FontViewer from "./FontViewer";
import { PreviewKind } from "@/app/_types/enums";

interface FilePreviewProps {
  kind: PreviewKind;
  fileId: string;
  fileName: string;
  viewUrl: string;
}

const FilePreview = ({ kind, fileId, fileName, viewUrl }: FilePreviewProps) => {
  switch (kind) {
    case PreviewKind.IMAGE:
      return (
        <div className="flex items-center justify-center">
          <img
            src={viewUrl}
            alt={fileName}
            className="max-w-full max-h-[70vh] object-contain rounded"
          />
        </div>
      );
    case PreviewKind.VIDEO:
      return (
        <div className="flex items-center justify-center">
          <video src={viewUrl} controls className="max-w-full max-h-[70vh] rounded">
            Your browser does not support the video tag.
          </video>
        </div>
      );
    case PreviewKind.AUDIO:
      return (
        <div className="flex items-center justify-center py-12">
          <audio src={viewUrl} controls className="w-full max-w-xl">
            Your browser does not support the audio tag.
          </audio>
        </div>
      );
    case PreviewKind.PDF:
      return <PdfViewer fileUrl={viewUrl} fileName={fileName} />;
    case PreviewKind.CSV:
      return <CsvViewer fileUrl={viewUrl} />;
    case PreviewKind.ARCHIVE:
      return <ArchiveViewer fileId={fileId} />;
    case PreviewKind.DOCUMENT:
      return <DocxViewer fileUrl={viewUrl} />;
    case PreviewKind.SHEET:
      return <SheetViewer fileUrl={viewUrl} />;
    case PreviewKind.SLIDES:
      return <SlidesViewer fileUrl={viewUrl} />;
    case PreviewKind.FONT:
      return <FontViewer fileUrl={viewUrl} />;
    default:
      return (
        <div className="flex items-center justify-center py-12">
          <div className="text-on-surface-variant">
            This file type cannot be previewed. Please download it to view.
          </div>
        </div>
      );
  }
};

export default FilePreview;
