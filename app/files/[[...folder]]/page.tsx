import Link from "next/link";
import { Suspense } from "react";
import { SortBy } from "@/app/_types/enums";
import TopAppBar from "@/app/_components/GlobalComponents/Layout/TopAppBar";
import ThemeToggle from "@/app/_components/GlobalComponents/Layout/ThemeToggle";
import UserMenu from "@/app/_components/FeatureComponents/User/UserMenu";
import Logo from "@/app/_components/GlobalComponents/Layout/Logo";
import Progress from "@/app/_components/GlobalComponents/Layout/Progress";
import FolderTreeSidebar from "@/app/_components/GlobalComponents/Folders/FolderTreeSidebar";
import FilesPageClient from "@/app/_components/FeatureComponents/FilesPage/FilesPageClient";
import FilesContent from "@/app/_components/FeatureComponents/FilesPage/FilesContent";
import FilesPageWrapper from "@/app/_components/GlobalComponents/Files/FilesPageWrapper";
import MobileSidebarWrapper from "@/app/_components/FeatureComponents/FilesPage/MobileSidebarWrapper";
import { SidebarProvider } from "@/app/_providers/SidebarProvider";
import { getCurrentUser } from "@/app/actions/auth";
import FilesPageBorderWrapper from "@/app/_components/GlobalComponents/Files/FilesPageBorderWrapper";

interface PageProps {
  params: Promise<{ folder?: string[] }>;
  searchParams: Promise<{
    search?: string;
    sortBy?: SortBy;
  }>;
}

export default async function FilesPage(props: PageProps) {
  const { folder } = await props.params;
  const folderPath = folder ? folder.map(decodeURIComponent).join("/") : "";
  const currentUser = await getCurrentUser();

  return (
    <FilesPageBorderWrapper>
      <SidebarProvider>
        <FilesPageWrapper folderPath={folderPath}>
          <div className="flex-shrink-0">
            <TopAppBar
              leading={
                <Link
                  href="/"
                  className="flex items-center justify-center leading-[0] gap-2 pt-8 pb-2 -ml-4"
                >
                  <Logo className="w-16 h-16 lg:w-20 lg:h-20" hideBox={true} />
                </Link>
              }
              trailing={
                <div className="flex items-center gap-2">
                  <ThemeToggle />
                  <UserMenu />
                </div>
              }
            />
          </div>
          <div className="flex flex-1 overflow-hidden min-h-0">
            <MobileSidebarWrapper
              sidebar={<FolderTreeSidebar key="folder-tree" />}
            >
              <main className="flex-1 overflow-hidden flex flex-col min-h-0">
                <div className="flex-1 overflow-hidden flex flex-col min-h-0 p-4 lg:p-2 w-full pb-20 medium:pb-3 compact:pb-4">
                  <Suspense
                    fallback={
                      <div className="flex items-center justify-center py-16">
                        <Progress variant="circular" size="lg" value={50} />
                      </div>
                    }
                  >
                    <FilesPageClient currentFolderId={folderPath || null}>
                      <FilesContent
                        params={props.params}
                        searchParams={props.searchParams}
                      />
                    </FilesPageClient>
                  </Suspense>
                </div>
              </main>
            </MobileSidebarWrapper>
          </div>
        </FilesPageWrapper>
      </SidebarProvider>
    </FilesPageBorderWrapper>
  );
}
