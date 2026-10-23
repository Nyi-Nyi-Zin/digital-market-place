import { config } from "dotenv";
import { fileURLToPath } from "node:url";

const workspace = fileURLToPath(new URL("../", import.meta.url));
config({
  path: fileURLToPath(new URL("../.env", import.meta.url)),
  quiet: true,
});

/** @param {"customer" | "admin"} site
 * @returns {import("next").NextConfig}
 */
export function siteConfig(site) {
  const customer = new URL(
    process.env.NEXT_PUBLIC_CUSTOMER_URL ?? "http://localhost:3000"
  ).origin;
  const admin = new URL(
    process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001"
  ).origin;
  if (customer === admin)
    throw new Error("Customer and admin sites must use different origins");
  return {
    reactStrictMode: true,
    output: "standalone",
    transpilePackages: ["@marketplace/server", "@marketplace/shared"],
    distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
    outputFileTracingRoot: workspace,
    env: {
      NEXT_PUBLIC_MARKETPLACE_SITE: site,
      NEXT_PUBLIC_SITE_ORIGIN: site === "admin" ? admin : customer,
      NEXT_PUBLIC_CUSTOMER_URL: customer,
      NEXT_PUBLIC_ADMIN_URL: admin,
    },
    async redirects() {
      return site === "customer"
        ? [
            { source: "/products", destination: "/", permanent: true },
            {
              source: "/admin/:path*",
              destination: `${admin}/:path*`,
              permanent: false,
            },
          ]
        : [
            {
              source: "/admin/:path*",
              destination: "/:path*",
              permanent: false,
            },
          ];
    },
  };
}
