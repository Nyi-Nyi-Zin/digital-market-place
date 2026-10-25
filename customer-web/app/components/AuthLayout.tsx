"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { useI18n } from "./I18nProvider";
import "../auth.css";

export function AuthLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <main className="customer-auth">
      <aside
        className="customer-auth-welcome"
        aria-label={t("Welcome to Cloud Nine")}
      >
        <Link
          className="brand customer-auth-brand"
          href="/"
          aria-label="Cloud Nine"
        >
          <BrandMark />
          <span>Cloud Nine</span>
        </Link>
        <div className="customer-auth-intro">
          <h2>{t("Your next idea starts here.")}</h2>
          <p>
            {t(
              "Discover digital products to create, build, and bring your ideas to life."
            )}
          </p>
          <Link className="customer-auth-explore" href="/">
            {t("Explore products")}
          </Link>
        </div>
      </aside>
      <div className="customer-auth-content">
        <div className="customer-auth-topbar">
          <Link className="customer-auth-back" href="/">
            <ArrowLeft size={18} aria-hidden="true" />
            {t("Back")}
          </Link>
        </div>
        <div className="customer-auth-form-area">{children}</div>
      </div>
    </main>
  );
}
