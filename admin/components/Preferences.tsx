"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, Languages, Moon, Sun } from "lucide-react";
import * as Select from "@radix-ui/react-select";
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
      <button
        type="button"
        className="theme-toggle"
        disabled={!mounted}
        aria-label={t(dark ? "Switch to light mode" : "Switch to dark mode")}
        title={t(dark ? "Switch to light mode" : "Switch to dark mode")}
        onClick={() => setTheme(dark ? "light" : "dark")}
      >
        <Sun className="theme-sun" size={18} aria-hidden="true" />
        <Moon className="theme-moon" size={18} aria-hidden="true" />
      </button>
      <Select.Root
        value={locale}
        disabled={changingLocale}
        onValueChange={value => changeLocale(value as Locale)}
      >
        <Select.Trigger
          className="language-picker"
          aria-label={t("Language")}
          aria-busy={changingLocale}
        >
          <Languages size={16} aria-hidden="true" />
          <Select.Value />
          <Select.Icon className="language-chevron">
            <ChevronDown size={15} aria-hidden="true" />
          </Select.Icon>
        </Select.Trigger>
        <Select.Portal>
          <Select.Content
            className="language-menu"
            data-header-preference=""
            position="popper"
            sideOffset={8}
            align="end"
            collisionPadding={12}
          >
            <Select.Viewport className="language-menu-options">
              {locales.map(value => (
                <Select.Item
                  className="language-option"
                  key={value}
                  value={value}
                  lang={value}
                >
                  <Select.ItemText>{localeNames[value]}</Select.ItemText>
                  <Select.ItemIndicator className="language-check">
                    <Check size={16} aria-hidden="true" />
                  </Select.ItemIndicator>
                </Select.Item>
              ))}
            </Select.Viewport>
          </Select.Content>
        </Select.Portal>
      </Select.Root>
      <span className="sr-only" role="status">
        {changingLocale ? t("Changing language…") : ""}
      </span>
    </div>
  );
}
