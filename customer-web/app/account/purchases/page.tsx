import { getServerI18n } from "../../lib/i18n-server";
import Link from "next/link";
import { Header } from "../../components/Header";
import { PurchasesClient } from "./PurchasesClient";

export default async function PurchasesPage() {
  const { t } = await getServerI18n();
  return (
    <>
      <Header />
      <main className="shell simple-page">
        <p className="eyebrow plain">{t("YOUR LIBRARY")}</p>
        <h1>{t("My purchases")}</h1>
        <PurchasesClient />
        <Link className="button button-secondary library-link" href="/">
          {t("Explore products")}
        </Link>
      </main>
    </>
  );
}
