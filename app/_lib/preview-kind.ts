import {
  ARCHIVE_EXTENSIONS,
  AUDIO_EXTENSIONS,
  CSV_EXTENSIONS,
  DOCUMENT_EXTENSIONS,
  FONT_EXTENSIONS,
  IMAGE_EXTENSIONS,
  PDF_EXTENSIONS,
  SHEET_EXTENSIONS,
  SLIDE_EXTENSIONS,
  TEXT_EXTENSIONS,
  VIDEO_EXTENSIONS,
} from "@/app/_lib/constants";
import { PreviewKind } from "@/app/_types/enums";

const KIND_TABLE: [PreviewKind, string[]][] = [
  [PreviewKind.TEXT, TEXT_EXTENSIONS],
  [PreviewKind.IMAGE, IMAGE_EXTENSIONS],
  [PreviewKind.VIDEO, VIDEO_EXTENSIONS],
  [PreviewKind.AUDIO, AUDIO_EXTENSIONS],
  [PreviewKind.PDF, PDF_EXTENSIONS],
  [PreviewKind.CSV, CSV_EXTENSIONS],
  [PreviewKind.ARCHIVE, ARCHIVE_EXTENSIONS],
  [PreviewKind.DOCUMENT, DOCUMENT_EXTENSIONS],
  [PreviewKind.SHEET, SHEET_EXTENSIONS],
  [PreviewKind.SLIDES, SLIDE_EXTENSIONS],
  [PreviewKind.FONT, FONT_EXTENSIONS],
];

export const fileExtension = (fileName: string): string =>
  fileName.split(".").pop()?.toLowerCase() || "";

export const previewKind = (fileName: string): PreviewKind => {
  const extension = fileExtension(fileName);
  const match = KIND_TABLE.find(([, extensions]) =>
    extensions.includes(extension)
  );

  return match ? match[0] : PreviewKind.NONE;
};
