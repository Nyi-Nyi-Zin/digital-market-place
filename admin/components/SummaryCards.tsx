"use client";

import type { LucideIcon } from "lucide-react";
import { useI18n } from "./I18nProvider";

export type SummaryCard = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: "blue" | "green" | "amber" | "purple";
};

export function SummaryCards({
  cards,
  className = "",
}: {
  cards: SummaryCard[];
  className?: string;
}) {
  const { t, intlLocale } = useI18n();
  return (
    <dl className={`metric-grid ${className}`} aria-label={t("Summary")}>
      {cards.map(({ label, value, icon: Icon, tone }) => (
        <div className="summary-card" key={label}>
          <span className={`summary-icon summary-icon-${tone}`}>
            <Icon size={24} aria-hidden="true" />
          </span>
          <dt>{t(label)}</dt>
          <dd
            title={typeof value === "string" ? value : undefined}
            className={
              ["Full name", "Email", "Access", "Status"].includes(label)
                ? "summary-text"
                : undefined
            }
          >
            {typeof value === "number"
              ? value.toLocaleString(intlLocale)
              : value}
          </dd>
        </div>
      ))}
    </dl>
  );
}
