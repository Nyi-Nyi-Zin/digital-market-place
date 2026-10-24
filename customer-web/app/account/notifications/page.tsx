import { getServerI18n } from "../../lib/i18n-server";
import { Header } from "../../components/Header";
import { NotificationCenter } from "../../components/NotificationCenter";

export default async function NotificationsPage() {
  const { t } = await getServerI18n();
  return (
    <>
      <Header />
      <main className="shell simple-page">
        <p className="eyebrow plain">{t("UPDATES")}</p>
        <h1>{t("Notifications")}</h1>
        <NotificationCenter />
      </main>
    </>
  );
}
