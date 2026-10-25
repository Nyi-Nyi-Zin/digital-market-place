"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AdminBrand } from "./AdminShell";
import { useI18n } from "./I18nProvider";
import "../app/auth.css";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <main className="admin-signin">
      <aside
        className="admin-signin-welcome"
        aria-label={t("Cloud Nine operations")}
      >
        <AdminBrand />
        <div className="admin-signin-intro">
          <h2>{t("Your store. In good hands.")}</h2>
          <p>
            {t(
              "Manage your products, review orders, and keep your marketplace moving."
            )}
          </p>
        </div>
      </aside>
      <div className="admin-signin-content">
        <div className="admin-signin-topbar">
          <Link className="admin-signin-back" href="/">
            <ArrowLeft size={18} aria-hidden="true" />
            {t("Back")}
          </Link>
        </div>
        <div className="admin-signin-form-area">{children}</div>
      </div>
    </main>
  );
}
