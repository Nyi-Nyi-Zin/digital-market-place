"use client";
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
    <html lang={locale}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: "2rem",
          fontFamily: 'Arial, "Myanmar Text", sans-serif',
          textAlign: "center",
          background: dark ? "#131019" : "#fbfbfd",
          color: dark ? "#f1eef7" : "#0d1020",
          colorScheme: dark ? "dark" : "light",
        }}
      >
        <main>
          <p>Cloud Nine</p>
          <h1>{t("Something needs another try.")}</h1>
          <p>{t("Refresh this route or return to the storefront.")}</p>
          <Button
            variant="brand"
            size="brand"
            type="button"
            onClick={reset}
            style={{
              marginTop: "1rem",
              padding: ".8rem 1rem",
              border: 0,
              borderRadius: ".7rem",
              background: "#7a2cff",
              color: "white",
              font: "inherit",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {t("Try again")}
          </Button>
        </main>
      </body>
    </html>
  );
}
