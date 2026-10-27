"use client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";

import { Button } from "./ui/button";

import { Input } from "./ui/input";

import { useI18n } from "./I18nProvider";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { usePricing } from "./CurrencyProvider";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "./ui/dialog";
import { Search, SlidersHorizontal, X } from "lucide-react";
import {
  catalogueSortOptions,
  catalogueHref,
  type CatalogueFilters,
} from "@marketplace/shared/catalogue-filters";

type Props = {
  path: string;
  filters: CatalogueFilters;
  categories: { id: number; name: string }[];
};

function HiddenFilters({ filters }: { filters: CatalogueFilters }) {
  return Object.entries(filters).map(([name, value]) =>
    value &&
    name !== "minRating" &&
    !(name === "sort" && value === "rating") ? (
      <input key={name} type="hidden" name={name} value={value} />
    ) : null
  );
}

export function CatalogueControls({ path, filters, categories }: Props) {
  const { t } = useI18n();
  const { currency } = usePricing();
  const [draft, setDraft] = useState(filters);
  const activeCount = [
    filters.category,
    filters.minPrice,
    filters.maxPrice,
  ].filter(Boolean).length;

  return (
    <div className="catalogue-toolbar">
      <form
        action={path}
        role="search"
        aria-label={t("Find digital products")}
        className="catalogue-search"
        autoComplete="off"
      >
        <Search size={20} aria-hidden="true" />
        <Input
          id="library-search"
          key={filters.query ?? ""}
          aria-label={t("Search the library")}
          name="query"
          type="search"
          autoComplete="off"
          defaultValue={filters.query}
          placeholder={t("Search UI kits, templates, code and more…")}
        />
        <HiddenFilters
          filters={{ ...filters, query: undefined, page: undefined }}
        />
        <Button
          variant="brand"
          size="brand"
          type="submit"
          className="search-submit"
          aria-label={t("Search products")}
        >
          {t("Search")}
        </Button>
      </form>
      <Dialog
        onOpenChange={open => {
          if (open) setDraft(filters);
        }}
      >
        <DialogTrigger className="button button-secondary catalogue-filter-trigger">
          <SlidersHorizontal size={18} aria-hidden="true" />
          {t("Filters")}{" "}
          {activeCount > 0 ? (
            <span className="filter-active">{activeCount}</span>
          ) : null}
        </DialogTrigger>
        <DialogContent
          branded
          showCloseButton={false}
          overlayClassName="catalogue-modal-overlay"
          className="catalogue-modal"
        >
          <div className="catalogue-modal-heading">
            <div>
              <DialogTitle>{t("Find your next starting point")}</DialogTitle>
              <DialogDescription>
                {t("Narrow the library down to what works for you.")}
              </DialogDescription>
            </div>
            <DialogClose
              className="catalogue-modal-close"
              aria-label={t("Close filters")}
            >
              <X size={20} aria-hidden="true" />
            </DialogClose>
          </div>
          <form action={path}>
            <HiddenFilters
              filters={{ query: filters.query, sort: filters.sort }}
            />
            <div className="catalogue-modal-fields">
              <label>
                {t("Collection")}
                <input
                  type="hidden"
                  name="category"
                  value={draft.category ?? ""}
                />
                <Select
                  value={draft.category || "all"}
                  onValueChange={value =>
                    setDraft({
                      ...draft,
                      category: value === "all" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger
                    className="catalogue-select"
                    aria-label={t("Collection")}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    position="popper"
                    className="catalogue-select-menu"
                  >
                    <SelectItem value="all">{t("All collections")}</SelectItem>
                    {categories.map(category => (
                      <SelectItem key={category.id} value={category.name}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              <fieldset>
                <legend>
                  {t("Price range")} ({currency})
                </legend>
                <div className="catalogue-price-fields">
                  <label>
                    {t("Minimum price")}
                    <span className="catalogue-price-input">
                      <span aria-hidden="true">
                        {currency === "MMK"
                          ? "K"
                          : currency === "SGD"
                            ? "S$"
                            : "$"}
                      </span>
                      <Input
                        name="minPrice"
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder={t("No minimum")}
                        value={draft.minPrice ?? ""}
                        onChange={event =>
                          setDraft({ ...draft, minPrice: event.target.value })
                        }
                      />
                    </span>
                  </label>
                  <label>
                    {t("Maximum price")}
                    <span className="catalogue-price-input">
                      <span aria-hidden="true">
                        {currency === "MMK"
                          ? "K"
                          : currency === "SGD"
                            ? "S$"
                            : "$"}
                      </span>
                      <Input
                        name="maxPrice"
                        type="number"
                        min={draft.minPrice || "0"}
                        step="0.01"
                        placeholder={t("No maximum")}
                        value={draft.maxPrice ?? ""}
                        onChange={event =>
                          setDraft({ ...draft, maxPrice: event.target.value })
                        }
                      />
                    </span>
                  </label>
                </div>
              </fieldset>
            </div>
            <div className="catalogue-modal-actions">
              <Button
                variant="brand"
                size="brand"
                className="button button-secondary"
                type="button"
                onClick={() => setDraft({})}
              >
                {t("Reset")}
              </Button>
              <Button
                variant="brand"
                size="brand"
                className="button button-primary"
                type="submit"
              >
                {t("Show resources")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function CatalogueSort({ path, filters }: Omit<Props, "categories">) {
  const { t } = useI18n();
  const router = useRouter();
  return (
    <form action={path} className="catalogue-sort">
      <HiddenFilters
        filters={{ ...filters, sort: undefined, page: undefined }}
      />
      <label className="flex items-center gap-2.5 whitespace-nowrap">
        <span>{t("Sort by")}</span>
        <Select
          name="sort"
          value={filters.sort ?? "newest"}
          onValueChange={sort =>
            router.push(catalogueHref(path, filters, { sort, page: undefined }))
          }
        >
          <SelectTrigger className="catalogue-select" aria-label={t("Sort by")}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent
            position="popper"
            align="end"
            className="catalogue-select-menu"
          >
            {catalogueSortOptions.map(([value, title]) => (
              <SelectItem value={value} key={value}>
                {t(title)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </label>
    </form>
  );
}
