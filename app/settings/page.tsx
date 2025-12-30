import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/_server/actions/user";
import SettingsPage from "@/app/_components/FeatureComponents/SettingsPage/SettingsPage";
import Progress from "@/app/_components/GlobalComponents/Layout/Progress";

export default async function Settings() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/auth/login");
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-surface">
          <Progress variant="circular" size="lg" value={50} />
        </div>
      }
    >
      <SettingsPage />
    </Suspense>
  );
}
