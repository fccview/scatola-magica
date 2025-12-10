"use client";

import { useEffect, useState } from "react";
import Papa from "papaparse";

interface CsvViewerProps {
  fileUrl: string;
}

export default function CsvViewer({ fileUrl }: CsvViewerProps) {
  const [data, setData] = useState<string[][]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch(fileUrl, { cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load file");
        return res.text();
      })
      .then((text) => {
        const result = Papa.parse<string[]>(text, {
          skipEmptyLines: true,
        });
        setData(result.data);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setIsLoading(false);
      });
  }, [fileUrl]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-on-surface-variant">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="overflow-auto max-h-[70vh] rounded-lg bg-surface-container">
      <table className="w-full border-collapse">
        <tbody>
          {data.map((row, rowIndex) => (
            <tr key={rowIndex} className="border-b border-outline-variant">
              {row.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className="px-4 py-2 text-sm text-on-surface border-r border-outline-variant last:border-r-0"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
