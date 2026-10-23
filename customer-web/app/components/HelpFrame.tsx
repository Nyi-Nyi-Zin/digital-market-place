import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "./Header";
import { getServerI18n } from "../lib/i18n-server";
import "../help.css";

export async function HelpFrame({
  page,
  title,
  description,
  children,
}: {
  page: "Support" | "FAQ";
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  const { t } = await getServerI18n();
  return (
    <>
      <Header activePage={page === "Support" ? "/support" : "/faq"} />
      <main className="shell help-page">
        <nav className="help-breadcrumbs" aria-label={t("Breadcrumbs")}>
          <Link href="/">{t("Home")}</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{t(page)}</span>
        </nav>
        <div className="help-hero">
          <p className="eyebrow">{t("HELP CENTER")}</p>
          <h1>{title}</h1>
          <p>{description}</p>
        </div>
        {children}
        <div className="help-back">
          <Link href="/">
            <ArrowLeft size={16} aria-hidden="true" />
            {t("Back to marketplace")}
          </Link>
        </div>
      </main>
    </>
  );
}
