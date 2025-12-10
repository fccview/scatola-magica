"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  generateKeyPair,
  getKeyStatus,
  exportPublicKey,
  exportPrivateKey,
  importKeys,
  deleteKeys,
} from "@/app/_server/actions/pgp";
import {
  getEncryptionKey,
  regenerateEncryptionKey,
} from "@/app/_server/actions/user";
import { updateUserPreferences } from "@/app/_lib/preferences";
import { usePreferences } from "@/app/_providers/PreferencesProvider";
import Input from "@/app/_components/GlobalComponents/Form/Input";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";
import Switch from "@/app/_components/GlobalComponents/Form/Switch";

interface KeyInfo {
  username: string;
  email: string;
  created: number;
  algorithm: string;
  keySize: number;
  fingerprint: string;
}

export default function EncryptionTab() {
  const router = useRouter();
  const {
    user,
    customKeysPath,
    e2eEncryptionOnTransfer: initialE2E,
  } = usePreferences();
  const [hasKeys, setHasKeys] = useState(false);
  const [e2eEncryptionOnTransfer, setE2eEncryptionOnTransfer] = useState(
    initialE2E ?? true
  );
  const [keyInfo, setKeyInfo] = useState<KeyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [importing, setImporting] = useState(false);
  const [showImportForm, setShowImportForm] = useState(false);
  const [useCustomPath, setUseCustomPath] = useState(false);
  const [customPath, setCustomPath] = useState("");
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [generatePassword, setGeneratePassword] = useState("");
  const [generatePasswordConfirm, setGeneratePasswordConfirm] = useState("");
  const [generateEmail, setGenerateEmail] = useState("");
  const [keySize, setKeySize] = useState(4096);
  const [generateError, setGenerateError] = useState("");
  const [importPublicKey, setImportPublicKey] = useState("");
  const [importPrivateKey, setImportPrivateKey] = useState("");
  const [importPassword, setImportPassword] = useState("");
  const [importError, setImportError] = useState("");
  const [encryptionKey, setEncryptionKey] = useState<string | null>(null);
  const [showEncryptionKey, setShowEncryptionKey] = useState(false);
  const [regeneratingKey, setRegeneratingKey] = useState(false);

  useEffect(() => {
    loadKeyStatus();
    if (customKeysPath) {
      setUseCustomPath(true);
      setCustomPath(customKeysPath);
    }
    if (initialE2E !== undefined) {
      setE2eEncryptionOnTransfer(initialE2E);
    }
  }, [customKeysPath, initialE2E]);

  async function loadKeyStatus() {
    setLoading(true);
    const status = await getKeyStatus(customKeysPath);
    setHasKeys(status.hasKeys);
    if (status.keyInfo) {
      setKeyInfo(status.keyInfo);
    }
    const keyResult = await getEncryptionKey();
    if (keyResult.hasEncryptionKey && keyResult.encryptionKey) {
      setEncryptionKey(keyResult.encryptionKey);
    }
    setLoading(false);
  }

  async function handleGenerateKeys(e: React.FormEvent) {
    e.preventDefault();

    if (generatePassword.length < 8) {
      setGenerateError("Password must be at least 8 characters");
      return;
    }

    if (generatePassword !== generatePasswordConfirm) {
      setGenerateError("Passwords do not match");
      return;
    }

    setGenerating(true);
    setMessage(null);
    setGenerateError("");

    const result = await generateKeyPair(
      generatePassword,
      generateEmail || undefined,
      useCustomPath ? customPath || undefined : undefined,
      keySize
    );

    if (result.success) {
      setMessage({ type: "success", text: "Key pair generated successfully!" });
      setGeneratePassword("");
      setGeneratePasswordConfirm("");
      setGenerateEmail("");
      await loadKeyStatus();
    } else {
      setMessage({ type: "error", text: result.message });
    }

    setGenerating(false);
  }

  async function handleExportPublicKey() {
    const result = await exportPublicKey(customKeysPath);
    if (result.success && result.publicKey) {
      const blob = new Blob([result.publicKey], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${user?.username}_public.asc`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: "success", text: "Public key exported" });
    } else {
      setMessage({ type: "error", text: result.message });
    }
  }

  async function handleExportPrivateKey() {
    const confirmed = confirm(
      "Warning: Your private key is encrypted with your password, but should be stored securely. Continue?"
    );
    if (!confirmed) return;

    const result = await exportPrivateKey(customKeysPath);
    if (result.success && result.privateKey) {
      const blob = new Blob([result.privateKey], { type: "text/plain" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${user?.username}_private.asc`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage({ type: "success", text: "Private key exported" });
    } else {
      setMessage({ type: "error", text: result.message });
    }
  }

  async function handleImportKeys(e: React.FormEvent) {
    e.preventDefault();

    if (!importPublicKey || !importPrivateKey || !importPassword) {
      setImportError("All fields are required");
      return;
    }

    setImporting(true);
    setMessage(null);
    setImportError("");

    const result = await importKeys(
      importPublicKey,
      importPrivateKey,
      importPassword,
      useCustomPath ? customPath || undefined : undefined
    );

    if (result.success) {
      setMessage({ type: "success", text: "Keys imported successfully!" });
      setImportPublicKey("");
      setImportPrivateKey("");
      setImportPassword("");
      setShowImportForm(false);
      await loadKeyStatus();
    } else {
      setMessage({ type: "error", text: result.message });
    }

    setImporting(false);
  }

  async function handleDeleteKeys() {
    const confirmed = confirm(
      "Are you sure you want to delete your keys? This action cannot be undone. You will not be able to decrypt files encrypted with this key."
    );
    if (!confirmed) return;

    setDeleting(true);
    setMessage(null);

    const result = await deleteKeys(customKeysPath);

    if (result.success) {
      setMessage({ type: "success", text: "Keys deleted successfully" });
      await loadKeyStatus();
    } else {
      setMessage({ type: "error", text: result.message });
    }

    setDeleting(false);
  }

  async function handleUpdateCustomPath() {
    if (!user?.username) return;

    const result = await updateUserPreferences(user.username, {
      customKeysPath: useCustomPath ? customPath || undefined : undefined,
    });

    if (result.success) {
      setMessage({ type: "success", text: "Settings updated" });
      router.refresh();
    } else {
      setMessage({
        type: "error",
        text: result.error || "Failed to update settings",
      });
    }
  }

  async function handleE2EToggle() {
    if (!user?.username) return;

    const newValue = !e2eEncryptionOnTransfer;
    setE2eEncryptionOnTransfer(newValue);
    await updateUserPreferences(user.username, {
      e2eEncryptionOnTransfer: newValue,
    });
    router.refresh();
  }

  async function handleRegenerateEncryptionKey() {
    if (!user?.username) return;

    const confirmed = confirm(
      "Warning: Regenerating your encryption key will affect path encryption and any stored encrypted passwords. Continue?"
    );
    if (!confirmed) return;

    setRegeneratingKey(true);
    setMessage(null);

    const result = await regenerateEncryptionKey();

    if (result.success && result.encryptionKey) {
      setEncryptionKey(result.encryptionKey);
      setShowEncryptionKey(true);
      setMessage({
        type: "success",
        text: "Encryption key regenerated successfully",
      });
      router.refresh();
    } else {
      setMessage({
        type: "error",
        text: result.error || "Failed to regenerate encryption key",
      });
    }

    setRegeneratingKey(false);
  }

  if (!user) {
    return (
      <div className="p-8">
        <p className="text-on-surface-variant">
          Please log in to manage encryption keys.
        </p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="p-8">
        <p className="text-on-surface-variant">Loading...</p>
      </div>
    );
  }

  return (
    <div className="lg:p-8 space-y-8">
      {message && (
        <div
          className={`p-4 rounded-lg ${
            message.type === "success"
              ? "bg-success-container text-on-success-container"
              : "bg-error-container text-on-error-container"
          }`}
        >
          {message.text}
        </div>
      )}

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-on-surface">
          Path Encryption Key
        </h2>

        <div className="p-6 bg-surface-container rounded-lg space-y-4">
          <div className="space-y-2">
            <p className="text-sm text-on-surface-variant">
              This key is used to encrypt folder paths in URLs and for
              encrypting stored passwords. It is unique to your account.
            </p>
            {encryptionKey && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-on-surface">
                    Encryption Key:
                  </label>
                  <button
                    type="button"
                    onClick={() => setShowEncryptionKey(!showEncryptionKey)}
                    className="text-sm text-primary hover:underline"
                  >
                    {showEncryptionKey ? "Hide" : "Show"}
                  </button>
                </div>
                <code className="block text-xs bg-surface p-2 rounded font-mono break-all">
                  {showEncryptionKey
                    ? encryptionKey
                    : "•".repeat(encryptionKey.length)}
                </code>
              </div>
            )}
            {!encryptionKey && (
              <p className="text-sm text-on-surface-variant">
                No encryption key found. One will be generated automatically on
                next login.
              </p>
            )}
          </div>

          <div>
            <Button
              variant="outlined"
              onClick={handleRegenerateEncryptionKey}
              disabled={regeneratingKey}
            >
              {regeneratingKey ? "Regenerating..." : "Regenerate Key"}
            </Button>
            <p className="text-xs text-on-surface-variant mt-2">
              Regenerating your encryption key will affect all encrypted paths
              and stored passwords.
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-on-surface">
          Key Pair Management
        </h2>

        {hasKeys && keyInfo ? (
          <div className="space-y-4">
            <div className="p-6 bg-surface-container rounded-lg space-y-3">
              <div className="flex items-center gap-2 text-success">
                <Icon icon="check_circle" />
                <span className="font-semibold">Keys configured</span>
              </div>
              <div className="space-y-2 text-sm text-on-surface-variant">
                <div>
                  <span className="font-semibold">Email:</span> {keyInfo.email}
                </div>
                <div>
                  <span className="font-semibold">Created:</span>{" "}
                  {new Date(keyInfo.created).toLocaleDateString()}
                </div>
                <div>
                  <span className="font-semibold">Algorithm:</span>{" "}
                  {keyInfo.algorithm} {keyInfo.keySize}-bit
                </div>
                <div>
                  <span className="font-semibold">Fingerprint:</span>
                  <code className="block mt-1 text-xs bg-surface p-2 rounded font-mono break-all">
                    {keyInfo.fingerprint}
                  </code>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button variant="filled" onClick={handleExportPublicKey}>
                Export Public Key
              </Button>
              <Button variant="outlined" onClick={handleExportPrivateKey}>
                Export Private Key
              </Button>
              <Button
                variant="outlined"
                onClick={handleDeleteKeys}
                disabled={deleting}
                className="!text-error hover:!bg-error-container"
              >
                {deleting ? "Deleting..." : "Delete Keys"}
              </Button>
            </div>

            <div className="p-6 bg-surface-container rounded-lg space-y-4">
              <h3 className="text-lg font-semibold text-on-surface">
                Transfer Encryption during file upload
              </h3>
              <Switch
                id="e2e-encryption"
                checked={e2eEncryptionOnTransfer}
                onChange={handleE2EToggle}
                label="Enable Transfer Encryption"
                description="Files will be encrypted on your browser before upload and decrypted on the server. This ensures your files remain encrypted during transfer."
              />
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="p-6 bg-surface-container rounded-lg">
              <div className="flex items-center gap-2 text-on-surface-variant mb-4">
                <Icon icon="info" />
                <span>No keys found</span>
              </div>
              <p className="text-sm text-on-surface-variant mb-4">
                Generate a new key pair to start encrypting and decrypting
                files.
              </p>
            </div>

            {!showImportForm && (
              <form onSubmit={handleGenerateKeys} className="space-y-4">
                <Input
                  type="email"
                  label="Email (optional)"
                  value={generateEmail}
                  onChange={(e) => setGenerateEmail(e.target.value)}
                  placeholder={`${user.username}@scatola.magica`}
                  disabled={generating}
                />

                <div>
                  <label className="block text-sm font-medium text-on-surface mb-2">
                    Key Size
                  </label>
                  <select
                    value={keySize}
                    onChange={(e) => setKeySize(Number(e.target.value))}
                    disabled={generating}
                    className="w-full px-2.5 py-1.5 min-h-[40px] text-sm rounded-lg bg-surface-container text-on-surface focus:outline-none disabled:opacity-50"
                  >
                    <option value={2048}>2048-bit (Faster)</option>
                    <option value={4096}>4096-bit (More Secure)</option>
                  </select>
                </div>

                <Input
                  type="password"
                  label="Password"
                  value={generatePassword}
                  onChange={(e) => {
                    setGeneratePassword(e.target.value);
                    setGenerateError("");
                  }}
                  required
                  disabled={generating}
                  helperText="Minimum 8 characters. This password protects your private key."
                  error={
                    generateError && !generatePasswordConfirm
                      ? generateError
                      : undefined
                  }
                />

                <Input
                  type="password"
                  label="Confirm Password"
                  value={generatePasswordConfirm}
                  onChange={(e) => {
                    setGeneratePasswordConfirm(e.target.value);
                    setGenerateError("");
                  }}
                  required
                  disabled={generating}
                  error={
                    generateError &&
                    generatePassword === generatePasswordConfirm
                      ? undefined
                      : generateError
                  }
                />

                <div className="flex gap-3">
                  <Button type="submit" variant="filled" disabled={generating}>
                    {generating ? "Generating..." : "Generate Key Pair"}
                  </Button>
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={() => setShowImportForm(true)}
                    disabled={generating}
                  >
                    Import Existing Keys
                  </Button>
                </div>
              </form>
            )}

            {showImportForm && (
              <form onSubmit={handleImportKeys} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-on-surface mb-2">
                    Public Key (ASCII Armored)
                  </label>
                  <textarea
                    value={importPublicKey}
                    onChange={(e) => {
                      setImportPublicKey(e.target.value);
                      setImportError("");
                    }}
                    required
                    rows={6}
                    disabled={importing}
                    placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----"
                    className="w-full px-2.5 py-1.5 text-sm rounded-lg bg-surface-container text-on-surface focus:outline-none disabled:opacity-50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-on-surface mb-2">
                    Private Key (ASCII Armored)
                  </label>
                  <textarea
                    value={importPrivateKey}
                    onChange={(e) => {
                      setImportPrivateKey(e.target.value);
                      setImportError("");
                    }}
                    required
                    rows={6}
                    disabled={importing}
                    placeholder="-----BEGIN PGP PRIVATE KEY BLOCK-----"
                    className="w-full px-2.5 py-1.5 text-sm rounded-lg bg-surface-container text-on-surface focus:outline-none disabled:opacity-50 font-mono"
                  />
                </div>

                <Input
                  type="password"
                  label="Private Key Password"
                  value={importPassword}
                  onChange={(e) => {
                    setImportPassword(e.target.value);
                    setImportError("");
                  }}
                  required
                  disabled={importing}
                  error={importError}
                />

                <div className="flex gap-3">
                  <Button type="submit" variant="filled" disabled={importing}>
                    {importing ? "Importing..." : "Import Keys"}
                  </Button>
                  <Button
                    type="button"
                    variant="outlined"
                    onClick={() => setShowImportForm(false)}
                    disabled={importing}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <h2 className="text-2xl font-bold text-on-surface">
          Key Storage Location
        </h2>

        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input
              type="radio"
              id="default-path"
              checked={!useCustomPath}
              onChange={() => setUseCustomPath(false)}
              className="w-4 h-4"
            />
            <label
              htmlFor="default-path"
              className="text-on-surface cursor-pointer"
            >
              Default (data/config/keys)
            </label>
          </div>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <input
                type="radio"
                id="custom-path"
                checked={useCustomPath}
                onChange={() => setUseCustomPath(true)}
                className="w-4 h-4"
              />
              <label
                htmlFor="custom-path"
                className="text-on-surface cursor-pointer"
              >
                Custom location
              </label>
            </div>

            {useCustomPath && (
              <div className="ml-7 space-y-2">
                <Input
                  type="text"
                  value={customPath}
                  onChange={(e) => setCustomPath(e.target.value)}
                  placeholder="/path/to/keys"
                />
                <Button variant="filled" onClick={handleUpdateCustomPath}>
                  Save Path
                </Button>
              </div>
            )}
          </div>

          {!useCustomPath && customKeysPath && (
            <Button variant="filled" onClick={handleUpdateCustomPath}>
              Save Path
            </Button>
          )}

          <div className="p-4 bg-warning-container text-on-warning-container rounded-lg flex gap-3">
            <Icon icon="warning" />
            <div className="text-sm">
              <p className="font-semibold mb-1">Important:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>
                  Custom paths must be writable and persistent across sessions
                </li>
                <li>Changing the path will not move existing keys</li>
                <li>
                  You will need to regenerate or import keys for the new
                  location
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
