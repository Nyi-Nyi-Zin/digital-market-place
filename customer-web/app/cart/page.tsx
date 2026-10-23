import { getServerI18n } from "../lib/i18n-server";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "../components/Header";
import { CartClient } from "./CartClient";
import "./cart.css";
export default async function CartPage() {
  const { t } = await getServerI18n();
  return (
    <>
      <Header />
      <main className="shell cart-page">
        <Link className="cart-back" href="/">
          <ArrowLeft size={16} aria-hidden="true" />
          {t("Continue shopping")}
        </Link>
        <header className="cart-heading">
          <p className="eyebrow plain">{t("YOUR CART")}</p>
          <h1>{t("Your cart")}</h1>
          <p>{t("Review your items before heading to checkout.")}</p>
        </header>
        <CartClient />
      </main>
    </>
  );
}
