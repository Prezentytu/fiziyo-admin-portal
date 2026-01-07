"use client";

import { Badge } from "@/components/ui/badge";
import { SearchInput } from "@/components/shared/SearchInput";

type FilterType = "all" | "active" | "inactive" | "templates";

interface SetFiltersProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filter: FilterType;
  onFilterChange: (filter: FilterType) => void;
  resultCount: number;
  totalCount: number;
}

export function SetFilters({
  searchQuery,
  onSearchChange,
  filter,
  onFilterChange,
  resultCount,
  totalCount,
}: SetFiltersProps) {
  const filters: { value: FilterType; label: string }[] = [
    { value: "all", label: "Wszystkie" },
    { value: "active", label: "Aktywne" },
    { value: "templates", label: "Szablony" },
    { value: "inactive", label: "Nieaktywne" },
  ];

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex items-center gap-3 flex-1">
        <SearchInput
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Szukaj zestawów..."
          className="max-w-md"
        />
        <Badge variant="secondary" className="hidden sm:flex whitespace-nowrap">
          {resultCount} z {totalCount}
        </Badge>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {filters.map((f) => (
          <button
            key={f.value}
            onClick={() => onFilterChange(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border border-border/60 ${
              filter === f.value
                ? "bg-primary text-primary-foreground border-primary shadow-sm"
                : "bg-surface text-muted-foreground hover:bg-surface-light hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>
    </div>
  );
}















