import { describe, expect, it } from "vitest";
import {
  availableCurrency,
  baseCurrency,
  convertAmount,
  currencyConfig,
  currencyInput,
  exchangeRateInput,
  sumAmounts,
  toBaseAmount,
  multiplyAmount,
} from "@marketplace/shared/currency";
import {
  formatOrderItem,
  formatOrderSubtotal,
  formatOrderTotal,
  formatPrice,
} from "@marketplace/shared/pricing";
import { settingsInput, defaultSettings } from "@marketplace/shared/store";

describe("store currencies", () => {
  it("converts entry prices back to base with exact decimal division", () => {
    expect(toBaseAmount("42000", "4200")).toBe("10.00");
    expect(toBaseAmount("13.50", "1.35")).toBe("10.00");
    expect(toBaseAmount("1", "3")).toBe("0.33");
    expect(toBaseAmount("2.01", "2")).toBe("1.01");
    expect(() => toBaseAmount("10", "0")).toThrow();
  });
  it("multiplies rounded unit prices without rounding a converted line again", () => {
    expect(multiplyAmount(convertAmount("0.01", "1.5", "SGD"), 3)).toBe("0.06");
    expect(multiplyAmount("99999999.99", 99)).toBe("9899999999.01");
    for (const quantity of [0, -1, 1.5, 100, NaN])
      expect(() => multiplyAmount("1", quantity)).toThrow();
  });
  it("supports only USD, SGD and MMK and keeps unconfigured currencies unavailable", () => {
    expect(currencyInput.options).toEqual(["USD", "SGD", "MMK"]);
    expect(currencyInput.safeParse("EUR").success).toBe(false);
    const config = currencyConfig({
      usdRate: null,
      sgdRate: null,
      mmkRate: null,
    });
    expect(config.rates[baseCurrency]).toBe("1");
    expect(availableCurrency("SGD", config)).toBe(baseCurrency);
    expect(availableCurrency("<script>", config)).toBe(baseCurrency);
    expect(
      availableCurrency("SGD", {
        ...config,
        rates: { ...config.rates, SGD: "1.3" },
      })
    ).toBe("SGD");
  });
  it("rejects invalid rates and accepts explicit disabling", () => {
    for (const value of [
      "0",
      "0.00000000",
      "-1",
      "Infinity",
      "NaN",
      "1e3",
      "1.123456789",
      "100000000",
      "",
    ])
      expect(exchangeRateInput.safeParse(value).success, value).toBe(false);
    expect(exchangeRateInput.parse("0.00000001")).toBe("0.00000001");
    expect(exchangeRateInput.parse(null)).toBeNull();
    expect(
      settingsInput.parse({
        ...defaultSettings,
        sgdRate: "1.3",
        mmkRate: "4200",
      }).mmkRate
    ).toBe("4200");
  });
  it("rounds decimal conversions exactly, including MMK whole kyat", () => {
    expect(convertAmount("19.99", "1.35", "SGD")).toBe("26.99");
    expect(convertAmount("1.005", "1", "USD")).toBe("1.01");
    expect(convertAmount("0.10", "1.25", "SGD")).toBe("0.13");
    expect(convertAmount("9.99", "4200", "MMK")).toBe("41958");
    expect(convertAmount("0.01", "4250", "MMK")).toBe("43");
    expect(convertAmount("99999999.99", "99999999.99999999", "SGD")).toBe(
      "9999999998999999.00"
    );
    expect(convertAmount("0", "4200", "MMK")).toBe("0");
    expect(() => convertAmount("-1", "1", "USD")).toThrow();
    expect(() => convertAmount("1", "0", "USD")).toThrow();
  });
  it("sums rounded item prices so the order total matches its items", () => {
    const prices = ["0.01", "0.01"].map(value =>
      convertAmount(value, "1.5", "SGD")
    );
    expect(prices).toEqual(["0.02", "0.02"]);
    expect(sumAmounts(prices)).toBe("0.04");
    const order = {
      currency: "SGD",
      exchangeRate: "1.5",
      payableTotal: "0.04",
      total: "0.02",
      discount: "0.00",
    };
    expect(formatOrderTotal(order)).toBe(formatPrice("0.04", "en-US", "SGD"));
    expect(formatOrderSubtotal(order)).toBe(formatOrderTotal(order));
    expect(
      formatOrderItem({ unitPrice: "0.01", payableUnitPrice: "0.02" }, order)
    ).toBe(formatPrice("0.02", "en-US", "SGD"));
  });
  it("keeps legacy order totals and explicitly identifies each currency", () => {
    const legacy = {
      currency: "USD",
      exchangeRate: "1",
      payableTotal: null,
      total: "19.50",
    };
    expect(formatOrderTotal(legacy)).toBe(formatPrice("19.50", "en-US", "USD"));
    expect(formatPrice("1.00", "en-US", "SGD")).toContain("SGD");
    expect(formatPrice("4200", "my-MM", "MMK")).toContain("၄,၂၀၀");
  });
});
