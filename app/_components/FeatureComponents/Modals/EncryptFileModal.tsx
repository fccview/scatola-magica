"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/app/_components/GlobalComponents/Layout/Modal";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";
import Switch from "@/app/_components/GlobalComponents/Form/Switch";
import RadioGroup from "@/app/_components/GlobalComponents/Form/RadioGroup";
import Progress from "@/app/_components/GlobalComponents/Layout/Progress";
import { getKeyStatus } from "@/app/_server/actions/pgp";

interface EncryptFileModalProps {
  isOpen: boolean;
  onClose: () => void;
  fileName: string;
  fileId: string;
  onEncrypt: (
    deleteOriginal: boolean,
    customPublicKey?: string
  ) => Promise<void>;
}

export default function EncryptFileModal({
  isOpen,
  onClose,
  fileName,
  onEncrypt,
}: EncryptFileModalProps) {
  const router = useRouter();
  const [deleteOriginal, setDeleteOriginal] = useState(false);
  const [useOwnKey, setUseOwnKey] = useState(true);
  const [customPublicKey, setCustomPublicKey] = useState("");
  const [hasOwnKeys, setHasOwnKeys] = useState(false);
  const [encrypting, setEncrypting] = useState(false);
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

  async function handleEncrypt() {
    if (!useOwnKey && !customPublicKey.trim()) {
      setError("Please provide a custom public key");
      return;
    }

    setEncrypting(true);
    setError(null);

    try {
      await onEncrypt(deleteOriginal, useOwnKey ? undefined : customPublicKey);
      router.refresh();
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to encrypt file");
    } finally {
      setEncrypting(false);
    }
  }

  function handleClose() {
    if (!encrypting) {
      setError(null);
      setDeleteOriginal(false);
      setCustomPublicKey("");
      setUseOwnKey(true);
      onClose();
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Encrypt File" size="md">
      <div className="p-6 space-y-4">
        {error && (
          <div className="p-4 bg-error-container text-on-error-container rounded-lg flex items-center gap-2">
            <Icon icon="error" />
            <span>{error}</span>
          </div>
        )}

        {encrypting ? (
          <div className="flex flex-col items-center justify-center py-8 gap-4">
            <Progress
              variant="circular"
              size="lg"
              value={50}
              className="text-primary"
            />
            <p className="text-sm text-on-surface-variant">
              Encrypting file...
            </p>
          </div>
        ) : (
          <>
            <div>
              <p className="text-sm text-on-surface-variant mb-4">
                Encrypt{" "}
                <span className="font-semibold text-on-surface">
                  {fileName}
                </span>{" "}
                using PGP encryption?
              </p>
              <p className="text-sm text-on-surface-variant">
                The encrypted file will be saved as{" "}
                <span className="font-semibold text-on-surface">
                  {fileName}.gpg
                </span>
              </p>
            </div>

            <RadioGroup
              options={[
                ...(hasOwnKeys
                  ? [
                      {
                        value: "own",
                        label: "Use my public key",
                        description:
                          "Encrypt with your PGP public key. Only you can decrypt.",
                      },
                    ]
                  : []),
                {
                  value: "custom",
                  label: "Use a custom public key",
                  description:
                    "Encrypt for someone else by providing their public key.",
                },
              ]}
              value={useOwnKey ? "own" : "custom"}
              onChange={(value) => setUseOwnKey(value === "own")}
              disabled={encrypting}
            />

            {!useOwnKey && (
              <div>
                <label className="block text-sm font-medium text-on-surface mb-2">
                  Public Key (ASCII Armored)
                </label>
                <textarea
                  value={customPublicKey}
                  onChange={(e) => {
                    setCustomPublicKey(e.target.value);
                    setError(null);
                  }}
                  rows={8}
                  placeholder="-----BEGIN PGP PUBLIC KEY BLOCK-----"
                  className="w-full px-2.5 py-1.5 text-sm rounded-lg bg-surface-container text-on-surface focus:outline-none font-mono"
                />
              </div>
            )}

            <div className="p-4 bg-surface-container rounded-lg">
              <Switch
                checked={deleteOriginal}
                onChange={setDeleteOriginal}
                disabled={encrypting}
                label="Delete original file after encryption"
              />
            </div>

            {!hasOwnKeys && (
              <div className="p-4 bg-warning-container text-on-warning-container rounded-lg flex gap-3">
                <Icon icon="info" className="flex-shrink-0" />
                <p className="text-sm">
                  You don't have PGP keys. Generate them in Settings or provide
                  a custom public key.
                </p>
              </div>
            )}
          </>
        )}

        <div className="pt-2 flex gap-3 justify-end">
          <Button
            variant="outlined"
            onClick={handleClose}
            disabled={encrypting}
          >
            Cancel
          </Button>
          <Button
            variant="filled"
            onClick={handleEncrypt}
            disabled={encrypting || (!useOwnKey && !customPublicKey.trim())}
          >
            {encrypting ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                Encrypting...
              </>
            ) : (
              <>
                <Icon icon="lock" size="sm" />
                Encrypt
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
