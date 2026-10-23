"use client";
import { useI18n } from "./I18nProvider";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
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
    value ? <input key={name} type="hidden" name={name} value={value} /> : null
  );
}

export function CatalogueControls({ path, filters, categories }: Props) {
  const { t } = useI18n();
  const [draft, setDraft] = useState(filters);
  const activeCount = [
    filters.category,
    filters.minPrice,
    filters.maxPrice,
    Number(filters.minRating) > 0 ? filters.minRating : undefined,
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
        <input
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
        <button
          type="submit"
          className="search-submit"
          aria-label={t("Search products")}
        >
          <Search size={18} aria-hidden="true" />
        </button>
      </form>
      <Dialog.Root
        onOpenChange={open => {
          if (open) setDraft(filters);
        }}
      >
        <Dialog.Trigger className="button button-secondary catalogue-filter-trigger">
          <SlidersHorizontal size={18} aria-hidden="true" />
          {t("Filters")}{" "}
          {activeCount > 0 ? (
            <span className="filter-active">{activeCount}</span>
          ) : null}
        </Dialog.Trigger>
        <Dialog.Portal>
          <Dialog.Overlay className="catalogue-modal-overlay" />
          <Dialog.Content className="catalogue-modal">
            <div className="catalogue-modal-heading">
              <div>
                <Dialog.Title>
                  {t("Find your next starting point")}
                </Dialog.Title>
                <Dialog.Description>
                  {t("Narrow the library down to what works for you.")}
                </Dialog.Description>
              </div>
              <Dialog.Close
                className="catalogue-modal-close"
                aria-label={t("Close filters")}
              >
                <X size={20} aria-hidden="true" />
              </Dialog.Close>
            </div>
            <form action={path}>
              <HiddenFilters
                filters={{ query: filters.query, sort: filters.sort }}
              />
              <div className="catalogue-modal-fields">
                <label>
                  {t("Collection")}
                  <select
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
                  </select>
                </label>
                <fieldset>
                  <legend>{t("Price range")}</legend>
                  <div className="catalogue-price-fields">
                    <label>
                      {t("Minimum price")}
                      <input
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
                      <input
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
                <fieldset>
                  <legend>{t("Minimum rating")}</legend>
                  <div className="catalogue-rating-options">
                    {[
                      ["0", t("Any rating")],
                      ["3", "3+ stars"],
                      ["4", "4+ stars"],
                    ].map(([value, label]) => (
                      <label key={value}>
                        <input
                          type="radio"
                          name="minRating"
                          value={value}
                          checked={(draft.minRating || "0") === value}
                          onChange={() =>
                            setDraft({ ...draft, minRating: value })
                          }
                        />
                        <span>{t(label)}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              </div>
              <div className="catalogue-modal-actions">
                <button
                  className="button button-secondary"
                  type="button"
                  onClick={() => setDraft({})}
                >
                  {t("Reset")}
                </button>
                <button className="button button-primary" type="submit">
                  {t("Show resources")}
                </button>
              </div>
            </form>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
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
        <select
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
        </select>
      </label>
    </form>
  );
}
