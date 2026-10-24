"use client";

import { ChevronLeft, ChevronRight, Ellipsis } from "lucide-react";
import {
  paginationItems,
  type Pagination as PaginationData,
} from "@marketplace/shared/pagination";
import { Button } from "./ui/button";
import { useI18n } from "./I18nProvider";

export function Pagination({
  pagination,
  disabled,
  onPageChange,
}: {
  pagination: PaginationData;
  disabled: boolean;
  onPageChange: (page: number) => void;
}) {
  const { t, intlLocale } = useI18n();
  const { page } = pagination;
  const empty = pagination.total === 0;
  const pages = empty ? 0 : pagination.pages;
  const formatPage = (value: number) =>
    new Intl.NumberFormat(intlLocale).format(value);
  return (
    <nav className="admin-pagination" aria-label={t("Pagination")}>
      <p
        className="admin-pagination-summary"
        aria-live="polite"
        aria-atomic="true"
      >
        {t("Showing page {page} of {pages}")
          .split(/(\{page\}|\{pages\})/)
          .map((part, index) =>
            part === "{page}" || part === "{pages}" ? (
              <strong key={index}>
                {formatPage(part === "{page}" ? page : pages)}
              </strong>
            ) : (
              part
            )
          )}
      </p>
      <div className="admin-pagination-controls">
        <div className="admin-pagination-group admin-pagination-start">
          <Button
            variant="brand"
            size="brand"
            className="admin-pagination-button admin-pagination-edge"
            disabled={disabled || empty || page <= 1}
            onClick={() => onPageChange(1)}
          >
            {t("First")}
          </Button>
          <Button
            variant="brand"
            size="brand"
            className="admin-pagination-button admin-pagination-edge"
            disabled={disabled || empty || page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            <ChevronLeft size={16} aria-hidden="true" />
            {t("Previous")}
          </Button>
        </div>
        <div className="admin-pagination-group admin-pagination-pages">
          {paginationItems(page, Math.max(1, pages)).map(item =>
            typeof item === "number" ? (
              <Button
                key={item}
                variant="brand"
                size="brand"
                className="admin-pagination-button admin-pagination-number"
                aria-label={t("Page {page}", { page: item })}
                aria-current={item === page ? "page" : undefined}
                disabled={disabled || item === page}
                onClick={() => onPageChange(item)}
              >
                {formatPage(item)}
              </Button>
            ) : (
              <span
                key={item}
                className="admin-pagination-gap"
                aria-hidden="true"
              >
                <Ellipsis size={18} />
              </span>
            )
          )}
        </div>
        <div className="admin-pagination-group admin-pagination-end">
          <Button
            variant="brand"
            size="brand"
            className="admin-pagination-button admin-pagination-edge"
            disabled={disabled || empty || page >= pages}
            onClick={() => onPageChange(page + 1)}
          >
            {t("Next")}
            <ChevronRight size={16} aria-hidden="true" />
          </Button>
          <Button
            variant="brand"
            size="brand"
            className="admin-pagination-button admin-pagination-edge"
            disabled={disabled || empty || page >= pages}
            onClick={() => onPageChange(pages)}
          >
            {t("Last")}
          </Button>
        </div>
      </div>
    </nav>
  );
}
