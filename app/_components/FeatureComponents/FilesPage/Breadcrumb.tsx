import Link from "next/link";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";

interface BreadcrumbItem {
  id: string;
  name: string;
}

interface BreadcrumbProps {
  breadcrumbs: BreadcrumbItem[];
}

export default function Breadcrumb({ breadcrumbs }: BreadcrumbProps) {
  if (breadcrumbs.length === 0) return null;

  return (
    <div className="flex items-center gap-1 mb-3 text-xs text-on-surface-variant flex-shrink-0 px-0 lg:px-2">
      <Link
        href="/files"
        className="hover:text-primary transition-colors leading-[0]"
      >
        <Icon icon="home" size="sm" className="text-on-surface-variant" />
      </Link>
      {breadcrumbs.map((folder, index) => (
        <span key={folder.id} className="flex items-center gap-1">
          <span className="material-symbols-outlined text-sm">
            chevron_right
          </span>
          {index === breadcrumbs.length - 1 ? (
            <span className="text-on-surface font-medium">{folder.name}</span>
          ) : (
            <Link
              href={`/files/${folder.id
                .split("/")
                .map(encodeURIComponent)
                .join("/")}`}
              className="hover:text-primary transition-colors"
            >
              {folder.name}
            </Link>
          )}
        </span>
      ))}
    </div>
  );
}
