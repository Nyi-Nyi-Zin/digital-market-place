"use client";
import "./tailwind.css";
import { Button } from "../components/ui/button";

import { useEffect, useState } from "react";
import {
  createTranslator,
  localeCookie,
  resolveLocale,
  type Locale,
} from "@marketplace/shared/i18n";
import { dictionaries } from "@marketplace/shared/locales";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [locale, setLocale] = useState<Locale>("en");
  const [dark, setDark] = useState(false);
  useEffect(() => {
    console.error(error);
    setLocale(
      resolveLocale(
        document.cookie
          .split("; ")
          .find(value => value.startsWith(`${localeCookie}=`))
          ?.split("=")[1]
      )
    );
    try {
      const theme = localStorage.getItem("cloud-nine-admin-theme");
      setDark(
        theme === "dark" ||
          ((!theme || theme === "system") &&
            matchMedia("(prefers-color-scheme: dark)").matches)
      );
    } catch {}
  }, [error]);
  const t = createTranslator(dictionaries[locale]);
  return (
    <html lang={locale} data-theme={dark ? "dark" : "light"}>
      <body className="m-0! grid! min-h-screen! place-items-center! bg-[#f5f6fa]! p-6! text-[#182033]! [color-scheme:light]! [font-family:Arial,'Myanmar_Text',sans-serif]! dark:bg-[#11151f]! dark:text-[#edf0f7]! dark:[color-scheme:dark]!">
        <main className="max-w-[480px]">
          <p>Cloud Nine · Admin</p>
          <h1>{t("Something needs another try.")}</h1>
          <Button
            variant="brand"
            size="brand"
            onClick={reset}
            className="cursor-pointer! rounded-[8px]! border-0! bg-[#6954dc]! px-5! py-3! text-white! [font:inherit]!"
          >
            {t("Try again")}
          </Button>
        </main>
      </body>
    </html>
  );
}
