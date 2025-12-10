"use client";

import { useState, useEffect } from "react";
import {
  createApiKey,
  regenerateApiKey,
  deleteApiKey,
  getApiKey,
} from "@/app/_server/actions/user";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";

export default function ApiKeySection() {
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKey, setApiKey] = useState<string | undefined>();
  const [showApiKey, setShowApiKey] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadApiKeyStatus();
  }, []);

  const loadApiKeyStatus = async () => {
    try {
      const result = await getApiKey();
      setHasApiKey(result.hasApiKey);
      if (result.hasApiKey) {
        setApiKey(result.apiKey);
      }
    } catch (err) {
      console.error("Failed to load API key status:", err);
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setError("");
    setSuccess("");

    try {
      const result = await createApiKey();
      if (result.success && result.apiKey) {
        setHasApiKey(true);
        setApiKey(result.apiKey);
        setShowApiKey(true);
        setSuccess("API key generated successfully! Make sure to copy it now.");
      } else {
        setError(result.error || "Failed to generate API key");
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = async () => {
    if (!confirm("Are you sure? This will invalidate your current API key.")) {
      return;
    }

    setIsGenerating(true);
    setError("");
    setSuccess("");

    try {
      const result = await regenerateApiKey();
      if (result.success && result.apiKey) {
        setApiKey(result.apiKey);
        setShowApiKey(true);
        setSuccess(
          "API key regenerated successfully! Make sure to copy it now."
        );
      } else {
        setError(result.error || "Failed to regenerate API key");
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (
      !confirm(
        "Are you sure you want to delete your API key? This cannot be undone."
      )
    ) {
      return;
    }

    setIsDeleting(true);
    setError("");
    setSuccess("");

    try {
      const result = await deleteApiKey();
      if (result.success) {
        setHasApiKey(false);
        setApiKey(undefined);
        setShowApiKey(false);
        setSuccess("API key deleted successfully");
      } else {
        setError(result.error || "Failed to delete API key");
      }
    } catch (err) {
      setError("An error occurred");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCopy = async () => {
    if (!apiKey) return;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(apiKey);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } else {
        const textArea = document.createElement("textarea");
        textArea.value = apiKey;
        textArea.style.position = "fixed";
        textArea.style.left = "-999999px";
        document.body.appendChild(textArea);
        textArea.select();
        try {
          document.execCommand("copy");
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch (err) {
          console.error("Failed to copy:", err);
          setError("Failed to copy to clipboard");
        }
        document.body.removeChild(textArea);
      }
    } catch (err) {
      console.error("Failed to copy:", err);
      setError("Failed to copy to clipboard");
    }
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 10) return key;
    return `${key.slice(0, 10)}${"•".repeat(20)}${key.slice(-4)}`;
  };

  return (
    <div>
      <h2 className="text-xl font-medium text-on-surface mb-6">API Key</h2>
      <p className="text-sm text-on-surface-variant mb-4">
        Use API keys to authenticate requests to the API from external
        applications. The key starts with{" "}
        <code className="bg-surface-variant px-1 py-0.5 rounded">ck_</code>{" "}
        prefix.
      </p>

      <div className="space-y-4">
        {hasApiKey && apiKey ? (
          <>
            <div className="bg-surface-variant rounded-lg p-4">
              <div className="flex items-center justify-between gap-2">
                <code className="text-sm font-mono text-on-surface flex-1 overflow-hidden break-all">
                  {showApiKey ? apiKey : maskApiKey(apiKey)}
                </code>
                <div className="flex gap-1 flex-shrink-0">
                  <IconButton
                    icon={showApiKey ? "visibility_off" : "visibility"}
                    onClick={() => setShowApiKey(!showApiKey)}
                    title={showApiKey ? "Hide API key" : "Show API key"}
                  />
                  <IconButton
                    icon={copied ? "check" : "content_copy"}
                    onClick={handleCopy}
                    title="Copy to clipboard"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outlined"
                onClick={handleRegenerate}
                disabled={isGenerating || isDeleting}
              >
                {isGenerating ? "Regenerating..." : "Regenerate"}
              </Button>
              <Button
                variant="outlined"
                onClick={handleDelete}
                disabled={isGenerating || isDeleting}
                className="text-error"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </Button>
            </div>
          </>
        ) : (
          <Button
            variant="filled"
            onClick={handleGenerate}
            disabled={isGenerating}
          >
            {isGenerating ? "Generating..." : "Generate API Key"}
          </Button>
        )}

        {error && (
          <div className="p-3 rounded-lg bg-error-container text-on-error-container text-sm">
            {error}
          </div>
        )}

        {success && (
          <div className="p-3 rounded-lg bg-primary-container text-on-primary-container text-sm">
            {success}
          </div>
        )}
      </div>
    </div>
  );
}
