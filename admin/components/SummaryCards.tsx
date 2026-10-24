"use client";

import type { LucideIcon } from "lucide-react";
import { useI18n } from "./I18nProvider";

export type SummaryCard = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  tone: "blue" | "green" | "amber" | "purple";
};

export function SummaryCards({ cards }: { cards: SummaryCard[] }) {
  const { t, intlLocale } = useI18n();
  return (
    <dl className="metric-grid" aria-label={t("Summary")}>
      {cards.map(({ label, value, icon: Icon, tone }) => (
        <div className="summary-card" key={label}>
          <span className={`summary-icon summary-icon-${tone}`}>
            <Icon size={24} aria-hidden="true" />
          </span>
          <dt>{t(label)}</dt>
          <dd
            className={typeof value === "string" ? "summary-text" : undefined}
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
