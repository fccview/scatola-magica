"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Modal from "@/app/_components/GlobalComponents/Layout/Modal";
import TorrentDropZone from "@/app/_components/FeatureComponents/UploadPage/TorrentDropZone";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import Checkbox from "@/app/_components/GlobalComponents/Form/Checkbox";
import FolderTreeDropdown from "@/app/_components/GlobalComponents/Folders/FolderTreeDropdown";
import { addTorrent } from "@/app/_server/actions/manage-torrents";
import {
    fetchTorrentMetadata,
    TorrentMetadataInfo,
} from "@/app/_lib/torrents/torrent-metadata";

interface AddTorrentModalProps {
    isOpen: boolean;
    onClose: () => void;
    initialFolderPath?: string | null;
    initialTorrentFile?: File;
}

type UploadStage = "input" | "metadata" | "uploading" | "success";

const AddTorrentModal = ({
    isOpen,
    onClose,
    initialFolderPath = null,
    initialTorrentFile,
}: AddTorrentModalProps) => {
    const router = useRouter();

    const [stage, setStage] = useState<UploadStage>("input");

    const [torrentFile, setTorrentFile] = useState<File | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const [isLoading, setIsLoading] = useState(false);
    const [loadingStatus, setLoadingStatus] = useState("");
    const [error, setError] = useState<string | null>(null);

    const [metadata, setMetadata] = useState<TorrentMetadataInfo | null>(null);
    const [selectedFiles, setSelectedFiles] = useState<Set<number>>(new Set());
    const [selectedFolder, setSelectedFolder] = useState<string | null>(
        initialFolderPath
    );

    const torrentFileInputRef = useRef<HTMLInputElement>(null);
    const previousIsOpen = useRef(false);

    const resetState = useCallback(() => {
        setStage("input");
        setTorrentFile(null);
        setIsDragging(false);
        setIsLoading(false);
        setLoadingStatus("");
        setError(null);
        setMetadata(null);
        setSelectedFiles(new Set());
        setSelectedFolder(initialFolderPath);
    }, [initialFolderPath]);

    useEffect(() => {
        if (isOpen && !previousIsOpen.current) {
            if (initialTorrentFile) {
                setTorrentFile(initialTorrentFile);
            }
            previousIsOpen.current = true;
        } else if (!isOpen) {
            previousIsOpen.current = false;
            resetState();
        }
    }, [isOpen, initialTorrentFile, resetState]);

    useEffect(() => {
        if (
            isOpen &&
            initialTorrentFile &&
            !metadata &&
            !isLoading &&
            stage === "input"
        ) {
            handleFetchMetadata();
        }
    }, [isOpen, initialTorrentFile]);

    const handleDragEnter = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(true);
    }, []);

    const handleDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDragLeave = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.currentTarget === e.target) {
            setIsDragging(false);
        }
    }, []);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);

        const files = Array.from(e.dataTransfer.files);
        const torrentFiles = files.filter((f) => f.name.endsWith(".torrent"));

        if (torrentFiles.length > 0) {
            handleTorrentFileSelect(torrentFiles[0]);
        } else {
            setError("Please drop a .torrent file");
        }
    }, []);

    const handleTorrentFileSelect = (file: File) => {
        if (!file.name.endsWith(".torrent")) {
            setError("Please select a .torrent file");
            return;
        }
        setTorrentFile(file);
        setError(null);
    };

    const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            handleTorrentFileSelect(file);
        }
    };

    const handleFetchMetadata = async () => {
        if (!torrentFile) {
            setError("Please select a .torrent file");
            return;
        }

        setIsLoading(true);
        setError(null);
        setLoadingStatus("Reading torrent file...");

        try {
            await new Promise((resolve) => setTimeout(resolve, 300));
            setLoadingStatus("Parsing metadata...");

            const buffer = await torrentFile.arrayBuffer();
            const uint8Array = new Uint8Array(buffer);
            const result = await fetchTorrentMetadata(uint8Array);

            if (result.success && result.data) {
                setLoadingStatus("Metadata received!");
                await new Promise((resolve) => setTimeout(resolve, 300));

                setMetadata(result.data);
                const allFiles = new Set(result.data.files.map((_, i) => i));
                setSelectedFiles(allFiles);
                setStage("metadata");
                setLoadingStatus("");
            } else {
                setError(result.error || "Failed to parse torrent file");
                setLoadingStatus("");
            }
        } catch (err) {
            console.error("Error parsing torrent:", err);
            setError("Failed to parse torrent file");
            setLoadingStatus("");
        } finally {
            setIsLoading(false);
        }
    };

    const toggleFileSelection = (index: number) => {
        const newSelected = new Set(selectedFiles);
        if (newSelected.has(index)) {
            newSelected.delete(index);
        } else {
            newSelected.add(index);
        }
        setSelectedFiles(newSelected);
    };

    const selectAll = () => {
        if (!metadata) return;
        setSelectedFiles(new Set(metadata.files.map((_, i) => i)));
    };

    const deselectAll = () => {
        setSelectedFiles(new Set());
    };

    const handleAddTorrent = async () => {
        if (!metadata || !torrentFile) return;

        setStage("uploading");
        setIsLoading(true);
        setError(null);

        try {
            const buffer = await torrentFile.arrayBuffer();
            const uint8Array = new Uint8Array(buffer);
            const result = await addTorrent(
                uint8Array,
                undefined,
                selectedFolder || undefined
            );

            if (result.success) {
                setStage("success");
                setTimeout(() => {
                    onClose();
                }, 2000);
            } else {
                setError(result.error || "Failed to add torrent");
                setStage("metadata");
            }
        } catch (err) {
            console.error("Error adding torrent:", err);
            setError("Failed to add torrent");
            setStage("metadata");
        } finally {
            setIsLoading(false);
        }
    };

    const handleBack = () => {
        if (stage === "metadata") {
            setStage("input");
            setMetadata(null);
            setSelectedFiles(new Set());
            setError(null);
        }
    };

    const handleClose = () => {
        if (isLoading && stage === "uploading") return;
        onClose();
    };

    const formatBytes = (bytes: number): string => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB", "TB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
    };

    const getHeaderActions = () => {
        switch (stage) {
            case "input":
                return (
                    <>
                        <Button onClick={handleClose} variant="outlined" disabled={isLoading}>
                            Cancel
                        </Button>
                        <Button
                            onClick={handleFetchMetadata}
                            variant="filled"
                            disabled={isLoading || !torrentFile}
                        >
                            {isLoading ? "Loading..." : "Next"}
                        </Button>
                    </>
                );

            case "metadata":
                return (
                    <>
                        <Button onClick={handleBack} variant="outlined" disabled={isLoading}>
                            Back
                        </Button>
                        <Button
                            onClick={handleAddTorrent}
                            variant="filled"
                            disabled={isLoading || selectedFiles.size === 0}
                        >
                            {isLoading ? "Adding..." : `Download (${selectedFiles.size})`}
                        </Button>
                    </>
                );

            case "uploading":
                return (
                    <Button onClick={() => { }} variant="filled" disabled>
                        Adding...
                    </Button>
                );

            case "success":
                return (
                    <Button onClick={() => router.push("/torrents")} variant="filled">
                        View Torrents
                    </Button>
                );
        }
    };

    const getTitle = () => {
        switch (stage) {
            case "input":
                return "Add Torrent File";
            case "metadata":
                return "Select Files to Download";
            case "uploading":
                return "Adding Torrent";
            case "success":
                return "Torrent Added";
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={getTitle()}
            size="lg"
            headerActions={getHeaderActions()}
        >
            <div className="p-6 flex flex-col gap-6">
                {stage === "success" && (
                    <div className="flex flex-col items-center gap-4 py-8">
                        <div className="w-16 h-16 rounded-full bg-success-container flex items-center justify-center">
                            <span className="material-symbols-outlined text-on-success-container text-4xl">
                                check_circle
                            </span>
                        </div>
                        <div className="text-center">
                            <h3 className="text-lg font-medium text-on-surface mb-1">
                                Torrent Added Successfully!
                            </h3>
                            <p className="text-sm text-on-surface-variant">
                                Your torrent has been added to the download queue
                            </p>
                        </div>
                        <Button
                            variant="text"
                            onClick={() => router.push("/torrents")}
                            className="underline"
                        >
                            View Torrents →
                        </Button>
                    </div>
                )}

                {stage === "uploading" && (
                    <div className="flex flex-col items-center gap-4 py-8">
                        <span className="material-symbols-outlined text-primary text-6xl animate-spin">
                            progress_activity
                        </span>
                        <p className="text-on-surface font-medium">Adding torrent...</p>
                    </div>
                )}

                {stage === "input" && (
                    <>
                        <TorrentDropZone
                            isDragging={isDragging}
                            onDragEnter={handleDragEnter}
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onFileSelect={() => torrentFileInputRef.current?.click()}
                            disabled={false}
                            selectedFile={torrentFile}
                        />

                        <input
                            ref={torrentFileInputRef}
                            type="file"
                            accept=".torrent"
                            onChange={handleFileInputChange}
                            className="hidden"
                        />

                        {loadingStatus && (
                            <div className="flex items-center gap-3 p-3 bg-surface-container rounded">
                                <span className="material-symbols-outlined text-primary animate-spin">
                                    progress_activity
                                </span>
                                <span className="text-sm text-on-surface">{loadingStatus}</span>
                            </div>
                        )}
                    </>
                )}

                {stage === "metadata" && metadata && (
                    <>
                        <div className="p-4 bg-surface-container rounded-lg">
                            <div className="flex items-start gap-3">
                                <span className="material-symbols-outlined text-primary text-2xl">
                                    folder_zip
                                </span>
                                <div className="flex-1">
                                    <div className="text-base font-medium text-on-surface mb-1">
                                        {metadata.name}
                                    </div>
                                    <div className="text-sm text-on-surface-variant">
                                        {formatBytes(metadata.size)} • {metadata.files.length} file
                                        {metadata.files.length !== 1 ? "s" : ""}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-on-surface mb-2">
                                Download Location
                            </label>
                            <div className="p-3 bg-surface-container rounded-lg max-h-60 overflow-y-auto">
                                <FolderTreeDropdown
                                    selectedFolderId={selectedFolder}
                                    onFolderSelect={setSelectedFolder}
                                />
                            </div>
                        </div>

                        <div>
                            <div className="flex items-center justify-between mb-3">
                                <label className="text-sm font-medium text-on-surface">
                                    Select Files
                                </label>
                                <div className="flex gap-2">
                                    <Button variant="filled" onClick={selectAll} size="sm">
                                        All
                                    </Button>
                                    <Button variant="outlined" onClick={deselectAll} size="sm">
                                        None
                                    </Button>
                                </div>
                            </div>

                            <div className="space-y-2 max-h-96 overflow-y-auto">
                                {metadata.files.map((file, index) => (
                                    <Checkbox
                                        key={index}
                                        checked={selectedFiles.has(index)}
                                        onChange={() => toggleFileSelection(index)}
                                        label={file.path}
                                        description={formatBytes(file.length)}
                                    />
                                ))}
                            </div>

                            <div className="text-xs text-on-surface-variant mt-3">
                                {selectedFiles.size} of {metadata.files.length} selected
                            </div>
                        </div>
                    </>
                )}

                {error && (
                    <div className="flex items-center gap-2 text-sm text-error bg-error-container p-3 rounded">
                        <span className="material-symbols-outlined">error</span>
                        <span>{error}</span>
                    </div>
                )}
            </div>
        </Modal>
    );
};

export default AddTorrentModal;