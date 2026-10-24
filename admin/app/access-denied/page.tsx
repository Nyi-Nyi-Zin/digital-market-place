import { AuthLayout } from "../../components/AuthLayout";
import { SignOut } from "../../components/SignOut";
import { getServerI18n } from "../../lib/i18n-server";
export default async function Page() {
  const { t } = await getServerI18n();
  return (
    <AuthLayout>
      <section className="admin-auth-card">
        <p className="eyebrow">403</p>
        <h1>{t("Administrator access required")}</h1>
        <p>{t("This account does not have access to the admin site.")}</p>
        <div className="auth-links">
          <SignOut />
        </div>
      </section>
    </AuthLayout>
  );
}
