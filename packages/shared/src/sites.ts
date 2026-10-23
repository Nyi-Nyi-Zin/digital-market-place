export const isAdminSite = process.env.NEXT_PUBLIC_MARKETPLACE_SITE === "admin";

export const customerSiteUrl =
  process.env.NEXT_PUBLIC_CUSTOMER_URL ?? "http://localhost:3000";

export const adminSiteUrl =
  process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001";

export function adminHref(path = "/admin") {
  const localPath = path.replace(/^\/admin(?=\/|$)/, "") || "/";
  return isAdminSite ? localPath : new URL(localPath, adminSiteUrl).toString();
}
