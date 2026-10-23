"use client";
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
    <html lang={locale}>
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          padding: 24,
          fontFamily: 'Arial, "Myanmar Text", sans-serif',
          background: dark ? "#11151f" : "#f5f6fa",
          color: dark ? "#edf0f7" : "#182033",
          colorScheme: dark ? "dark" : "light",
        }}
      >
        <main style={{ maxWidth: 480 }}>
          <p>Cloud Nine · Admin</p>
          <h1>{t("Something needs another try.")}</h1>
          <button
            onClick={reset}
            style={{
              padding: "12px 20px",
              background: "#6954dc",
              color: "white",
              border: 0,
              borderRadius: 8,
              cursor: "pointer",
              font: "inherit",
            }}
          >
            {t("Try again")}
          </button>
        </main>
      </body>
    </html>
  );
}
