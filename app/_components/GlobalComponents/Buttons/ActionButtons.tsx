"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";
import CreateFolderModal from "@/app/_components/FeatureComponents/Modals/CreateFolderModal";
import UploadEncryptionModal from "@/app/_components/FeatureComponents/Modals/UploadEncryptionModal";
import AddMagnetModal from "@/app/_components/FeatureComponents/Modals/AddMagnetModal";
import DropdownMenu, {
  DropdownMenuItem,
} from "@/app/_components/GlobalComponents/Form/DropdownMenu";
import { useClientEncryption } from "@/app/_hooks/useClientEncryption";
import { useUploadOverlay } from "@/app/_providers/UploadOverlayProvider";
import Progress from "@/app/_components/GlobalComponents/Layout/Progress";
import { addTorrent } from "@/app/_server/actions/manage-torrents";

interface ActionButtonsProps {
  onCreateFolder: (name: string, parentId?: string | null) => Promise<void>;
  onUpload: () => void;
  parentId?: string | null;
}

export default function ActionButtons({
  onCreateFolder,
  onUpload,
  parentId = null,
}: ActionButtonsProps) {
  const router = useRouter();
  const [isCreateFolderModalOpen, setIsCreateFolderModalOpen] = useState(false);
  const [isEncryptionModalOpen, setIsEncryptionModalOpen] = useState(false);
  const [isMagnetModalOpen, setIsMagnetModalOpen] = useState(false);
  const [encryptionConfig, setEncryptionConfig] = useState<{
    useOwnKey: boolean;
    customPublicKey?: string;
  } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const torrentFileInputRef = useRef<HTMLInputElement>(null);
  const { encryptFiles, isEncrypting } = useClientEncryption();
  const { openUploadWithFiles } = useUploadOverlay();

  const handleNormalUpload = () => {
    onUpload();
  };

  const handleEncryptedUpload = () => {
    setIsEncryptionModalOpen(true);
  };

  const handleEncryptionConfirm = (
    useOwnKey: boolean,
    customPublicKey?: string
  ) => {
    setEncryptionConfig({ useOwnKey, customPublicKey });
    fileInputRef.current?.click();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (encryptionConfig) {
      try {
        const encryptedFiles = await encryptFiles(
          files,
          encryptionConfig.useOwnKey,
          encryptionConfig.customPublicKey
        );

        const dataTransfer = new DataTransfer();
        encryptedFiles.forEach((file) => dataTransfer.items.add(file));

        openUploadWithFiles(dataTransfer.files, parentId);
      } catch (error) {
        console.error("Encryption failed:", error);
        alert(
          error instanceof Error ? error.message : "Failed to encrypt files"
        );
      } finally {
        setEncryptionConfig(null);
        e.target.value = "";
      }
    }
  };

  const handleTorrentUpload = () => {
    torrentFileInputRef.current?.click();
  };

  const handleTorrentFileSelect = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    try {
      const result = await addTorrent(
        uint8Array as any,
        undefined,
        parentId || undefined
      );

      if (result.success) {
        if (confirm("Torrent added successfully! View torrents page?")) {
          router.push("/torrents");
        }
      } else {
        alert(result.error || "Failed to add torrent");
      }
    } catch (error) {
      console.error("Error adding torrent:", error);
      alert("Failed to add torrent");
    } finally {
      e.target.value = "";
    }
  };

  const handleMagnetLink = () => {
    setIsMagnetModalOpen(true);
  };

  const uploadMenuItems: DropdownMenuItem[] = [
    {
      label: "Files",
      icon: "upload",
      onClick: handleNormalUpload,
    },
    {
      label: "Encrypted Files",
      icon: "lock",
      onClick: handleEncryptedUpload,
    },
    {
      label: "Torrent File",
      icon: "p2p",
      onClick: handleTorrentUpload,
    },
    {
      label: "Magnet Link",
      icon: "link",
      onClick: handleMagnetLink,
    },
  ];

  return (
    <>
      {isEncrypting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-surface rounded-lg shadow-xl p-8 flex flex-col items-center gap-4">
            <Progress
              variant="circular"
              size="lg"
              value={50}
              className="text-primary"
            />
            <p className="text-on-surface font-medium">Encrypting files...</p>
            <p className="text-sm text-on-surface-variant">
              Please wait while your files are encrypted
            </p>
          </div>
        </div>
      )}

      <div className="fixed bottom-6 right-6 items-center gap-2 z-30 medium:flex hidden">
        <IconButton
          icon="create_new_folder"
          onClick={() => setIsCreateFolderModalOpen(true)}
          title="New Folder"
          size="lg"
          className="bg-surface-container text-on-surface"
        />

        <DropdownMenu
          items={uploadMenuItems}
          position="top"
          triggerElement={
            <IconButton
              icon="add"
              title="Upload Options"
              size="lg"
              className="bg-primary text-on-primary"
              disabled={isEncrypting}
            />
          }
        />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />

      <input
        ref={torrentFileInputRef}
        type="file"
        accept=".torrent"
        onChange={handleTorrentFileSelect}
        className="hidden"
      />

      <CreateFolderModal
        isOpen={isCreateFolderModalOpen}
        onClose={() => setIsCreateFolderModalOpen(false)}
        onCreateFolder={onCreateFolder}
        currentFolderId={parentId}
      />

      <UploadEncryptionModal
        isOpen={isEncryptionModalOpen}
        onClose={() => setIsEncryptionModalOpen(false)}
        onConfirm={handleEncryptionConfirm}
      />

      <AddMagnetModal
        isOpen={isMagnetModalOpen}
        onClose={() => setIsMagnetModalOpen(false)}
        folderPath={parentId || undefined}
      />
    </>
  );
}
