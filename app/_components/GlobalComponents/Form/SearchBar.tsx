"use client";

import { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import IconButton from "@/app/_components/GlobalComponents/Buttons/IconButton";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";

export default function SearchBar() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [search, setSearch] = useState(searchParams.get("search") || "");

  const handleSearch = (value: string) => {
    setSearch(value);

    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      if (value) {
        params.set("search", value);
      } else {
        params.delete("search");
      }
      params.delete("page");
      router.push(`/files?${params.toString()}`);
    });
  };

  const handleClear = () => {
    setSearch("");
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.delete("search");
      params.delete("page");
      router.push(`/files?${params.toString()}`);
    });
  };

  return (
    <div className="relative">
      <div className="flex items-center gap-2 bg-surface-container rounded-full px-4 py-2 h-[50px]">
        <Icon icon="search" size="md" className="text-on-surface-variant" />
        <input
          id="files-search-input"
          type="text"
          value={search}
          onChange={(e) => handleSearch(e.target.value)}
          placeholder="Search files..."
          className="flex-1 bg-transparent outline-none text-on-surface placeholder:text-on-surface-variant"
        />
        {search && <IconButton icon="close" size="sm" onClick={handleClear} />}
      </div>
      {isPending && (
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
