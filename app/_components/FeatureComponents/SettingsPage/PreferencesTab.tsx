"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateUserPreferences } from "@/app/_lib/preferences";
import { usePreferences } from "@/app/_providers/PreferencesProvider";
import Switch from "@/app/_components/GlobalComponents/Form/Switch";

export default function PreferencesTab() {
  const router = useRouter();
  const {
    particlesEnabled: initialParticles,
    wandCursorEnabled: initialWand,
    user,
  } = usePreferences();

  if (!user) {
    return null;
  }

  const [particlesEnabled, setParticlesEnabled] = useState(initialParticles);
  const [wandCursorEnabled, setWandCursorEnabled] = useState(initialWand);

  const handleParticlesToggle = async () => {
    const newValue = !particlesEnabled;
    setParticlesEnabled(newValue);
    await updateUserPreferences(user?.username ?? "", {
      particlesEnabled: newValue,
    });
    router.refresh();
  };

  const handleWandCursorToggle = async () => {
    const newValue = !wandCursorEnabled;
    setWandCursorEnabled(newValue);
    await updateUserPreferences(user?.username ?? "", {
      wandCursorEnabled: newValue,
    });
    router.refresh();
  };

  return (
    <div className="space-y-12">
      <div>
        <h2 className="text-xl font-medium text-on-surface mb-6">Home Page</h2>
        <div className="space-y-6">
          <Switch
            id="particles"
            checked={particlesEnabled}
            onChange={handleParticlesToggle}
            label="Particle Animation"
            description="Show animated particles on the home page"
          />

          <Switch
            id="wand-cursor"
            checked={wandCursorEnabled}
            onChange={handleWandCursorToggle}
            label="Magic Wand Cursor"
            description="Show magic wand cursor on the home page"
          />
        </div>
      </div>
    </div>
  );
}
