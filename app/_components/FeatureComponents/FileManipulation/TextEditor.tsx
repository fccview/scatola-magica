"use client";

import { useEffect, useState, useImperativeHandle, forwardRef } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { tomorrow } from "react-syntax-highlighter/dist/esm/styles/prism";
import Editor from "react-simple-code-editor";
import Prism from "prismjs";

import "prismjs/components/prism-clike";
import "prismjs/components/prism-markup";
import "prismjs/components/prism-markup-templating";
import "prismjs/components/prism-css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-c";
import "prismjs/components/prism-cpp";
import "prismjs/components/prism-csharp";
import "prismjs/components/prism-go";
import "prismjs/components/prism-java";
import "prismjs/components/prism-json";
import "prismjs/components/prism-kotlin";
import "prismjs/components/prism-markdown";
import "prismjs/components/prism-php";
import "prismjs/components/prism-python";
import "prismjs/components/prism-ruby";
import "prismjs/components/prism-rust";
import "prismjs/components/prism-scala";
import "prismjs/components/prism-sql";
import "prismjs/components/prism-swift";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-yaml";
import "prismjs/components/prism-scss";
import "prismjs/components/prism-sass";
import "prismjs/components/prism-less";
import "prismjs/components/prism-graphql";
import "prismjs/components/prism-bash";
import "prismjs/components/prism-jsx";
import "prismjs/components/prism-tsx";

import "prismjs/themes/prism-tomorrow.css";
import { saveFileContent } from "@/app/_server/actions/editor";
import MarkdownRenderer from "../../GlobalComponents/Markdown/MarkdownRenderer";

export const EXTENSION_TO_LANGUAGE: Record<string, string> = {
  js: "javascript",
  jsx: "jsx",
  ts: "typescript",
  tsx: "tsx",
  py: "python",
  rb: "ruby",
  java: "java",
  c: "c",
  cpp: "cpp",
  h: "c",
  hpp: "cpp",
  cs: "csharp",
  php: "php",
  go: "go",
  rs: "rust",
  swift: "swift",
  kt: "kotlin",
  scala: "scala",
  html: "html",
  xml: "xml",
  css: "css",
  scss: "scss",
  sass: "sass",
  less: "less",
  json: "json",
  yaml: "yaml",
  yml: "yaml",
  toml: "toml",
  md: "markdown",
  markdown: "markdown",
  sh: "bash",
  bash: "bash",
  zsh: "bash",
  sql: "sql",
  graphql: "graphql",
  dockerfile: "dockerfile",
  makefile: "makefile",
  ini: "ini",
  conf: "nginx",
  config: "properties",
  env: "properties",
  txt: "text",
  log: "log",
};

interface TextEditorProps {
  fileId: string;
  fileName: string;
  fileUrl: string;
  isEditing: boolean;
  onEditingChange: (isEditing: boolean) => void;
  onDirtyChange: (isDirty: boolean) => void;
  onSavingChange: (isSaving: boolean) => void;
  onSaveRequest?: () => void;
  onCancelRequest?: () => void;
  isMarkdown?: boolean;
}

export interface TextEditorHandle {
  save: () => Promise<void>;
  cancel: () => void;
  isDirty: () => boolean;
}

const TextEditor = forwardRef<TextEditorHandle, TextEditorProps>(
  (
    {
      fileId,
      fileName,
      fileUrl,
      isEditing,
      isMarkdown,
      onEditingChange,
      onDirtyChange,
      onSavingChange,
    },
    ref
  ) => {
    const [fileContent, setFileContent] = useState<string>("");
    const [originalContent, setOriginalContent] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const extension = fileName.split(".").pop()?.toLowerCase() || "";
    const language = EXTENSION_TO_LANGUAGE[extension] || "text";
    const isDirty = fileContent !== originalContent;

    useEffect(() => {
      onDirtyChange(isDirty);
    }, [isDirty, onDirtyChange]);

    useImperativeHandle(ref, () => ({
      save: handleSave,
      cancel: handleCancelEdit,
      isDirty: () => isDirty,
    }));

    useEffect(() => {
      setIsLoading(true);
      setError(null);

      fetch(fileUrl, { cache: "no-store" })
        .then((res) => {
          if (!res.ok) throw new Error("Failed to load file");
          return res.text();
        })
        .then((text) => {
          setFileContent(text);
          setOriginalContent(text);
          setIsLoading(false);
        })
        .catch((err) => {
          setError(err.message);
          setIsLoading(false);
        });
    }, [fileUrl]);

    const handleSave = async () => {
      if (!isDirty) return;

      onSavingChange(true);
      try {
        const result = await saveFileContent(fileId, fileContent);
        if (result.success) {
          setOriginalContent(fileContent);
          onEditingChange(false);
        } else {
          alert(result.error || "Failed to save file");
        }
      } catch (error) {
        console.error("Save error:", error);
        alert("Failed to save file");
      } finally {
        onSavingChange(false);
      }
    };

    const handleCancelEdit = () => {
      if (isDirty) {
        if (confirm("You have unsaved changes. Discard them?")) {
          setFileContent(originalContent);
          onEditingChange(false);
        }
      } else {
        onEditingChange(false);
      }
    };

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

    const lineCount = fileContent.split("\n").length;
    const lineNumbers = Array.from({ length: lineCount }, (_, i) => i + 1);

    return (
      <>
        {isEditing ? (
          <div className="flex bg-surface-container rounded-lg">
            <div
              className="py-4 pr-3 pl-4 text-on-surface-variant text-right select-none"
              style={{
                fontFamily:
                  "Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace",
                fontSize: "14px",
                lineHeight: "21px",
              }}
            >
              {lineNumbers.map((num) => (
                <div key={num}>{num}</div>
              ))}
            </div>
            <Editor
              value={fileContent}
              onValueChange={setFileContent}
              highlight={(code) => {
                if (!code) return "";
                try {
                  const grammar = Prism.languages[language];
                  if (
                    grammar &&
                    typeof grammar === "object" &&
                    grammar.constructor === Object
                  ) {
                    return Prism.highlight(code, grammar, language);
                  }
                } catch (error) {
                  console.warn(
                    `Syntax highlighting failed for language: ${language}`,
                    error
                  );
                }
                return code;
              }}
              padding={16}
              tabSize={4}
              insertSpaces={true}
              className="flex-1"
              style={{
                fontFamily:
                  "Consolas, Monaco, 'Andale Mono', 'Ubuntu Mono', monospace",
                fontSize: "14px",
                minHeight: "400px",
              }}
              textareaClassName="focus:outline-none bg-transparent rounded-r-lg"
            />
          </div>
        ) : (
          <div
            className={`bg-surface-container rounded-lg ${
              isMarkdown ? "p-6" : ""
            }`}
          >
            {isMarkdown ? (
              <MarkdownRenderer content={fileContent} />
            ) : (
              <SyntaxHighlighter
                language={language}
                style={tomorrow}
                customStyle={{
                  margin: 0,
                  fontSize: "14px",
                  background: "transparent",
                }}
                wrapLongLines
                showLineNumbers
              >
                {fileContent}
              </SyntaxHighlighter>
            )}
          </div>
        )}
      </>
    );
  }
);

TextEditor.displayName = "TextEditor";

export default TextEditor;
