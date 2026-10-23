"use client";

import { createContext, useContext, useMemo, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createTranslator,
  intlLocales,
  localeCookie,
  type Locale,
  type Messages,
} from "@marketplace/shared/i18n";

type I18nContextValue = {
  locale: Locale;
  intlLocale: string;
  t: ReturnType<typeof createTranslator>;
  changeLocale: (locale: Locale) => void;
  changingLocale: boolean;
};
const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({
  children,
  locale,
  messages,
}: {
  children: React.ReactNode;
  locale: Locale;
  messages: Messages;
}) {
  const router = useRouter();
  const [changingLocale, startTransition] = useTransition();
  const t = useMemo(() => createTranslator(messages), [messages]);
  function changeLocale(next: Locale) {
    if (next === locale) return;
    document.cookie = `${localeCookie}=${next}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
    startTransition(() => router.refresh());
  }
  return (
    <I18nContext.Provider
      value={{
        locale,
        intlLocale: intlLocales[locale],
        t,
        changeLocale,
        changingLocale,
      }}
    >
      {children}
    </I18nContext.Provider>
  );
}
export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) throw new Error("useI18n must be used inside I18nProvider");
  return context;
}
