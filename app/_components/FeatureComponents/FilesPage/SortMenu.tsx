"use client";

import { useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SortBy } from "@/app/_types/enums";
import DropdownMenu from "@/app/_components/GlobalComponents/Form/DropdownMenu";
import Icon from "@/app/_components/GlobalComponents/Icons/Icon";

const sortOptions = [
  { value: SortBy.DATE_DESC, label: "Newest" },
  { value: SortBy.DATE_ASC, label: "Oldest" },
  { value: SortBy.NAME_ASC, label: "A-Z" },
  { value: SortBy.NAME_DESC, label: "Z-A" },
  { value: SortBy.SIZE_DESC, label: "Largest" },
  { value: SortBy.SIZE_ASC, label: "Smallest" },
];

export default function SortMenu() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentSort =
    (searchParams.get("sortBy") as SortBy) || SortBy.DATE_DESC;
  const currentLabel =
    sortOptions.find((opt) => opt.value === currentSort)?.label || "Newest";

  const handleSort = (sortBy: SortBy) => {
    startTransition(() => {
      const params = new URLSearchParams(searchParams);
      params.set("sortBy", sortBy);
      params.delete("page");
      router.push(`/files?${params.toString()}`);
    });
  };

  const triggerElement = (
    <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-surface-container text-on-surface hover:bg-surface-variant transition-colors h-[50px]">
      <Icon icon="sort" size="sm" />
      <span className="text-sm font-medium">{currentLabel}</span>
      <Icon icon="expand_more" size="sm" />
    </button>
  );

  return (
    <DropdownMenu
      triggerElement={triggerElement}
      items={sortOptions.map((option) => ({
        label: option.label,
        onClick: () => handleSort(option.value),
        isActive: currentSort === option.value,
      }))}
    />
  );
}
