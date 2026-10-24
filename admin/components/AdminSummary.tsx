"use client";

import {
  CircleCheck,
  Archive,
  Clock3,
  CreditCard,
  FileText,
  Folder,
  Package,
  Settings,
  ShoppingBag,
  Wallet,
  XCircle,
} from "lucide-react";
import type { AdminOverview } from "@marketplace/server/marketplace";
import type { AdminListInput } from "@marketplace/shared/pagination";
import { formatPrice } from "@marketplace/shared/pricing";
import { useI18n } from "./I18nProvider";
import { SummaryCards, type SummaryCard } from "./SummaryCards";

export function AdminSummary({
  section,
  data,
}: {
  section: AdminListInput["section"];
  data: AdminOverview;
}) {
  const { intlLocale } = useI18n();
  const { summary, stats } = data;
  let cards: SummaryCard[];
  if (section === "dashboard") {
    cards = [
      {
        label: "Pending payments",
        value: stats.pendingPayments,
        icon: Clock3,
        tone: "amber",
      },
      {
        label: "Approved orders",
        value: stats.approvedOrders,
        icon: CircleCheck,
        tone: "green",
      },
      { label: "Products", value: stats.products, icon: Package, tone: "blue" },
      {
        label: "Approved revenue",
        value: formatPrice(stats.revenue, intlLocale),
        icon: Wallet,
        tone: "purple",
      },
    ];
  } else if (section === "products" || section === "categories") {
    cards = [
      {
        label: section === "products" ? "Total products" : "Total categories",
        value: summary.total,
        icon: section === "products" ? Package : Folder,
        tone: "blue",
      },
      {
        label: section === "products" ? "Published" : "Published products",
        value: summary.published,
        icon: CircleCheck,
        tone: "green",
      },
      {
        label: section === "products" ? "Draft" : "Draft products",
        value: summary.draft,
        icon: FileText,
        tone: "amber",
      },
      {
        label: section === "products" ? "Archived" : "Products",
        value: section === "products" ? summary.archived : summary.products,
        icon: section === "products" ? Archive : Package,
        tone: "purple",
      },
    ];
  } else if (section === "orders") {
    cards = [
      {
        label: "Total orders",
        value: summary.total,
        icon: ShoppingBag,
        tone: "blue",
      },
      {
        label: "Awaiting payment",
        value: summary.awaitingPayment,
        icon: Clock3,
        tone: "amber",
      },
      {
        label: "Paid, awaiting delivery",
        value: summary.awaitingDelivery,
        icon: Package,
        tone: "purple",
      },
      {
        label: "Completed",
        value: summary.completed,
        icon: CircleCheck,
        tone: "green",
      },
    ];
  } else if (section === "payments") {
    cards = [
      {
        label: "Total payments",
        value: summary.total,
        icon: CreditCard,
        tone: "blue",
      },
      {
        label: "approved",
        value: summary.approved,
        icon: CircleCheck,
        tone: "green",
      },
      { label: "pending", value: summary.pending, icon: Clock3, tone: "amber" },
      {
        label: "rejected",
        value: summary.rejected,
        icon: XCircle,
        tone: "purple",
      },
    ];
  } else {
    const methods = data.methods.filter(method =>
      ["KBZPay", "AYA Pay", "WavePay"].includes(method.name)
    );
    const enabled = methods.filter(method => method.enabled).length;
    cards = [
      { label: "Payment methods", value: 3, icon: CreditCard, tone: "blue" },
      { label: "Enabled", value: enabled, icon: CircleCheck, tone: "green" },
      { label: "Disabled", value: 3 - enabled, icon: Clock3, tone: "amber" },
      {
        label: "Configured",
        value: methods.filter(
          method => method.accountName && method.accountNumber
        ).length,
        icon: Settings,
        tone: "purple",
      },
    ];
  }
  return <SummaryCards cards={cards} />;
}
