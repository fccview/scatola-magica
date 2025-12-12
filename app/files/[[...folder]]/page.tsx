import { Suspense } from "react";
import { SortBy } from "@/app/_types/enums";
import Header from "@/app/_components/GlobalComponents/Layout/Header";
import Progress from "@/app/_components/GlobalComponents/Layout/Progress";
import FolderTreeSidebar from "@/app/_components/GlobalComponents/Folders/FolderTreeSidebar";
import FilesPageClient from "@/app/_components/FeatureComponents/FilesPage/FilesPageClient";
import FilesContent from "@/app/_components/FeatureComponents/FilesPage/FilesContent";
import FilesPageWrapper from "@/app/_components/GlobalComponents/Files/FilesPageWrapper";
import MobileSidebarWrapper from "@/app/_components/FeatureComponents/FilesPage/MobileSidebarWrapper";
import { SidebarProvider } from "@/app/_providers/SidebarProvider";
import FilesPageBorderWrapper from "@/app/_components/GlobalComponents/Files/FilesPageBorderWrapper";
import { decryptPath } from "@/app/_lib/path-encryption";

interface PageProps {
  params: Promise<{ folder?: string[] }>;
  searchParams: Promise<{
    search?: string;
    sortBy?: SortBy;
  }>;
}

export default async function FilesPage(props: PageProps) {
  const { folder } = await props.params;

  let folderPath = "";
  if (folder && folder.length > 0) {
    const decodedSegments = folder.map(decodeURIComponent);
    const joinedPath = decodedSegments.join("/");

    const decrypted = await decryptPath(joinedPath);

    if (decrypted !== joinedPath || folder.length === 1) {
      folderPath = decrypted;
    } else {
      folderPath = joinedPath;
    }
  }

  return (
    <FilesPageBorderWrapper>
      <SidebarProvider>
        <FilesPageWrapper folderPath={folderPath}>
          <div className="flex-shrink-0">
            <Header showFilesButton={false} />
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
