"use client";

import { useState } from "react";
import PreviewStatus from "./PreviewStatus";
import { useFileParse } from "@/app/_hooks/useFileParse";
import { SHEET_PREVIEW_MAX_ROWS } from "@/app/_lib/constants";

interface SheetViewerProps {
  fileUrl: string;
}

interface SheetData {
  name: string;
  rows: string[][];
}

const readSheets = async (buffer: ArrayBuffer): Promise<SheetData[]> => {
  const XLSX = await import("xlsx");
  const workbook = XLSX.read(buffer, {
    type: "array",
    sheetRows: SHEET_PREVIEW_MAX_ROWS,
  });

  return workbook.SheetNames.map((name) => ({
    name,
    rows: XLSX.utils
      .sheet_to_json<unknown[]>(workbook.Sheets[name], {
        header: 1,
        defval: "",
        raw: false,
      })
      .map((row) => row.map((cell) => String(cell ?? ""))),
  }));
};

const SheetViewer = ({ fileUrl }: SheetViewerProps) => {
  const { result, error, isLoading } = useFileParse(fileUrl, readSheets);
  const [activeIndex, setActiveIndex] = useState(0);

  if (isLoading || error || !result) {
    return <PreviewStatus error={error} />;
  }

  const sheet = result[activeIndex];

  return (
    <div className="flex flex-col gap-3">
      {result.length > 1 && (
        <div className="flex gap-1 overflow-x-auto">
          {result.map((tab, index) => (
            <button
              key={tab.name}
              onClick={() => setActiveIndex(index)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${
                index === activeIndex
                  ? "bg-primary text-on-primary"
                  : "text-on-surface hover:bg-surface-variant"
              }`}
            >
              {tab.name}
            </button>
          ))}
        </div>
      )}

      {sheet.rows.length === 0 ? (
        <PreviewStatus error="This sheet is empty" />
      ) : (
        <div className="overflow-auto max-h-[65vh] rounded-lg bg-surface-container">
          <table className="w-full border-collapse">
            <tbody>
              {sheet.rows.map((row, rowIndex) => (
                <tr key={rowIndex} className="border-b border-outline-variant">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={cellIndex}
                      className="px-4 py-2 text-sm text-on-surface whitespace-nowrap border-r border-outline-variant last:border-r-0"
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {sheet.rows.length >= SHEET_PREVIEW_MAX_ROWS && (
        <div className="text-xs text-on-surface-variant">
          Showing the first {SHEET_PREVIEW_MAX_ROWS} rows. Download the file to
          see everything.
        </div>
      )}
    </div>
  );
};

export default SheetViewer;
