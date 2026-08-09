"use client";

import { Search } from "lucide-react";

type SearchBarProps = {
  value: string;
  onChange: (v: string) => void;
};

export function SearchBar({ value, onChange }: SearchBarProps) {
  return (
    <div className="px-3 py-2.5">
      <div className="group relative flex items-center">
        <Search
          size={16}
          className="absolute left-3 text-muted/70 group-focus-within:text-accent transition-colors pointer-events-none"
        />
        <input
          data-testid="search-input"
          type="text"
          placeholder="Search notes..."
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full pl-9 pr-3 py-2 rounded-md text-[15px] md:text-sm outline-none bg-surface-hover/50 hover:bg-surface-hover focus:bg-surface border border-transparent focus:border-border text-text transition-all placeholder:text-muted/50"
        />
      </div>
    </div>
  );
}