import { getServerI18n } from "../../lib/i18n-server";
import Link from "next/link";
import { Header } from "../../components/Header";
import { WishlistClient } from "./WishlistClient";

export default async function WishlistPage() {
  const { t } = await getServerI18n();
  return (
    <>
      <Header />
      <main className="shell simple-page">
        <p className="eyebrow plain">{t("SAVED FOR LATER")}</p>
        <h1>{t("Wishlist")}</h1>
        <WishlistClient />
        <Link className="button button-secondary library-link" href="/">
          {t("Browse products")}
        </Link>
      </main>
    </>
  );
}
