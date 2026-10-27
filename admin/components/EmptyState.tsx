"use client";

import { Inbox, type LucideIcon } from "lucide-react";
import { useI18n } from "./I18nProvider";

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
}: {
  title: string;
  description: string;
  icon?: LucideIcon;
}) {
  const { t } = useI18n();
  return (
    <div className="admin-empty-state" role="status">
      <span className="empty-state-icon">
        <Icon size={24} strokeWidth={1.6} aria-hidden="true" />
      </span>
      <h3>{t(title)}</h3>
      <p>{t(description)}</p>
    </div>
  );
}
