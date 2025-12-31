// @ts-ignore - No type definitions available for lang-detector
import detectLang from "lang-detector";

const LANGUAGE_TO_EXTENSION: Record<string, string> = {
  javascript: ".js",
  typescript: ".ts",
  jsx: ".jsx",
  tsx: ".tsx",
  c: ".c",
  "c++": ".cpp",
  python: ".py",
  java: ".java",
  html: ".html",
  css: ".css",
  ruby: ".rb",
  go: ".go",
  php: ".php",
  unknown: ".txt",
};

export const detectLanguage = (code: string): {
  language: string;
  extension: string;
} => {
  let detectedLanguage = detectLang(code)?.toLowerCase() || "unknown";
  let extension = LANGUAGE_TO_EXTENSION[detectedLanguage] || ".txt";

  if (detectedLanguage === "javascript") {
    const hasTypeScript = /:\s*(string|number|boolean|any|void)\b|interface\s+\w+|type\s+\w+/.test(code);
    const hasJSX = /<[A-Z]\w+[\s>/]|<[a-z]+\s+className=|return\s*\(\s*</.test(code);

    if (hasTypeScript && hasJSX) {
      detectedLanguage = "tsx";
      extension = ".tsx";
    } else if (hasTypeScript) {
      detectedLanguage = "typescript";
      extension = ".ts";
    } else if (hasJSX) {
      detectedLanguage = "jsx";
      extension = ".jsx";
    }
  }

  return {
    language: detectedLanguage,
    extension,
  };
};
