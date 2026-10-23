import Link from "next/link";
import { AuthLayout } from "../components/AuthLayout";
import { getServerI18n } from "../lib/i18n-server";
export default async function NotFound() {
  const { t } = await getServerI18n();
  return (
    <AuthLayout>
      <section className="admin-auth-card">
        <p className="eyebrow">404</p>
        <h1>{t("This page is not available.")}</h1>
        <Link className="button button-primary" href="/">
          {t("Overview")}
        </Link>
      </section>
    </AuthLayout>
  );
}
