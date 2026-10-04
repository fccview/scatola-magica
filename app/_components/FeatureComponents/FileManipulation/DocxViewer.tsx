"use client";

import PreviewStatus from "./PreviewStatus";
import { useFileParse } from "@/app/_hooks/useFileParse";

interface DocxViewerProps {
  fileUrl: string;
}

const DOC_STYLES = [
  "text-on-surface text-sm leading-relaxed",
  "[&_h1]:text-2xl [&_h1]:font-bold [&_h1]:mt-2 [&_h1]:mb-4",
  "[&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-6 [&_h2]:mb-3",
  "[&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-4 [&_h3]:mb-2",
  "[&_p]:mb-3",
  "[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-3",
  "[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-3",
  "[&_a]:text-primary [&_a:hover]:underline",
  "[&_table]:mb-4 [&_table]:border-collapse",
  "[&_td]:border [&_td]:border-outline-variant [&_td]:px-3 [&_td]:py-2",
  "[&_th]:border [&_th]:border-outline-variant [&_th]:px-3 [&_th]:py-2",
  "[&_img]:max-w-full [&_img]:rounded",
].join(" ");

const docxToHtml = async (buffer: ArrayBuffer): Promise<string> => {
  const [{ default: mammoth }, { default: DOMPurify }] = await Promise.all([
    import("mammoth"),
    import("dompurify"),
  ]);

  const { value } = await mammoth.convertToHtml({ arrayBuffer: buffer });
  return DOMPurify.sanitize(value);
};

const DocxViewer = ({ fileUrl }: DocxViewerProps) => {
  const { result, error, isLoading } = useFileParse(fileUrl, docxToHtml);

  if (isLoading || error || result === null) {
    return <PreviewStatus error={error} />;
  }

  return (
    <div className="overflow-auto max-h-[70vh] rounded-lg bg-surface-container p-6 medium:p-10">
      <article
        className={`max-w-3xl mx-auto ${DOC_STYLES}`}
        dangerouslySetInnerHTML={{ __html: result }}
      />
    </div>
  );
};

export default DocxViewer;
