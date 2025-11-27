"use client";

import { useEffect, useState } from "react";
import Button from "@/app/_components/GlobalComponents/Buttons/Button";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "pwa-install-dismissed";

export default function PWAInstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] =
        useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        if (typeof window === "undefined") return;

        const checkIfInstalled = () => {
            if (
                window.matchMedia("(display-mode: standalone)").matches ||
                (window.navigator as Navigator & { standalone?: boolean }).standalone
            ) {
                setIsInstalled(true);
                return true;
            }
            return false;
        };

        if (checkIfInstalled()) return;

        const wasDismissed = localStorage.getItem(DISMISSED_KEY) === "true";
        if (wasDismissed) return;

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setShowPrompt(true);
        };

        const handleAppInstalled = () => {
            setIsInstalled(true);
            setShowPrompt(false);
            setDeferredPrompt(null);
            localStorage.removeItem(DISMISSED_KEY);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        window.addEventListener("appinstalled", handleAppInstalled);

        return () => {
            window.removeEventListener(
                "beforeinstallprompt",
                handleBeforeInstallPrompt
            );
            window.removeEventListener("appinstalled", handleAppInstalled);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === "accepted") {
            setShowPrompt(false);
            setDeferredPrompt(null);
        }
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem(DISMISSED_KEY, "true");
    };

    if (isInstalled || !showPrompt || !deferredPrompt) {
        return null;
    }

    return (
        <div className="fixed bottom-4 left-4 right-4 medium:left-auto medium:right-4 medium:max-w-md z-50">
            <div className="bg-surface-container p-4 rounded-lg shadow-lg border border-dashed border-outline-variant flex items-center gap-3">
                <Icon icon="download" className="text-primary" size="md" />
                <div className="flex-1">
                    <p className="text-sm font-medium text-on-surface">
                        Install Scatola Magica
                    </p>
                    <p className="text-xs text-on-surface-variant">
                        Add to your home screen.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="text"
                        size="sm"
                        onClick={handleDismiss}
                        className="text-on-surface-variant"
                    >
                        Later
                    </Button>
                    <Button variant="filled" size="sm" onClick={handleInstallClick}>
                        Install
                    </Button>
                </div>
            </div>
        </div>
    );
}

