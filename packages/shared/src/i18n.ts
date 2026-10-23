export const locales = ["en", "my", "th", "ja", "zh"] as const;
export type Locale = (typeof locales)[number];
export const localeCookie = "cloud-nine-locale";
export const localeNames: Record<Locale, string> = {
  en: "English",
  my: "မြန်မာ",
  th: "ไทย",
  ja: "日本語",
  zh: "中文",
};
export const intlLocales: Record<Locale, string> = {
  en: "en-US",
  my: "my-MM",
  th: "th-TH",
  ja: "ja-JP",
  zh: "zh-CN",
};
export type Messages = Record<string, string>;
export type TranslationValues = Record<string, string | number>;
export function resolveLocale(value: string | undefined): Locale {
  return locales.includes(value as Locale) ? (value as Locale) : "en";
}
// English source messages are stable keys; unknown API/content strings stay intact.
export function createTranslator(messages: Messages) {
  return (message: string, values: TranslationValues = {}) => {
    const template = Object.prototype.hasOwnProperty.call(messages, message)
      ? messages[message]
      : message;
    return template.replace(/\{(\w+)\}/g, (match, key: string) =>
      Object.prototype.hasOwnProperty.call(values, key)
        ? String(values[key])
        : match
    );
  };
}
