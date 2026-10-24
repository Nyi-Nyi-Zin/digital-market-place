import { describe, expect, it } from "vitest";
import {
  createTranslator,
  intlLocales,
  locales,
  resolveLocale,
} from "@marketplace/shared/i18n";
import { dictionaries } from "@marketplace/shared/locales";
import { formatPrice } from "@marketplace/shared/pricing";
import { formatDate, localizeDigits } from "@marketplace/shared/format";

describe("marketplace language dictionaries", () => {
  for (const locale of locales) {
    it(`${locale} covers every message and preserves interpolation parameters`, () => {
      const dictionary = dictionaries[locale];
      expect(Object.keys(dictionary).sort()).toEqual(
        Object.keys(dictionaries.en).sort()
      );
      for (const [message, translated] of Object.entries(dictionary)) {
        expect(translated.trim(), `${locale}: ${message}`).not.toBe("");
        expect(translated, `${locale}: ${message}`).not.toContain("\uFFFD");
        expect(translated, `${locale}: ${message}`).not.toMatch(/\?{2,}/);
        expect(
          [...translated.matchAll(/\{\w+\}/g)].map(m => m[0]).sort(),
          `${locale}: ${message}`
        ).toEqual([...message.matchAll(/\{\w+\}/g)].map(m => m[0]).sort());
      }
    });
  }
  it("falls back safely for missing and invalid locale cookies", () => {
    expect(resolveLocale(undefined)).toBe("en");
    expect(resolveLocale("<script>")).toBe("en");
    expect(resolveLocale("zh")).toBe("zh");
  });
  it("supports reordered values and leaves user content and unknown errors intact", () => {
    const t = createTranslator(dictionaries.ja);
    expect(t("View {title}", { title: "Studio UI" })).toBe("Studio UIを見る");
    expect(t("Original product title")).toBe("Original product title");
    expect(t("constructor")).toBe("constructor");
    expect(t("View {title}", { title: "<script>{count}</script>" })).toBe(
      "<script>{count}</script>を見る"
    );
  });
  it("localizes prices while preserving the configured currency and amount", () => {
    for (const locale of locales) {
      expect(formatPrice(0, intlLocales[locale])).toBeTruthy();
      expect(formatPrice("19.50", intlLocales[locale])).toBeTruthy();
    }
    expect(formatPrice("19.50", "en-US")).toBe(formatPrice(19.5, "en-US"));
    expect(formatPrice(33, "my-MM")).toBe(
      localizeDigits(formatPrice(33, "en-US"), "my-MM")
    );
    expect(formatDate(new Date(2026, 9, 22, 12), "my-MM", false)).toBe(
      "၂၂/၁၀/၂၀၂၆"
    );
  });
});
