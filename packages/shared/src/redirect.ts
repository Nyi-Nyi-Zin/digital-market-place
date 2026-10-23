export function safeNextPath(
  value: string | null | undefined,
  fallback: "/" | "/account" = "/account"
) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\r\n]/.test(value)
  )
    return fallback;
  const url = new URL(value, "https://local.invalid");
  return url.origin === "https://local.invalid"
    ? `${url.pathname}${url.search}${url.hash}`
    : fallback;
}
