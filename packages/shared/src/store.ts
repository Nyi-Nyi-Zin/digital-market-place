import { z } from "zod";
import { exchangeRateInput } from "./currency";

export const documentKeys = [
  "how-to-buy",
  "about",
  "refund",
  "terms",
  "privacy",
  "license",
  "faq",
] as const;
export const documentKey = z.enum(documentKeys);
export const contentLocale = z.enum(["en", "my", "th", "ja", "zh"]);
export const positiveId = z.coerce.number().int().positive().max(2147483647);
export const pageInput = z.coerce.number().int().min(1).max(100000).default(1);
export const documentInput = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(600),
  sections: z
    .array(
      z.object({
        heading: z.string().trim().min(1).max(180),
        body: z.string().trim().min(1).max(6000),
      })
    )
    .min(1)
    .max(20),
});
export type StoreDocument = z.infer<typeof documentInput>;
export const settingsInput = z.object({
  supportEmail: z.email().max(320),
  telegramUsername: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]{4,31}$/),
  supportHours: z.string().trim().max(300),
  usdRate: exchangeRateInput.optional(),
  sgdRate: exchangeRateInput.optional(),
  mmkRate: exchangeRateInput.optional(),
});
export const defaultSettings = {
  supportEmail: "nyinyizin1818@gmail.com",
  telegramUsername: "miracle5373",
  supportHours: "",
  usdRate: null,
  sgdRate: null,
  mmkRate: null,
};
export const newTicketInput = z.object({
  subject: z.string().trim().min(3).max(180),
  message: z.string().trim().min(3).max(5000),
  orderId: positiveId.optional(),
});
export const ticketReplyInput = z.object({
  message: z.string().trim().min(1).max(5000),
});
export const ticketStatusInput = z.object({
  status: z.enum(["open", "closed"]),
});
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .refine(
    v =>
      !Number.isNaN(Date.parse(v)) &&
      new Date(v).toISOString().slice(0, 10) === v,
    "Invalid date"
  );
export const reportInput = z
  .object({ from: date, to: date })
  .refine(
    v =>
      v.from <= v.to && Date.parse(v.to) - Date.parse(v.from) <= 365 * 86400000,
    "Choose a date range of up to 366 days"
  );

// These are editable store information, not a promise of a refund or delivery deadline.
export const defaultDocuments: Record<
  z.infer<typeof documentKey>,
  StoreDocument
> = {
  "how-to-buy": {
    title: "How to buy",
    description: "From choosing a product to receiving your purchase.",
    sections: [
      {
        heading: "Choose your products",
        body: "Read the product description, included files and license, then add your products to the cart.",
      },
      {
        heading: "Place your order",
        body: "Sign in, check your cart and confirm your name and email at checkout.",
      },
      {
        heading: "Submit payment evidence",
        body: "Follow the payment instructions shown at checkout. Upload clear payment evidence and check the amount and transaction reference before submitting.",
      },
      {
        heading: "Wait for payment review",
        body: "An administrator reviews your payment manually. Check My purchases for approval or a rejection reason. If rejected, follow the reason and resubmit your evidence.",
      },
      {
        heading: "Receive your products",
        body: "After payment approval, your products are delivered manually. Check your order for delivery updates and contact support with your order number when you need help.",
      },
    ],
  },
  about: {
    title: "About Cloud Nine",
    description: "Digital resources for modern creators in Myanmar and beyond.",
    sections: [
      {
        heading: "Our marketplace",
        body: "Cloud Nine brings digital products together in one place. Explore the catalogue, check what is included and choose resources for your next project.",
      },
      {
        heading: "Personal support",
        body: "Payments are reviewed by an administrator and products are delivered manually after approval. You can contact our support team about your purchase using your order number.",
      },
    ],
  },
  refund: {
    title: "Refund policy",
    description: "Get help with a payment or a purchase issue.",
    sections: [
      {
        heading: "Request a review",
        body: "Contact support with your order number and a description of the issue, including duplicate payments, an incorrect product or a delivery problem. Support will review your request and explain the available resolution.",
      },
      {
        heading: "Payment review and refunds",
        body: "Rejected payment evidence does not mean that a refund has been processed. A refund is not automatic. Contact support to confirm eligibility, the method and timing before making assumptions about a refund.",
      },
    ],
  },
  terms: {
    title: "Terms of use",
    description: "Information about ordering and using this marketplace.",
    sections: [
      {
        heading: "Your account and orders",
        body: "Keep your account credentials private and provide accurate order and payment information. Review the product description and license before placing an order.",
      },
      {
        heading: "Payment and delivery",
        body: "Payment evidence is reviewed manually. Payment approval and product delivery are separate steps. Products are delivered manually after approval; contact support about any delivery questions.",
      },
      {
        heading: "Questions about a purchase",
        body: "Contact support with your order number if a product, payment or delivery needs attention. Check the refund policy and the product license for further information.",
      },
    ],
  },
  privacy: {
    title: "Privacy information",
    description: "How information is used to operate your account and orders.",
    sections: [
      {
        heading: "Account and purchase information",
        body: "The marketplace stores account details, order information, submitted payment evidence and support messages to provide account access, review payments, deliver purchases and resolve issues.",
      },
      {
        heading: "Preferences and notifications",
        body: "Language and theme preferences are stored in your browser. You can manage email and browser push preferences in Notifications. Website notification history remains available in your account.",
      },
      {
        heading: "Privacy questions",
        body: "Contact support for questions about your personal information or to request a review of your account data. Do not include passwords or payment account credentials in support messages.",
      },
    ],
  },
  license: {
    title: "License and usage",
    description: "Check the usage terms for each digital product.",
    sections: [
      {
        heading: "Product-specific licenses",
        body: "Each product may have its own license and permitted uses. Read the license and included information on the product page before purchasing. Purchasing a product does not automatically grant resale or redistribution rights.",
      },
      {
        heading: "Ask before using",
        body: "If you are unsure about commercial use, client work, redistribution or any other use, contact support with the product name before purchasing or using the product.",
      },
    ],
  },
  faq: {
    title: "Frequently asked questions",
    description:
      "Answers about buying, payments, product delivery and your account.",
    sections: [
      {
        heading: "How do I buy a product?",
        body: "Choose a product, add it to your cart and continue to checkout. Your final total is confirmed before you pay.",
      },
      {
        heading: "Which payment methods can I use?",
        body: "Checkout shows the payment accounts currently enabled by the store. Use the selected account details and upload your payment screenshot.",
      },
      {
        heading: "Why is my payment still pending?",
        body: "Payments are reviewed by an administrator. Products are delivered manually after approval. Check My purchases for the latest status.",
      },
      {
        heading: "What happens if my payment is rejected?",
        body: "Open My purchases to see the rejection reason. Use Resubmit payment on that order to provide new payment evidence.",
      },
      {
        heading: "How will I receive my purchase?",
        body: "Your product will be delivered manually after payment approval. Check My purchases for your order status, or contact support with your order number.",
      },
      {
        heading: "Can I save products for later?",
        body: "Use Save to wishlist on a product page. Your saved products are available in your account wishlist.",
      },
      {
        heading: "How do I reset my password?",
        body: "Open password recovery and enter your account email. If an account exists for that address, reset instructions will be emailed to you.",
      },
      {
        heading: "What license comes with a product?",
        body: "Each product page lists what is included and its license terms. Review those details before purchasing.",
      },
    ],
  },
};

export function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+\-@\t\r\n]/.test(text)) text = "'" + text;
  return `"${text.replaceAll('"', '""')}"`;
}
