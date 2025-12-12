"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/app/_components/GlobalComponents/Layout/Modal";
import Input from "@/app/_components/GlobalComponents/Form/Input";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";
import Switch from "@/app/_components/GlobalComponents/Form/Switch";
import RadioGroup from "@/app/_components/GlobalComponents/Form/RadioGroup";
import Progress from "@/app/_components/GlobalComponents/Layout/Progress";
import { getKeyStatus } from "@/app/_server/actions/pgp";

interface DecryptFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  fileId: string;
  onDecrypt: (
    password: string,
    outputName: string,
    deleteEncrypted: boolean,
    customPrivateKey?: string
  ) => Promise<void>;
}

export default function DecryptFileModal({
  isOpen,
  onClose,
  fileName,
  onDecrypt,
}: DecryptFileModalProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [outputName, setOutputName] = useState(
    fileName.endsWith(".folder.gpg")
      ? fileName.slice(0, -11)
      : fileName.endsWith(".gpg")
      ? fileName.slice(0, -4)
      : fileName.replace(/\.gpg$/, "")
  );
  const [showPassword, setShowPassword] = useState(false);
  const [deleteEncrypted, setDeleteEncrypted] = useState(false);
  const [useOwnKey, setUseOwnKey] = useState(true);
  const [customPrivateKey, setCustomPrivateKey] = useState("");
  const [hasOwnKeys, setHasOwnKeys] = useState(false);
  const [decrypting, setDecrypting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      getKeyStatus().then((status) => {
        setHasOwnKeys(status.hasKeys);
        if (!status.hasKeys) {
          setUseOwnKey(false);
        }
      });
    }
  }, [isOpen]);

  async function handleDecrypt(e: React.FormEvent) {
    e.preventDefault();

    if (!password) {
      setError("Password is required");
      return;
    }

    if (!outputName) {
      setError("Output filename is required");
      return;
    }

    if (!useOwnKey && !customPrivateKey.trim()) {
      setError("Please provide a custom private key");
      return;
    }

    setDecrypting(true);
    setError(null);

    try {
      await onDecrypt(
        password,
        outputName,
        deleteEncrypted,
        useOwnKey ? undefined : customPrivateKey
      );
      router.refresh();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to decrypt file");
    } finally {
      setDecrypting(false);
    }
  }

  function handleClose() {
    if (!decrypting) {
      setPassword("");
      setError(null);
      setDeleteEncrypted(false);
      setCustomPrivateKey("");
      setUseOwnKey(true);
      onClose();
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Decrypt File" size="md">
      <form onSubmit={handleDecrypt} className="p-6 space-y-4">
        {error && (
          <div className="p-4 bg-error-container text-on-error-container rounded-lg flex items-center gap-2">
            <Icon icon="error" />
            <span>{error}</span>
          </div>
        )}

        {decrypting ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Progress
              variant="circular"
              size="lg"
              value={50}
              className="text-primary"
            />
            <p className="text-sm text-on-surface-variant">
              Decrypting file...
            </p>
          </div>
        ) : (
          <>
            <div>
              <p className="text-sm text-on-surface-variant mb-4">
                Decrypt{" "}
                <span className="font-semibold text-on-surface">
                  {fileName}
                </span>{" "}
                using PGP decryption.
              </p>
            </div>

            <Input
              label="Save as"
              type="text"
              value={outputName}
              onChange={(e) => setOutputName(e.target.value)}
              required
              disabled={decrypting}
            />

            <RadioGroup
              options={[
                ...(hasOwnKeys
                  ? [
                      {
                        value: "own",
                        label: "Use my private key",
                        description: "Decrypt with your PGP private key.",
                      },
                    ]
                  : []),
                {
                  value: "custom",
                  label: "Use a custom private key",
                  description: "Provide a custom private key for decryption.",
                },
              ]}
              value={useOwnKey ? "own" : "custom"}
              onChange={(value) => setUseOwnKey(value === "own")}
              disabled={decrypting}
            />

            {!useOwnKey && (
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  Private Key (ASCII Armored)
                </label>
                <textarea
                  value={customPrivateKey}
                  onChange={(e) => {
                    setCustomPrivateKey(e.target.value);
                    setError(null);
                  }}
                  rows={8}
                  placeholder="-----BEGIN PGP PRIVATE KEY BLOCK-----"
                  className="w-full px-2.5 py-1.5 text-sm rounded-lg bg-surface-container text-on-surface focus:outline-none font-mono"
                />
              </div>
            )}

            <div className="relative">
              <Input
                label="Private Key Password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={decrypting}
                placeholder="Enter your private key password"
                description="This is the password that protects your private key."
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                disabled={decrypting}
                className="absolute right-2 top-8 text-on-surface-variant hover:text-on-surface transition-colors disabled:opacity-50"
              >
                <Icon icon={showPassword ? "visibility_off" : "visibility"} />
              </button>
            </div>

            <div className="p-4 bg-surface-container rounded-lg">
              <Switch
                checked={deleteEncrypted}
                onChange={setDeleteEncrypted}
                disabled={decrypting}
                label="Delete encrypted file after decryption"
              />
            </div>

            {!hasOwnKeys && (
              <div className="p-4 bg-warning-container text-on-warning-container rounded-lg flex gap-3">
                <Icon icon="info" className="flex-shrink-0" />
                <p className="text-sm">
                  You don't have PGP keys. Generate them in Settings or provide
                  a custom private key.
                </p>
              </div>
            )}

            <div className="p-4 bg-info-container text-on-info-container rounded-lg flex gap-3">
              <Icon icon="info" className="flex-shrink-0" />
              <p className="text-sm">
                Your password is used to unlock your private key and is never
                stored or transmitted.
              </p>
            </div>
          </>
        )}

        <div className="pt-2 flex gap-3 justify-end">
          <Button
            type="button"
            variant="outlined"
            onClick={handleClose}
            disabled={decrypting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="filled"
            disabled={
              decrypting ||
              !password ||
              (!useOwnKey && !customPrivateKey.trim())
            }
          >
            {decrypting ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Decrypting...
              </>
            ) : (
              <>
                <Icon icon="lock_open" size="sm" />
                Decrypt
              </>
            )}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
