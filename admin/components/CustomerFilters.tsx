"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type { CustomerListInput } from "@marketplace/shared/customer-filters";
import { useI18n } from "./I18nProvider";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "./ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./ui/select";

type History = CustomerListInput["orderHistory"];
export function CustomerFilters({
  value,
  onApply,
}: {
  value: History;
  onApply: (value: History) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  return (
    <Dialog
      open={open}
      onOpenChange={next => {
        if (next) setDraft(value);
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
          {value !== "all" && <span className="filter-count">1</span>}
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
            onApply(draft);
            setOpen(false);
          }}
        >
          <div className="admin-filter-fields">
            <label>
              {t("Purchase history")}
              <Select
                value={draft}
                onValueChange={value => setDraft(value as History)}
              >
                <SelectTrigger
                  aria-label={t("Purchase history")}
                  className="admin-sort-trigger"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent position="popper" className="admin-sort-menu">
                  <SelectItem value="all">{t("All customers")}</SelectItem>
                  <SelectItem value="with_orders">
                    {t("With orders")}
                  </SelectItem>
                  <SelectItem value="without_orders">
                    {t("Without orders")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </label>
          </div>
          <div className="admin-filter-actions">
            <Button
              type="button"
              variant="brand"
              size="brand"
              className="button button-secondary"
              onClick={() => setDraft("all")}
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
