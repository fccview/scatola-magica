import { Metadata } from "next";
import TorrentsPageClient from "@/app/_components/FeatureComponents/TorrentsPage/TorrentsPageClient";

export const metadata: Metadata = {
  title: "Torrents - Scatola Magica",
  description: "Manage your torrent downloads and seeding",
};

export default function TorrentsPage() {
  return <TorrentsPageClient />;
}
