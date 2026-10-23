import Link from "next/link";
import type { Metadata } from "next";
import {
  ArrowRight,
  ArrowUpRight,
  CreditCard,
  PackageCheck,
  Mail,
  MessageCircle,
  UserRound,
} from "lucide-react";
import { HelpFrame } from "../components/HelpFrame";
import { getServerI18n } from "../lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return {
    title: `${t("Support")} | Cloud Nine`,
    description: t(
      "Get help with payments, product delivery and your account."
    ),
  };
}

export default async function SupportPage() {
  const { t } = await getServerI18n();
  const topics = [
    {
      icon: CreditCard,
      title: "Payments and order status",
      description:
        "Check payment approval, see rejection details or submit new payment evidence from your purchases.",
      href: "/account/purchases",
      action: "View order status",
    },
    {
      icon: PackageCheck,
      title: "Product delivery",
      description:
        "After payment approval, your product will be delivered manually. Contact support with your order number if you need help.",
      href: "/account/purchases",
      action: "Go to purchases",
    },
    {
      icon: UserRound,
      title: "Account help",
      description:
        "Forgot your password? Request a reset link using the email address associated with your account.",
      href: "/forgot-password",
      action: "Reset your password",
    },
  ];
  return (
    <HelpFrame
      page="Support"
      title={t("How can we help?")}
      description={t(
        "Get help with payments, product delivery and your account."
      )}
    >
      <section className="help-contact" aria-labelledby="contact-title">
        <h2 id="contact-title">{t("Contact support")}</h2>
        <p>
          {t(
            "For order-specific help, include your order number and a short description of the issue."
          )}
        </p>
        <div className="help-contact-links">
          <a
            href="mailto:nyinyizin1818@gmail.com"
            className="help-contact-link"
          >
            <Mail size={22} aria-hidden="true" />
            <span>
              <small>{t("Email support")}</small>
              <strong>nyinyizin1818@gmail.com</strong>
            </span>
            <ArrowUpRight size={18} aria-hidden="true" />
          </a>
          <a
            href="https://t.me/miracle5373"
            target="_blank"
            rel="noopener noreferrer"
            className="help-contact-link"
          >
            <MessageCircle size={22} aria-hidden="true" />
            <span>
              <small>{t("Message on Telegram")}</small>
              <strong>@miracle5373</strong>
            </span>
            <ArrowUpRight size={18} aria-hidden="true" />
          </a>
        </div>
      </section>
      <section className="help-topics" aria-labelledby="topics-title">
        <h2 id="topics-title">{t("Find help by topic")}</h2>
        <div className="help-topic-grid">
          {topics.map(({ icon: Icon, title, description, href, action }) => (
            <article key={title} className="help-topic-card">
              <span className="help-topic-icon">
                <Icon size={22} aria-hidden="true" />
              </span>
              <h3>{t(title)}</h3>
              <p>{t(description)}</p>
              <Link href={href}>
                {t(action)}
                <ArrowRight size={16} aria-hidden="true" />
              </Link>
            </article>
          ))}
        </div>
      </section>
      <aside className="help-related">
        <div>
          <h2>{t("Looking for a quick answer?")}</h2>
          <p>
            {t("Find answers to common questions before you get in touch.")}
          </p>
        </div>
        <Link className="button button-primary" href="/faq">
          {t("Read the FAQ")}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </aside>
    </HelpFrame>
  );
}
