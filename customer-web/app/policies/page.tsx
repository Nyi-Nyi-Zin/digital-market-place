import Link from "next/link";
import { HelpFrame } from "../components/HelpFrame";
import { getServerI18n } from "../lib/i18n-server";
export default async function Page() {
  const { t } = await getServerI18n();
  return (
    <HelpFrame
      page="Policies"
      title={t("Policies")}
      description={t("Information about purchases, privacy and product usage.")}
    >
      <div className="information-sections">
        {[
          ["refund-policy", "Refund policy"],
          ["terms", "Terms of use"],
          ["privacy", "Privacy information"],
          ["license", "License and usage"],
        ].map(([route, title]) => (
          <Link className="information-panel" key={route} href={`/${route}`}>
            <h2>{t(title)} →</h2>
          </Link>
        ))}
      </div>
    </HelpFrame>
  );
}
