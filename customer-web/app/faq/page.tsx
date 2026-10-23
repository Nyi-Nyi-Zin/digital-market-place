import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, ChevronDown } from "lucide-react";
import { HelpFrame } from "../components/HelpFrame";
import { getServerI18n } from "../lib/i18n-server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getServerI18n();
  return {
    title: `${t("FAQ")} | Cloud Nine`,
    description: t(
      "Answers about buying, payments, product delivery and your account."
    ),
  };
}

export default async function FaqPage() {
  const { t } = await getServerI18n();
  const questions = [
    {
      question: "How do I buy a product?",
      answer:
        "Choose a product, add it to your cart and continue to checkout. Your final total is confirmed before you pay.",
      href: "/cart",
      action: "Your cart",
    },
    {
      question: "Which payment methods can I use?",
      answer:
        "Checkout shows the payment accounts currently enabled by the store. Use the selected account details and upload your payment screenshot.",
    },
    {
      question: "Why is my payment still pending?",
      answer:
        "Payments are reviewed by an administrator. Products are delivered manually after approval. Check My purchases for the latest status.",
      href: "/account/purchases",
      action: "View order status",
    },
    {
      question: "What happens if my payment is rejected?",
      answer:
        "Open My purchases to see the rejection reason. Use Resubmit payment on that order to provide new payment evidence.",
      href: "/account/purchases",
      action: "Go to purchases",
    },
    {
      question: "How will I receive my purchase?",
      answer:
        "Your product will be delivered manually after payment approval. Check My purchases for your order status, or contact support with your order number.",
      href: "/account/purchases",
      action: "Go to purchases",
    },
    {
      question: "Can I save products for later?",
      answer:
        "Use Save to wishlist on a product page. Your saved products are available in your account wishlist.",
      href: "/account/wishlist",
      action: "Wishlist",
    },
    {
      question: "How do I reset my password?",
      answer:
        "Open password recovery and enter your account email. If an account exists for that address, reset instructions will be emailed to you.",
      href: "/forgot-password",
      action: "Reset your password",
    },
    {
      question: "What license comes with a product?",
      answer:
        "Each product page lists what is included and its license terms. Review those details before purchasing.",
    },
  ];
  return (
    <HelpFrame
      page="FAQ"
      title={t("Frequently asked questions")}
      description={t(
        "Answers about buying, payments, product delivery and your account."
      )}
    >
      <section
        className="help-faq"
        aria-label={t("Frequently asked questions")}
      >
        {questions.map(({ question, answer, href, action }) => (
          <details className="help-faq-item" key={question}>
            <summary>
              <span>{t(question)}</span>
              <ChevronDown size={18} aria-hidden="true" />
            </summary>
            <div className="help-faq-answer">
              <p>{t(answer)}</p>
              {href && action ? (
                <Link href={href}>
                  {t(action)}
                  <ArrowRight size={15} aria-hidden="true" />
                </Link>
              ) : null}
            </div>
          </details>
        ))}
      </section>
      <aside className="help-related">
        <div>
          <h2>{t("Still need help?")}</h2>
          <p>
            {t(
              "Contact us by email or Telegram for help with your order or account."
            )}
          </p>
        </div>
        <Link className="button button-primary" href="/support">
          {t("Contact support")}
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </aside>
    </HelpFrame>
  );
}
