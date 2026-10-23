"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import {
  ArrowUpRight,
  Cloud,
  CreditCard,
  Folder,
  LayoutDashboard,
  Menu,
  Package,
  Settings,
  ShoppingBag,
  UserRound,
  X,
} from "lucide-react";
import { customerSiteUrl } from "@marketplace/shared/sites";
import { useI18n } from "./I18nProvider";
import { Preferences } from "./Preferences";
import { SignOut } from "./SignOut";

const links = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/categories", label: "Categories", icon: Folder },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/settings/payment", label: "Payment settings", icon: Settings },
  { href: "/account", label: "Account", icon: UserRound },
];

export function AdminBrand() {
  return (
    <Link href="/" className="admin-brand">
      <span className="admin-brand-icon">
        <Cloud size={23} aria-hidden="true" />
      </span>
      <span>
        Cloud Nine<small>ADMIN</small>
      </span>
    </Link>
  );
}

function Navigation({ close }: { close?: () => void }) {
  const path = usePathname();
  const { t } = useI18n();
  return (
    <nav className="admin-nav" aria-label={t("Admin navigation")}>
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={path === href ? "page" : undefined}
          onClick={close}
        >
          <Icon size={18} aria-hidden="true" />
          <span>{t(label)}</span>
        </Link>
      ))}
    </nav>
  );
}

export function AdminShell({
  children,
  name,
}: {
  children: React.ReactNode;
  name: string;
}) {
  const { t } = useI18n();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const desktop = matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  const title = links.find(link => link.href === path)?.label ?? "Overview";
  return (
    <div className="admin-workspace">
      <a href="#admin-main" className="skip-link">
        {t("Skip to content")}
      </a>
      <aside className="admin-sidebar">
        <AdminBrand />
        <p className="sidebar-caption">{t("OPERATIONS CENTER")}</p>
        <Navigation />
        <a className="storefront-link" href={customerSiteUrl}>
          {t("View storefront")}
          <ArrowUpRight size={16} aria-hidden="true" />
        </a>
        <div className="sidebar-user">
          <span className="user-avatar" aria-hidden="true">
            {name.slice(0, 1).toUpperCase()}
          </span>
          <Link href="/account">{name}</Link>
          <SignOut compact />
        </div>
      </aside>
      <div className="admin-content">
        <header className="admin-topbar">
          <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
              <button
                className="icon-button mobile-navigation"
                aria-label={t("Admin navigation")}
              >
                <Menu size={21} aria-hidden="true" />
              </button>
            </Dialog.Trigger>
            <Dialog.Portal>
              <Dialog.Overlay className="drawer-overlay" />
              <Dialog.Content
                className="admin-drawer"
                aria-describedby={undefined}
              >
                <div className="drawer-heading">
                  <Dialog.Title className="drawer-title">
                    {t("Admin navigation")}
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button className="icon-button" aria-label={t("Close")}>
                      <X size={20} aria-hidden="true" />
                    </button>
                  </Dialog.Close>
                </div>
                <AdminBrand />
                <Navigation close={() => setOpen(false)} />
                <a className="storefront-link" href={customerSiteUrl}>
                  {t("View storefront")}
                  <ArrowUpRight size={16} aria-hidden="true" />
                </a>
                <SignOut />
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
          <div className="topbar-location">
            <span>Cloud Nine</span>
            <span aria-hidden="true">/</span>
            <strong>{t(title)}</strong>
          </div>
          <div className="topbar-tools">
            <Preferences />
            <Link
              className="icon-button profile-link"
              href="/account"
              aria-label={t("Account")}
            >
              <UserRound size={19} aria-hidden="true" />
            </Link>
            <span className="mobile-signout">
              <SignOut compact />
            </span>
          </div>
        </header>
        <main id="admin-main" className="admin-main" tabIndex={-1}>
          {children}
        </main>
        <footer className="admin-footer">
          Cloud Nine <span>· {t("OPERATIONS CENTER")}</span>
        </footer>
      </div>
    </div>
  );
}
