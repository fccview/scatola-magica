import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/_lib/current-user";
import SettingsPage from "@/app/_components/FeatureComponents/SettingsPage/SettingsPage";
import LogoLoader from "@/app/_components/GlobalComponents/Layout/LogoLoader";

export default async function SettingsTab() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/auth/login");
  }

  return (
    <Suspense
      fallback={
        <LogoLoader className="h-screen bg-surface" />
      }
    >
      <SettingsPage />
    </Suspense>
  );
}
