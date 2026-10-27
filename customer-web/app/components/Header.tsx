"use client";
import { Button } from "./ui/button";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { CartBadge } from "../cart/CartClient";
import { AuthControls } from "./AuthControls";
import { BrandMark } from "./BrandMark";
import { Menu, X } from "lucide-react";
import { Preferences } from "./Preferences";
import { NotificationBell } from "./NotificationCenter";
import { useI18n } from "./I18nProvider";
import "../header.css";

export function Header({
  activePage,
}: { activePage?: "/support" | "/faq" } = {}) {
  return <CustomerHeader activePage={activePage} />;
}

function CustomerHeader({ activePage }: { activePage?: "/support" | "/faq" }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const header = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const id = useId();
  const links = [
    { href: "/support", label: "Support" },
    { href: "/faq", label: "FAQ" },
  ];

  useEffect(() => {
    if (!menuOpen) return;
    const desktop = window.matchMedia("(min-width: 1101px)");
    const closeOnDesktop = () => {
      if (desktop.matches) setMenuOpen(false);
    };
    const closeOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !header.current?.contains(event.target) &&
        !(
          event.target instanceof Element &&
          event.target.closest(
            "[data-header-preference], [data-header-account]"
          )
        )
      )
        setMenuOpen(false);
    };
    desktop.addEventListener("change", closeOnDesktop);
    document.addEventListener("pointerdown", closeOutside);
    return () => {
      desktop.removeEventListener("change", closeOnDesktop);
      document.removeEventListener("pointerdown", closeOutside);
    };
  }, [menuOpen]);

  return (
    <header
      className="site-header marketplace-header"
      data-menu-open={menuOpen}
      ref={header}
      onKeyDown={event => {
        if (event.key === "Escape" && menuOpen && !event.defaultPrevented) {
          setMenuOpen(false);
          toggle.current?.focus();
        }
      }}
    >
      <div className="shell nav">
        <Link className="brand" href="/" onClick={() => setMenuOpen(false)}>
          <BrandMark />
          <span>
            Cloud <span>Nine</span>
          </span>
        </Link>
        <Button
          variant="brand"
          size="brand"
          type="button"
          className="header-menu-toggle"
          ref={toggle}
          aria-label={t("Main navigation")}
          aria-expanded={menuOpen}
          aria-controls={`${id}-navigation ${id}-settings`}
          onClick={() => setMenuOpen(open => !open)}
        >
          {menuOpen ? (
            <X size={21} aria-hidden="true" />
          ) : (
            <Menu size={21} aria-hidden="true" />
          )}
        </Button>
        <nav
          className="header-navigation"
          id={`${id}-navigation`}
          aria-label={t("Main navigation")}
        >
          {links.map(link => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={
                (activePage ?? pathname) === link.href ? "page" : undefined
              }
              onClick={() => setMenuOpen(false)}
            >
              {t(link.label)}
            </Link>
          ))}
        </nav>
        <div className="header-tools">
          <CartBadge />
          <NotificationBell />
        </div>
        <div className="header-settings" id={`${id}-settings`}>
          <Preferences />
          <div
            className="header-account"
            onClick={event => {
              if (event.target instanceof Element && event.target.closest("a"))
                setMenuOpen(false);
            }}
          >
            <AuthControls />
          </div>
        </div>
      </div>
    </header>
  );
}
