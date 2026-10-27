import { getServerI18n } from "../lib/i18n-server";
import Link from "next/link";
import { Header } from "../components/Header";
import { currentUser, telegramConnection } from "@marketplace/server/next-auth";
import { TelegramConnection } from "../components/TelegramConnection";
import { ProfileForm } from "./ProfileForm";
import { ArrowUpRight, ShoppingBag, Heart, LifeBuoy, Bell } from "lucide-react";
export const dynamic = "force-dynamic";
export default async function AccountPage() {
  const { t } = await getServerI18n();
  const user = await currentUser();
  const telegram = await telegramConnection();
  return (
    <>
      <Header />
      <main className="shell simple-page customer-account">
        <p className="eyebrow plain">{t("YOUR WORKSPACE")}</p>
        <h1>{t("Account")}</h1>
        <p className="account-description">
          {t("Manage your profile, purchases and support requests.")}
        </p>
        <div className="account-grid">
          {[
            {
              path: "purchases",
              title: "My purchases",
              body: "Order status and purchases",
              icon: ShoppingBag,
            },
            {
              path: "wishlist",
              title: "Wishlist",
              body: "Products saved for later",
              icon: Heart,
            },
            {
              path: "support",
              title: "My support requests",
              body: "Get help with an order or your account",
              icon: LifeBuoy,
            },
            {
              path: "notifications",
              title: "Notifications",
              body: "Payment and product updates",
              icon: Bell,
            },
          ].map(({ path, title, body, icon: Icon }) => (
            <Link href={`/account/${path}`} key={path}>
              <div className="account-action-top">
                <span className="account-action-icon">
                  <Icon size={21} aria-hidden="true" />
                </span>
                <ArrowUpRight
                  className="account-action-arrow"
                  size={18}
                  aria-hidden="true"
                />
              </div>
              <h2>{t(title)}</h2>
              <p>{t(body)}</p>
            </Link>
          ))}
        </div>
        <ProfileForm name={user?.name ?? ""} email={user?.email ?? ""} />
        <TelegramConnection {...telegram} />
      </main>
    </>
  );
}
