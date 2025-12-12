import { Suspense } from "react";
import { Metadata } from "next";
import TorrentsPageClient from "@/app/_components/FeatureComponents/TorrentsPage/TorrentsPageClient";
import Progress from "@/app/_components/GlobalComponents/Layout/Progress";

export const metadata: Metadata = {
  title: "Torrents - Scatola Magica",
  description: "Manage your torrent downloads and seeding",
};

export default function TorrentsPage() {
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
