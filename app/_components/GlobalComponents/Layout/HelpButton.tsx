"use client";

import { useState } from "react";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";
import HelpModal from "@/app/_components/FeatureComponents/Modals/HelpModal";

export default function HelpButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <IconButton icon="help" onClick={() => setIsOpen(true)} />
      <HelpModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
