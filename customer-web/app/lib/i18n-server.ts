import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import {
  createTranslator,
  intlLocales,
  localeCookie,
  resolveLocale,
} from "@marketplace/shared/i18n";
import { dictionaries } from "@marketplace/shared/locales";

export const getServerI18n = cache(async () => {
  const locale = resolveLocale((await cookies()).get(localeCookie)?.value);
  const messages = dictionaries[locale];
  return {
    locale,
    messages,
    intlLocale: intlLocales[locale],
    t: createTranslator(messages),
  };
});
