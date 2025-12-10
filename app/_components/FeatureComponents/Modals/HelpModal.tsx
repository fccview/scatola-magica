"use client";

import { useState, useEffect } from "react";
import Modal from "@/app/_components/GlobalComponents/Layout/Modal";
import MarkdownRenderer from "@/app/_components/GlobalComponents/Markdown/MarkdownRenderer";
import { listHowtoFiles, getHowtoContent } from "@/app/_server/actions/howto";

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface HelpTab {
  id: string;
  title: string;
  file: string;
}

export default function HelpModal({ isOpen, onClose }: HelpModalProps) {
  const [tabs, setTabs] = useState<HelpTab[]>([]);
  const [activeTab, setActiveTab] = useState<string>("");
  const [content, setContent] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    listHowtoFiles().then((files) => {
      setTabs(files);
      if (files.length > 0 && !activeTab) {
        setActiveTab(files[0].id);
      }
    });
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !activeTab || tabs.length === 0) return;

    const currentTab = tabs.find((tab) => tab.id === activeTab);
    if (!currentTab) return;

    setIsLoading(true);
    getHowtoContent(currentTab.file)
      .then((text) => {
        setContent(text);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error("Failed to load help content:", err);
        setContent("Failed to load help content.");
        setIsLoading(false);
      });
  }, [isOpen, activeTab, tabs]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Help" size="lg">
      <div className="flex flex-col h-[70vh]">
        {tabs.length > 0 && (
          <div className="flex-shrink-0 border-b border-dashed border-outline-variant bg-surface">
            <div className="flex gap-1 px-4 overflow-x-auto">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-3 text-sm font-medium transition-colors whitespace-nowrap ${
                    activeTab === tab.id
                      ? "bg-surface-container text-on-surface"
                      : "text-on-surface-variant hover:bg-surface-variant hover:text-on-surface"
                  }`}
                >
                  {tab.title}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto min-h-0 p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="text-on-surface-variant">Loading...</div>
            </div>
          ) : (
            <MarkdownRenderer content={content} />
          )}
        </div>
      </div>
    </Modal>
  );
}
