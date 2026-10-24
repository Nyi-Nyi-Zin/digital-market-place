import { getServerI18n } from "../lib/i18n-server";
import Link from "next/link";
import { Header } from "../components/Header";
import { currentUser } from "@marketplace/server/next-auth";
import { ProfileForm } from "./ProfileForm";
import { adminSiteUrl } from "@marketplace/shared/sites";
export const dynamic = "force-dynamic";
export default async function AccountPage() {
  const { t } = await getServerI18n();
  const user = await currentUser();
  return (
    <>
      <Header />
      <main className="shell simple-page">
        <p className="eyebrow plain">{t("YOUR WORKSPACE")}</p>
        <h1>{t("Account")}</h1>
        {user?.role === "admin" && (
          <Link className="button button-primary" href={adminSiteUrl}>
            {t("Open admin panel")}
          </Link>
        )}
        <div className="account-grid">
          {[
            ["purchases", t("My purchases"), t("Order status and purchases")],
            ["wishlist", t("Wishlist"), t("Products saved for later")],
            [
              "support",
              t("My support requests"),
              t("Get help with an order or your account"),
            ],
            [
              "notifications",
              t("Notifications"),
              t("Payment and product updates"),
            ],
          ].map(([path, title, body]) => (
            <Link href={`/account/${path}`} key={path}>
              <h2>{title}</h2>
              <p>{body}</p>
            </Link>
          ))}
        </div>
        <ProfileForm name={user?.name ?? ""} email={user?.email ?? ""} />
      </main>
    </>
  );
}
