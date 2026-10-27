import Link from "next/link";
import { FaqAccordion } from "./FaqAccordion";
import { HelpFrame } from "./HelpFrame";
import { getServerI18n } from "../lib/i18n-server";
import { getStoreDocument, getStoreSettings } from "@marketplace/server/store";
import type { documentKeys } from "@marketplace/shared/store";

export async function storePageMetadata(
  document: (typeof documentKeys)[number]
) {
  const { locale } = await getServerI18n();
  const { content } = await getStoreDocument(document, locale);
  return {
    title: `${content.title} | Cloud Nine`,
    description: content.description,
  };
}

export async function StoreInformation({
  document,
}: {
  document: (typeof documentKeys)[number];
}) {
  const { locale, t } = await getServerI18n();
  const [{ content }, settings] = await Promise.all([
    getStoreDocument(document, locale),
    getStoreSettings(),
  ]);
  return (
    <HelpFrame
      page={content.title}
      title={content.title}
      description={content.description}
    >
      <div className="information-sections">
        {document === "how-to-buy" ? (
          <ol className="buying-steps">
            {content.sections.map((section, index) => (
              <li key={index}>
                <span className="step-number" aria-hidden="true">
                  {index + 1}
                </span>
                <div>
                  <h2>{section.heading}</h2>
                  <p>{section.body}</p>
                </div>
              </li>
            ))}
          </ol>
        ) : document === "faq" ? (
          <FaqAccordion sections={content.sections} />
        ) : (
          content.sections.map((section, index) => (
            <section className="information-panel" key={index}>
              <h2>{section.heading}</h2>
              <p>{section.body}</p>
            </section>
          ))
        )}
      </div>
      <section className="help-contact information-contact">
        <h2>{t("Contact support")}</h2>
        <p>
          <a href={`mailto:${settings.supportEmail}`}>
            {settings.supportEmail}
          </a>{" "}
          ·{" "}
          <a
            href={`https://t.me/${settings.telegramUsername}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            @{settings.telegramUsername}
          </a>
        </p>
        {settings.supportHours && (
          <p>
            {t("Support hours")}: {settings.supportHours}
          </p>
        )}
        <div className="page-actions">
          <Link className="button button-secondary" href="/account/support">
            {t("My support requests")}
          </Link>
          <Link className="button button-secondary" href="/account/purchases">
            {t("My purchases")}
          </Link>
        </div>
      </section>
    </HelpFrame>
  );
}
