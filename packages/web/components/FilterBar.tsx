"use client";

import { useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { EntryType, ENTRY_TYPE_LABELS } from "@/lib/types";
import { useSearchParams } from "next/navigation";

interface FilterBarProps {
  search: string;
  action: string;
  type: EntryType | "";
  list: string;
  listNumbers: number[];
  onSearch: (v: string) => void;
  onAction: (v: string) => void;
  onType: (v: string) => void;
  onList: (v: string) => void;
}

function useDebounce(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export function FilterBar({
  search, action, type, list, listNumbers,
  onSearch, onAction, onType, onList,
}: FilterBarProps) {
  const [searchInput, setSearchInput] = useState(search);
  const [actionInput, setActionInput] = useState(action);
  const debouncedSearch = useDebounce(searchInput);
  const debouncedAction = useDebounce(actionInput);
  const searchParams = useSearchParams();

  const prevSearch = useRef(search);
  const prevAction = useRef(action);

  useEffect(() => {
    if (debouncedSearch !== prevSearch.current) {
      prevSearch.current = debouncedSearch;
      onSearch(debouncedSearch);
    }
  }, [debouncedSearch, onSearch]);

  useEffect(() => {
    if (debouncedAction !== prevAction.current) {
      prevAction.current = debouncedAction;
      onAction(debouncedAction);
    }
  }, [debouncedAction, onAction]);

  function handleExport() {
    window.location.href = `/api/drugs/export?${searchParams.toString()}`;
  }

  const hasFilters = search || action || type || list;

  return (
    <div className="flex flex-wrap gap-3 items-center">
      <Input
        placeholder="Search INN name or CAS..."
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
        className="w-56"
      />
      <Input
        placeholder="Filter by action/use..."
        value={actionInput}
        onChange={(e) => setActionInput(e.target.value)}
        className="w-52"
      />
      <Select value={type || "all"} onValueChange={(v) => onType(v === "all" ? "" : v)}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All types" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All types</SelectItem>
          {(Object.entries(ENTRY_TYPE_LABELS) as [EntryType, string][]).map(([k, v]) => (
            <SelectItem key={k} value={k}>{v}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select value={list || "all"} onValueChange={(v) => onList(v === "all" ? "" : v)}>
        <SelectTrigger className="w-36">
          <SelectValue placeholder="All lists" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All lists</SelectItem>
          {listNumbers.map((n) => (
            <SelectItem key={n} value={String(n)}>List {n}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="ml-auto flex gap-2">
        {hasFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearchInput("");
              setActionInput("");
              onSearch(""); onAction(""); onType(""); onList("");
            }}
          >
            Clear
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={handleExport}>
          Export CSV
        </Button>
      </div>
    </div>
  );
}
