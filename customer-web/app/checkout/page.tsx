import { getServerI18n } from "../lib/i18n-server";
import { redirect } from "next/navigation";
import { Header } from "../components/Header";
import { CheckoutClient } from "./CheckoutClient";
import { currentUser } from "@marketplace/server/next-auth";
import "./checkout.css";
export const dynamic = "force-dynamic";
export default async function CheckoutPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string; buy?: string }>;
}) {
  const { t } = await getServerI18n();
  const params = await searchParams;
  const user = await currentUser();
  if (!user)
    redirect(
      `/sign-in?next=${encodeURIComponent("/checkout?" + new URLSearchParams(params))}`
    );
  return (
    <>
      <Header />
      <main className="shell simple-page">
        <p className="eyebrow plain">{t("SECURE CHECKOUT")}</p>
        <h1>{t("Complete your order")}</h1>
        <CheckoutClient
          customer={{ name: user.name ?? "", email: user.email ?? "" }}
          orderId={params.order ? Number(params.order) : undefined}
          buyId={params.buy ? Number(params.buy) : undefined}
        />
      </main>
    </>
  );
}
