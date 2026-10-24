"use client";
import { Button } from "./ui/button";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogTitle,
  DialogClose,
} from "./ui/dialog";
import {
  Users,
  BarChart3,
  FileText,
  Headphones,
  History,
  ChevronLeft,
  Bell,
  ChevronRight,
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
import { useI18n } from "./I18nProvider";
import { Preferences } from "./Preferences";
import { SignOut } from "./SignOut";
import { NotificationBell } from "./NotificationCenter";

const links = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/products", label: "Products", icon: Package },
  { href: "/categories", label: "Categories", icon: Folder },
  { href: "/orders", label: "Orders", icon: ShoppingBag },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/reports", label: "Reports", icon: BarChart3 },
  { href: "/support", label: "Support requests", icon: Headphones },
  { href: "/activity", label: "Activity log", icon: History },
  {
    href: "/settings/store",
    label: "Content & store settings",
    icon: FileText,
  },
  { href: "/payments", label: "Payments", icon: CreditCard },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/settings/payment", label: "Payment settings", icon: Settings },
  { href: "/account", label: "Account", icon: UserRound },
];
const sidebarPreferenceKey = "cloud-nine-admin-sidebar-collapsed";

export function AdminBrand() {
  return (
    <Link
      href="/"
      className="admin-brand"
      aria-label="Cloud Nine Admin"
      title="Cloud Nine Admin"
    >
      <span className="admin-brand-icon">
        <Cloud size={23} aria-hidden="true" />
      </span>
      <span className="admin-brand-name">
        Cloud Nine<small>ADMIN</small>
      </span>
    </Link>
  );
}

function Navigation({
  close,
  compact = false,
  id,
}: {
  close?: () => void;
  compact?: boolean;
  id?: string;
}) {
  const path = usePathname();
  const { t } = useI18n();
  return (
    <nav id={id} className="admin-nav" aria-label={t("Admin navigation")}>
      {links.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          aria-current={
            path === href || (href !== "/" && path.startsWith(href + "/"))
              ? "page"
              : undefined
          }
          aria-label={t(label)}
          title={compact ? t(label) : undefined}
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
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(sidebarPreferenceKey) === "true");
    } catch {
      // The toggle still works when browser storage is unavailable.
    }
    const desktop = matchMedia("(min-width: 1024px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    return () => desktop.removeEventListener("change", closeOnDesktop);
  }, []);
  function toggleSidebar() {
    const next = !collapsed;
    setCollapsed(next);
    try {
      localStorage.setItem(sidebarPreferenceKey, String(next));
    } catch {
      // Persistence is optional; the current layout has already updated.
    }
  }
  const title =
    links.find(
      link =>
        link.href === path ||
        (link.href !== "/" && path.startsWith(link.href + "/"))
    )?.label ?? "Overview";
  return (
    <div className="admin-workspace" data-sidebar-collapsed={collapsed}>
      <a href="#admin-main" className="skip-link">
        {t("Skip to content")}
      </a>
      <aside className="admin-sidebar">
        <AdminBrand />
        <p className="sidebar-caption">{t("OPERATIONS CENTER")}</p>
        <Navigation id="admin-sidebar-navigation" compact={collapsed} />
        <div className="sidebar-user">
          <span className="user-avatar" aria-hidden="true">
            {name.slice(0, 1).toUpperCase()}
          </span>
          <Link
            href="/account"
            title={name}
            aria-label={`${t("Account")}: ${name}`}
          >
            <UserRound
              className="sidebar-account-icon"
              size={20}
              aria-hidden="true"
            />
            <span className="sidebar-account-name">{name}</span>
          </Link>
          <SignOut compact />
        </div>
        <Button
          variant="brand"
          size="brand"
          type="button"
          className="sidebar-toggle"
          aria-controls="admin-sidebar-navigation"
          aria-expanded={!collapsed}
          aria-label={t(collapsed ? "Expand sidebar" : "Collapse sidebar")}
          title={t(collapsed ? "Expand sidebar" : "Collapse sidebar")}
          onClick={toggleSidebar}
        >
          {collapsed ? (
            <ChevronRight size={18} aria-hidden="true" />
          ) : (
            <ChevronLeft size={18} aria-hidden="true" />
          )}
        </Button>
      </aside>
      <div className="admin-content">
        <header className="admin-topbar">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button
                variant="brand"
                size="brand"
                className="icon-button mobile-navigation"
                aria-label={t("Admin navigation")}
              >
                <Menu size={21} aria-hidden="true" />
              </Button>
            </DialogTrigger>
            <DialogContent
              branded
              showCloseButton={false}
              overlayClassName="drawer-overlay"
              className="admin-drawer"
              aria-describedby={undefined}
            >
              <div className="drawer-heading">
                <DialogTitle className="drawer-title">
                  {t("Admin navigation")}
                </DialogTitle>
                <DialogClose asChild>
                  <Button
                    variant="brand"
                    size="brand"
                    className="icon-button"
                    aria-label={t("Close")}
                  >
                    <X size={20} aria-hidden="true" />
                  </Button>
                </DialogClose>
              </div>
              <AdminBrand />
              <Navigation close={() => setOpen(false)} />
              <SignOut />
            </DialogContent>
          </Dialog>
          <div className="topbar-location">
            <h1>{t(title)}</h1>
          </div>
          <div className="topbar-tools">
            <NotificationBell />
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
