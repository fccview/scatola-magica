import { Suspense } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import TorrentsPageClient from "@/app/_components/FeatureComponents/TorrentsPage/TorrentsPageClient";
import Progress from "@/app/_components/GlobalComponents/Layout/Progress";
import { getCurrentUser } from "@/app/_server/actions/user";
import { getUserPreferences } from "@/app/_lib/preferences";

export const metadata: Metadata = {
  title: "Torrents - Scatola Magica",
  description: "Manage your torrent downloads and seeding",
};

export default async function TorrentsPage() {
  const user = await getCurrentUser();
  if (!user) {
    notFound();
  }

  const preferences = await getUserPreferences(user.username);
  if (!preferences?.torrentPreferences?.enabled) {
    notFound();
  }

  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-surface">
          <Progress variant="circular" size="lg" value={50} />
        </div>
      }
    >
      <TorrentsPageClient />
    </Suspense>
  );
}
