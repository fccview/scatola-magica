import { redirect } from "next/navigation";
import { getCurrentUser } from "@/app/actions/auth";
import SettingsPage from "@/app/_components/FeatureComponents/SettingsPage/SettingsPage";

export default async function Settings() {
  const currentUser = await getCurrentUser();

  if (!currentUser) {
    redirect("/auth/login");
  }

  return <SettingsPage />;
}
