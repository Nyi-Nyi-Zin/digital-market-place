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
import { currencies, type Currency } from "@marketplace/shared/currency";
import { usePricing } from "./CurrencyProvider";

export function Preferences() {
  const { locale, t, changeLocale, changingLocale } = useI18n();
  const { currency, config, changeCurrency, changingCurrency } = usePricing();
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
      <span className="header-preference-divider" aria-hidden="true" />
      <Select
        value={currency}
        disabled={changingCurrency}
        onValueChange={value => changeCurrency(value as Currency)}
      >
        <SelectTrigger
          className="currency-picker header-preference-trigger"
          aria-label={t("Currency")}
          aria-busy={changingCurrency}
        >
          <SelectValue>{currency}</SelectValue>
        </SelectTrigger>
        <SelectContent
          className="language-menu"
          data-header-preference=""
          position="popper"
          sideOffset={8}
          align="end"
          collisionPadding={12}
        >
          {currencies.map(value => (
            <SelectItem
              className="language-option"
              key={value}
              value={value}
              disabled={!config.rates[value]}
            >
              {value}
              {!config.rates[value] ? ` · ${t("Not available yet")}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="header-preference-divider" aria-hidden="true" />
      <Select
        value={locale}
        disabled={changingLocale}
        onValueChange={value => changeLocale(value as Locale)}
      >
        <SelectTrigger
          className="language-picker header-preference-trigger"
          aria-label={t("Language")}
          aria-busy={changingLocale}
        >
          <Languages size={16} aria-hidden="true" />
          <SelectValue>{localeNames[locale]}</SelectValue>
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
        {changingCurrency ? t("Changing currency…") : ""}
      </span>
    </div>
  );
}
