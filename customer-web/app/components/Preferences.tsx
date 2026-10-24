"use client";
import { Button } from "./ui/button";

import { useEffect, useState } from "react";
import { Languages, Moon, Sun } from "lucide-react";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "./ui/select";
import { useTheme } from "next-themes";
import { localeNames, locales, type Locale } from "@marketplace/shared/i18n";
import { useI18n } from "./I18nProvider";

export function Preferences() {
  const { locale, t, changeLocale, changingLocale } = useI18n();
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = mounted && resolvedTheme === "dark";
  return (
    <div
      className="header-preferences"
      role="group"
      aria-label={t("Display preferences")}
    >
      <Button
        variant="brand"
        size="brand"
        type="button"
        className="theme-toggle"
        disabled={!mounted}
        aria-label={t(dark ? "Switch to light mode" : "Switch to dark mode")}
        title={t(dark ? "Switch to light mode" : "Switch to dark mode")}
        onClick={() => setTheme(dark ? "light" : "dark")}
      >
        <Sun className="theme-sun" size={18} aria-hidden="true" />
        <Moon className="theme-moon" size={18} aria-hidden="true" />
      </Button>
      <Select
        value={locale}
        disabled={changingLocale}
        onValueChange={value => changeLocale(value as Locale)}
      >
        <SelectTrigger
          className="language-picker"
          aria-label={t("Language")}
          aria-busy={changingLocale}
        >
          <Languages size={16} aria-hidden="true" />
          <SelectValue />
        </SelectTrigger>
        <SelectContent
          className="language-menu"
          data-header-preference=""
          position="popper"
          sideOffset={8}
          align="end"
          collisionPadding={12}
        >
          {locales.map(value => (
            <SelectItem
              className="language-option"
              key={value}
              value={value}
              lang={value}
            >
              {localeNames[value]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="sr-only" role="status">
        {changingLocale ? t("Changing language…") : ""}
      </span>
    </div>
  );
}
