export function safeNextPath(value: string | null | undefined) {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    /[\\\r\n]/.test(value)
  )
    return "/account";
  const url = new URL(value, "https://local.invalid");
  return url.origin === "https://local.invalid"
    ? `${url.pathname}${url.search}${url.hash}`
    : "/account";
}
