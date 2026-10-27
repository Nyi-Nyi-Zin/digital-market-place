"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./ui/select";
import { useI18n } from "./I18nProvider";

export function ListToolbar({
  search,
  placeholder,
  onSearch,
  sort,
  sortOptions,
  onSort,
  filters,
  active,
  onClear,
  maxLength = 200,
}: {
  search: string;
  placeholder: string;
  onSearch: (value: string) => void;
  sort: string;
  sortOptions: { value: string; label: string }[];
  onSort: (value: string) => void;
  filters: ReactNode;
  active: boolean;
  onClear: () => void;
  maxLength?: number;
}) {
  const { t } = useI18n();
  return (
    <div className="admin-toolbar">
      <label className="admin-list-search">
        <span className="sr-only">{t("Search")}</span>
        <Search size={17} aria-hidden="true" />
        <Input
          type="search"
          value={search}
          maxLength={maxLength}
          placeholder={placeholder}
          onChange={event => onSearch(event.target.value)}
        />
      </label>
      <div className="admin-toolbar-actions">
        <Select value={sort} onValueChange={onSort}>
          <SelectTrigger className="admin-sort-trigger" aria-label={t("Sort")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            position="popper"
            align="end"
            className="admin-sort-menu"
          >
            {sortOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.label)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {filters}
        {active && (
          <Button
            type="button"
            variant="brand"
            size="brand"
            className="button button-ghost"
            onClick={onClear}
          >
            {t("Clear all")}
          </Button>
        )}
      </div>
    </div>
  );
}
