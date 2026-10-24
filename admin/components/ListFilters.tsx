"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import {
  adminFilterQuery,
  adminListInput,
  adminStatusLabels,
  emptyAdminFilters,
  orderStatuses,
  paymentStatuses,
  productStatuses,
  adminPaymentMethods,
  type AdminFilters,
  type AdminListInput,
} from "@marketplace/shared/pagination";
import {
  activeAdminFilterKeys,
  detectQuickDate,
  quickDateLabels,
  quickDateRange,
  type QuickDate,
} from "@marketplace/shared/admin-list-state";
import { useI18n } from "./I18nProvider";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { NativeSelect } from "./ui/native-select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "./ui/dialog";

export function ListFilters({
  search,
  filters,
  section,
  placeholder,
  categories,
  products,
  onApply,
}: {
  search: string;
  filters: AdminFilters;
  section: AdminListInput["section"];
  placeholder: string;
  categories: { id: number; name: string }[];
  products: { id: number; title: string }[];
  onApply: (search: string, filters: AdminFilters) => void;
}) {
  const { t, intlLocale } = useI18n();
  const [open, setOpen] = useState(false);
  const [draftSearch, setDraftSearch] = useState(search);
  const [draft, setDraft] = useState(filters);
  const [error, setError] = useState("");
  const [datePreset, setDatePreset] = useState<QuickDate>("all");
  const statuses =
    section === "products"
      ? productStatuses
      : section === "orders"
        ? orderStatuses
        : section === "payments"
          ? paymentStatuses
          : [];
  const hasValue = ["products", "orders", "payments"].includes(section);
  const count = activeAdminFilterKeys(search, filters).length;
  const change = (key: keyof AdminFilters, value: string) => {
    setDraft(previous => ({ ...previous, [key]: value }));
    setError("");
    if (key === "createdFrom" || key === "createdTo") setDatePreset("custom");
  };

  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (next) {
          setDraftSearch(search);
          setDraft({ ...filters });
          setError("");
          setDatePreset(detectQuickDate(filters));
        }
        setOpen(next);
      }}
    >
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="brand"
          size="brand"
          className="button button-secondary"
        >
          <SlidersHorizontal size={17} aria-hidden="true" />
          {t("Filters")}
          {count > 0 && (
            <span className="filter-count">
              {count.toLocaleString(intlLocale)}
            </span>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent
        branded
        showCloseButton={false}
        overlayClassName="admin-filter-overlay"
        className="admin-filter-dialog"
      >
        <div className="admin-filter-heading">
          <div>
            <DialogTitle>{t("Filters")}</DialogTitle>
            <DialogDescription>
              {t("Refine the list, then apply your filters.")}
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button
              type="button"
              variant="brand"
              size="brand"
              className="icon-button"
              aria-label={t("Close filters")}
            >
              <X size={20} aria-hidden="true" />
            </Button>
          </DialogClose>
        </div>
        <form
          className="admin-form"
          onSubmit={event => {
            event.preventDefault();
            event.stopPropagation();
            try {
              const parsed = adminListInput.safeParse({
                section,
                query: draftSearch,
                ...adminFilterQuery(draft),
              });
              if (!parsed.success) {
                setError(t(parsed.error.issues[0].message));
                return;
              }
              onApply(draftSearch, { ...draft });
              setOpen(false);
            } catch {
              setError(t("Enter valid creation dates."));
            }
          }}
        >
          <div className="admin-filter-fields">
            <label>
              {t("Search")}
              <Input
                type="search"
                value={draftSearch}
                maxLength={200}
                placeholder={placeholder}
                onChange={event => setDraftSearch(event.target.value)}
              />
            </label>
            {statuses.length > 0 && (
              <label>
                {t("Status")}
                <NativeSelect
                  aria-label={t("Status")}
                  value={draft.status}
                  onChange={event => change("status", event.target.value)}
                >
                  <option value="all">{t("All statuses")}</option>
                  {draft.status !== "all" &&
                    !statuses.some(value => value === draft.status) && (
                      <option value={draft.status}>
                        {t("Payment status:")}{" "}
                        {t(adminStatusLabels[draft.status])}
                      </option>
                    )}
                  {statuses.map(value => (
                    <option key={value} value={value}>
                      {t(adminStatusLabels[value])}
                    </option>
                  ))}
                </NativeSelect>
              </label>
            )}
            {section === "products" && (
              <>
                <label>
                  {t("Category")}
                  <NativeSelect
                    aria-label={t("Category")}
                    value={draft.categoryId}
                    onChange={event => change("categoryId", event.target.value)}
                  >
                    <option value="">{t("All categories")}</option>
                    {categories.map(item => (
                      <option key={item.id} value={String(item.id)}>
                        {item.name}
                      </option>
                    ))}
                  </NativeSelect>
                </label>
                <div className="admin-filter-range">
                  <label>
                    {t("Featured")}
                    <NativeSelect
                      aria-label={t("Featured")}
                      value={draft.featured}
                      onChange={event => change("featured", event.target.value)}
                    >
                      <option value="all">{t("All")}</option>
                      <option value="yes">{t("Yes")}</option>
                      <option value="no">{t("No")}</option>
                    </NativeSelect>
                  </label>
                  <label>
                    {t("Discount")}
                    <NativeSelect
                      aria-label={t("Discount")}
                      value={draft.discount}
                      onChange={event => change("discount", event.target.value)}
                    >
                      <option value="all">{t("All")}</option>
                      <option value="discounted">{t("Discounted")}</option>
                      <option value="regular">{t("Regular price")}</option>
                    </NativeSelect>
                  </label>
                </div>
              </>
            )}
            {section === "orders" && (
              <label>
                {t("Product")}
                <NativeSelect
                  aria-label={t("Product")}
                  value={draft.productId}
                  onChange={event => change("productId", event.target.value)}
                >
                  <option value="">{t("All products")}</option>
                  {products.map(item => (
                    <option key={item.id} value={String(item.id)}>
                      {item.title}
                    </option>
                  ))}
                </NativeSelect>
              </label>
            )}
            {section === "payments" && (
              <label>
                {t("Payment method")}
                <NativeSelect
                  aria-label={t("Payment method")}
                  value={draft.paymentMethod}
                  onChange={event =>
                    change("paymentMethod", event.target.value)
                  }
                >
                  <option value="all">{t("All payment methods")}</option>
                  {adminPaymentMethods.map(method => (
                    <option key={method} value={method}>
                      {method}
                    </option>
                  ))}
                </NativeSelect>
              </label>
            )}
            <fieldset className="admin-filter-group">
              <legend>{t("Created time")}</legend>
              <label className="admin-quick-dates">
                {t("Date range")}
                <NativeSelect
                  aria-label={t("Date range")}
                  value={datePreset}
                  onChange={event => {
                    const preset = event.target.value as QuickDate;
                    setDatePreset(preset);
                    setError("");
                    if (preset !== "custom")
                      setDraft(previous => ({
                        ...previous,
                        ...quickDateRange(preset),
                      }));
                  }}
                >
                  {(Object.keys(quickDateLabels) as QuickDate[]).map(value => (
                    <option key={value} value={value}>
                      {t(quickDateLabels[value])}
                    </option>
                  ))}
                </NativeSelect>
              </label>
              <div className="admin-filter-range">
                <label>
                  {t("Created from")}
                  <Input
                    type="datetime-local"
                    step="1"
                    value={draft.createdFrom}
                    max={draft.createdTo || undefined}
                    onChange={event =>
                      change("createdFrom", event.target.value)
                    }
                  />
                </label>
                <label>
                  {t("Created until")}
                  <Input
                    type="datetime-local"
                    step="1"
                    value={draft.createdTo}
                    min={draft.createdFrom || undefined}
                    onChange={event => change("createdTo", event.target.value)}
                  />
                </label>
              </div>
              <p className="admin-filter-hint">
                {t("Times use your device timezone.")}
              </p>
            </fieldset>
            {hasValue && (
              <fieldset className="admin-filter-group">
                <legend>
                  {t(section === "products" ? "Price range" : "Amount range")}
                </legend>
                <div className="admin-filter-range">
                  <label>
                    {t("Minimum value")}
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min="0"
                      max="99999999.99"
                      value={draft.minValue}
                      placeholder={t("No minimum")}
                      onChange={event => change("minValue", event.target.value)}
                    />
                  </label>
                  <label>
                    {t("Maximum value")}
                    <Input
                      type="number"
                      inputMode="decimal"
                      step="0.01"
                      min={draft.minValue || "0"}
                      max="99999999.99"
                      value={draft.maxValue}
                      placeholder={t("No maximum")}
                      onChange={event => change("maxValue", event.target.value)}
                    />
                  </label>
                </div>
              </fieldset>
            )}
            {error && (
              <p className="field-error" role="alert">
                {error}
              </p>
            )}
          </div>
          <div className="admin-filter-actions">
            <Button
              type="button"
              variant="brand"
              size="brand"
              className="button button-secondary"
              onClick={() => {
                setDraftSearch("");
                setDraft({ ...emptyAdminFilters });
                setError("");
                setDatePreset("all");
              }}
            >
              {t("Reset")}
            </Button>
            <Button
              type="submit"
              variant="brand"
              size="brand"
              className="button button-primary"
            >
              {t("Apply filters")}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
