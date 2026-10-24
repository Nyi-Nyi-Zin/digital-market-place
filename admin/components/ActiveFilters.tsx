"use client";

import { X } from "lucide-react";
import {
  activeAdminFilterKeys,
  type ActiveAdminFilter,
} from "@marketplace/shared/admin-list-state";
import {
  adminStatusLabels,
  type AdminFilters,
} from "@marketplace/shared/pagination";
import { useI18n } from "./I18nProvider";
import { Button } from "./ui/button";

export function ActiveFilters({
  search,
  filters,
  categories,
  products,
  onRemove,
}: {
  search: string;
  filters: AdminFilters;
  categories: { id: number; name: string }[];
  products: { id: number; title: string }[];
  onRemove: (key: ActiveAdminFilter) => void;
}) {
  const { t, intlLocale } = useI18n();
  const keys = activeAdminFilterKeys(search, filters);
  if (!keys.length) return null;
  const range = (from: string, to: string) =>
    `${from || t("No minimum")} — ${to || t("No maximum")}`;
  const date = (value: string) =>
    value
      ? new Intl.DateTimeFormat(intlLocale, {
          dateStyle: "short",
          timeStyle: "short",
        }).format(new Date(value))
      : "";
  const labels: Record<ActiveAdminFilter, string> = {
    query: `${t("Search")}: ${search}`,
    status: `${t("Status")}: ${t(adminStatusLabels[filters.status] ?? filters.status)}`,
    created: `${t("Created time")}: ${range(date(filters.createdFrom), date(filters.createdTo))}`,
    value: `${t("Value range")}: ${range(filters.minValue, filters.maxValue)}`,
    categoryId: `${t("Category")}: ${categories.find(item => String(item.id) === filters.categoryId)?.name ?? `#${filters.categoryId}`}`,
    productId: `${t("Product")}: ${products.find(item => String(item.id) === filters.productId)?.title ?? `#${filters.productId}`}`,
    featured: `${t("Featured")}: ${t(filters.featured === "yes" ? "Yes" : "No")}`,
    discount: `${t("Discount")}: ${t(filters.discount === "discounted" ? "Discounted" : "Regular price")}`,
    paymentMethod: `${t("Payment method")}: ${filters.paymentMethod}`,
  };
  return (
    <div
      className="admin-filter-chips"
      role="group"
      aria-label={t("Applied filters")}
    >
      {keys.map(key => (
        <Button
          key={key}
          type="button"
          variant="brand"
          size="brand"
          className="admin-filter-chip"
          title={labels[key]}
          aria-label={t("Remove filter: {name}", { name: labels[key] })}
          onClick={event => {
            const sibling =
              event.currentTarget.nextElementSibling ??
              event.currentTarget.previousElementSibling;
            const target =
              sibling instanceof HTMLElement
                ? sibling
                : document.querySelector<HTMLButtonElement>(
                    ".admin-toolbar button"
                  );
            onRemove(key);
            target?.focus();
          }}
        >
          <span>{labels[key]}</span>
          <X size={14} aria-hidden="true" />
        </Button>
      ))}
    </div>
  );
}
