// Some browsers do not ship Myanmar ICU data. Use a deterministic digit mapping
// so prices and dates agree between server rendering and browser interactions.
export function localizeDigits(value: string, locale: string) {
  return locale.startsWith("my")
    ? value.replace(/[0-9]/g, digit => "၀၁၂၃၄၅၆၇၈၉"[Number(digit)])
    : value;
}

export function formatDate(
  value: string | Date,
  locale: string,
  includeTime = true
) {
  const options: Intl.DateTimeFormatOptions = {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    ...(includeTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  };
  const text = new Intl.DateTimeFormat(
    locale.startsWith("my") ? "en-GB" : locale,
    options
  ).format(new Date(value));
  return localizeDigits(text, locale);
}
