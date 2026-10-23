import { currentUser } from "@marketplace/server/next-auth";
import { getServerI18n } from "../../../lib/i18n-server";
import { ProfileForm } from "../../../components/ProfileForm";
export const dynamic = "force-dynamic";
export default async function Page() {
  const [user, { t }] = await Promise.all([currentUser(), getServerI18n()]);
  return (
    <>
      <div className="admin-heading">
        <div>
          <p className="eyebrow">{t("OPERATIONS CENTER")}</p>
          <h1>{t("Account")}</h1>
        </div>
      </div>
      <ProfileForm name={user?.name ?? ""} email={user?.email ?? ""} />
    </>
  );
}
