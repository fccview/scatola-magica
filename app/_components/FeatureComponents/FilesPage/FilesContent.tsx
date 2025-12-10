import { cookies } from "next/headers";
import { getFiles } from "@/app/_server/actions/files";
import { getFolders, getFolderPath } from "@/app/_server/actions/folders";
import { readUsers } from "@/app/_server/actions/user";
import { SortBy } from "@/app/_types/enums";
import FileListClient from "@/app/_components/GlobalComponents/Files/FileListClient";
import Breadcrumb from "@/app/_components/FeatureComponents/FilesPage/Breadcrumb";
import SearchAndSortBar from "@/app/_components/FeatureComponents/FilesPage/SearchAndSortBar";
import EmptyState from "@/app/_components/FeatureComponents/FilesPage/EmptyState";
import { decryptPath } from "@/app/_lib/path-encryption";

interface PageProps {
  params: Promise<{ folder?: string[] }>;
  searchParams: Promise<{
    search?: string;
    sortBy?: SortBy;
  }>;
}

export default async function FilesContent({
  params,
  searchParams,
}: PageProps) {
  const { folder } = await params;
  const searchParamsResolved = await searchParams;

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

  const search = searchParamsResolved.search || "";
  const sortBy = searchParamsResolved.sortBy || SortBy.DATE_DESC;

  const cookieStore = await cookies();
  const recursive = cookieStore.get("recursive-view")?.value === "true";

  const [filesResult, foldersResult, breadcrumbResult] = await Promise.all([
    getFiles({
      page: 1,
      pageSize: 15,
      search,
      sortBy,
      folderPath,
      recursive,
    }),
    getFolders(folderPath || null),
    folderPath
      ? getFolderPath(folderPath)
      : Promise.resolve({ success: true, data: [] }),
  ]);

  let allUsers: any[] = [];
  try {
    allUsers = await readUsers();
  } catch (error) {
    console.error("Failed to read users:", error);
    allUsers = [];
  }

  if (!filesResult.success || !filesResult.data) {
    return (
      <div className="text-center py-16">
        <p className="text-error">Failed to load files</p>
      </div>
    );
  }

  let folders =
    foldersResult.success && foldersResult.data ? foldersResult.data : [];

  if (search) {
    const searchLower = search.toLowerCase();
    folders = folders.filter((folder) =>
      folder.name.toLowerCase().includes(searchLower)
    );
  }

  const usernames = new Set(allUsers.map((u) => u.username.toLowerCase()));

  folders.sort((a, b) => {
    const aIsUserFolder =
      usernames.has(a.name.toLowerCase()) ||
      a.id.split("/").some((part) => usernames.has(part.toLowerCase()));
    const bIsUserFolder =
      usernames.has(b.name.toLowerCase()) ||
      b.id.split("/").some((part) => usernames.has(part.toLowerCase()));

    if (aIsUserFolder && !bIsUserFolder) return -1;
    if (!aIsUserFolder && bIsUserFolder) return 1;

    if (aIsUserFolder && bIsUserFolder) {
      return a.name.localeCompare(b.name);
    }

    return a.name.localeCompare(b.name);
  });
  const breadcrumbs =
    breadcrumbResult.success && breadcrumbResult.data
      ? breadcrumbResult.data
      : [];

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <Breadcrumb breadcrumbs={breadcrumbs} />
      <SearchAndSortBar />

      <div className="flex-1 flex flex-col min-h-0">
        {filesResult.data.items.length > 0 || folders.length > 0 ? (
          <FileListClient
            files={filesResult.data.items}
            folders={folders}
            initialRecursive={recursive}
            folderPath={folderPath}
            search={search}
            sortBy={sortBy}
            hasMore={filesResult.data.hasMore}
            total={filesResult.data.total}
            allUsers={allUsers}
          />
        ) : (
          <EmptyState />
        )}
      </div>
    </div>
  );
}



