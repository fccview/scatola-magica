"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <div className="text-on-surface">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-2xl md:text-3xl font-bold mb-4 mt-2 text-on-surface">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl md:text-2xl font-bold mt-6 mb-3 text-on-surface">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg md:text-xl font-semibold mt-4 mb-2 text-on-surface">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="mb-4 text-on-surface leading-relaxed text-sm md:text-base">
              {children}
            </p>
          ),
          ul: ({ children }) => (
            <ul className="list-disc pl-5 mb-4 space-y-2 text-on-surface">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 mb-4 space-y-2 text-on-surface">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-on-surface text-sm md:text-base">{children}</li>
          ),
          code: ({ children, className }) => {
            const isInline = !className;
            return isInline ? (
              <code className="bg-surface-container px-1.5 py-0.5 rounded text-xs md:text-sm text-on-surface font-mono">
                {children}
              </code>
            ) : (
              <code className="block bg-surface-container p-3 md:p-4 rounded text-xs md:text-sm text-on-surface overflow-x-auto font-mono mb-4">
                {children}
              </code>
            );
          },
          pre: ({ children }) => <pre className="mb-4">{children}</pre>,
          strong: ({ children }) => (
            <strong className="font-semibold text-on-surface">
              {children}
            </strong>
          ),
          a: ({ children, href }) => (
            <a
              href={href}
              className="text-primary hover:underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-4 my-4 text-on-surface-variant italic">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto mb-4">
              <table className="min-w-full border border-outline-variant">
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th className="border border-outline-variant bg-surface-container px-3 py-2 text-left text-sm font-semibold text-on-surface">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="border border-outline-variant px-3 py-2 text-sm text-on-surface">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
