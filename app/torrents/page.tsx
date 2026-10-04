import { Suspense } from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import TorrentsPageClient from "@/app/_components/FeatureComponents/TorrentsPage/TorrentsPageClient";
import LogoLoader from "@/app/_components/GlobalComponents/Layout/LogoLoader";
import { getCurrentUser } from "@/app/_lib/current-user";
import { getUserPreferences } from "@/app/_lib/preferences-store";

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
        <LogoLoader className="h-screen bg-surface" />
      }
    >
      <TorrentsPageClient />
    </Suspense>
  );
}
