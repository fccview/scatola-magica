import SearchBar from "@/app/_components/GlobalComponents/Form/SearchBar";
import SortMenu from "@/app/_components/FeatureComponents/FilesPage/SortMenu";

export default function SearchAndSortBar() {
  return (
    <div className="flex gap-2 mb-3 compact:flex-row flex-col flex-shrink-0">
      <div className="flex-1">
        <SearchBar />
      </div>
      <SortMenu />
    </div>
  );
}
