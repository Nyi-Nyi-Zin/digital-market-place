"use client";
import { NativeSelect } from "./ui/native-select";

import { Button } from "./ui/button";

import { Input } from "./ui/input";

import { useI18n } from "./I18nProvider";

import { useState } from "react";
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
          <Search size={18} aria-hidden="true" />
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
                <NativeSelect
                  name="category"
                  aria-label={t("Collection")}
                  value={draft.category ?? ""}
                  onChange={event =>
                    setDraft({ ...draft, category: event.target.value })
                  }
                >
                  <option value="">{t("All collections")}</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.name}>
                      {category.name}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <fieldset>
                <legend>{t("Price range")}</legend>
                <div className="catalogue-price-fields">
                  <label>
                    {t("Minimum price")}
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
                  </label>
                  <label>
                    {t("Maximum price")}
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
  return (
    <form action={path} className="catalogue-sort">
      <HiddenFilters
        filters={{ ...filters, sort: undefined, page: undefined }}
      />
      <label>
        <span>{t("Sort by")}</span>
        <NativeSelect
          name="sort"
          aria-label={t("Sort by")}
          key={filters.sort ?? "newest"}
          defaultValue={filters.sort ?? "newest"}
          onChange={event => event.currentTarget.form?.requestSubmit()}
        >
          {catalogueSortOptions.map(([value, title]) => (
            <option value={value} key={value}>
              {t(title)}
            </option>
          ))}
        </NativeSelect>
      </label>
    </form>
  );
}
