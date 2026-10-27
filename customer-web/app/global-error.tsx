"use client";
import "./tailwind.css";
import { Button } from "./components/ui/button";

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
  // This boundary replaces the root layout and cannot depend on its providers.
  const [locale, setLocale] = useState<Locale>("en");
  const [dark, setDark] = useState(false);
  useEffect(() => {
    console.error(error);
    const value = document.cookie
      .split("; ")
      .find(value => value.startsWith(`${localeCookie}=`))
      ?.split("=")[1];
    setLocale(resolveLocale(value));
    let preference = "system";
    try {
      preference = localStorage.getItem("cloud-nine-theme") ?? "system";
    } catch {}
    setDark(
      preference === "dark" ||
        (preference === "system" &&
          matchMedia("(prefers-color-scheme: dark)").matches)
    );
  }, [error]);
  const t = createTranslator(dictionaries[locale]);
  return (
    <html lang={locale} data-theme={dark ? "dark" : "light"}>
      <body className="m-0! grid! min-h-screen! place-items-center! bg-[#fbfbfd]! p-8! text-center! text-[#0d1020]! [color-scheme:light]! [font-family:Arial,'Myanmar_Text',sans-serif]! dark:bg-[#131019]! dark:text-[#f1eef7]! dark:[color-scheme:dark]!">
        <main>
          <p>Cloud Nine</p>
          <h1>{t("Something needs another try.")}</h1>
          <p>{t("Refresh this route or return to the storefront.")}</p>
          <Button
            variant="brand"
            size="brand"
            type="button"
            onClick={reset}
            className="mt-4! cursor-pointer! rounded-[.7rem]! border-0! bg-[#7a2cff]! px-4! py-[.8rem]! font-[700]! text-white! [font-family:inherit]! [font-size:inherit]!"
          >
            {t("Try again")}
          </Button>
        </main>
      </body>
    </html>
  );
}
