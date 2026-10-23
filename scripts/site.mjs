import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { stopProcess } from "./stop-process.mjs";

const [site, command, ...args] = process.argv.slice(2);
if (
  !["customer", "admin"].includes(site) ||
  !["dev", "build", "start", "typegen"].includes(command)
) {
  throw new Error(
    "Usage: node scripts/site.mjs <customer|admin> <dev|build|start|typegen> [Next.js options]"
  );
}
const root = fileURLToPath(new URL("../", import.meta.url));
config({ path: new URL("../.env", import.meta.url), quiet: true });
const siteOrigin =
  site === "admin"
    ? (process.env.NEXT_PUBLIC_ADMIN_URL ?? "http://localhost:3001")
    : (process.env.NEXT_PUBLIC_CUSTOMER_URL ?? "http://localhost:3000");
const port = new URL(siteOrigin).port || (site === "admin" ? "3001" : "3000");
const directory = site === "admin" ? "admin" : "customer-web";
const nextArgs = [command, ...args];
if (
  ["dev", "start"].includes(command) &&
  !args.some(arg => ["--port", "-p"].includes(arg))
) {
  nextArgs.push("--port", process.env.PORT || port);
}
const require = createRequire(
  new URL(`../${directory}/package.json`, import.meta.url)
);
const buildNodeOptions =
  process.platform === "win32" && command === "build"
    ? `${process.env.NODE_OPTIONS ?? ""} --require=${JSON.stringify(fileURLToPath(new URL("./windows-build-links.cjs", import.meta.url)))}`.trim()
    : process.env.NODE_OPTIONS;
const child = spawn(
  process.execPath,
  [require.resolve("next/dist/bin/next"), ...nextArgs],
  {
    cwd: fileURLToPath(new URL(`../${directory}/`, import.meta.url)),
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: command === "dev" ? "development" : "production",
      MARKETPLACE_SITE: site,
      BETTER_AUTH_URL: siteOrigin,
      ...(buildNodeOptions ? { NODE_OPTIONS: buildNodeOptions } : {}),
    },
  }
);
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => stopProcess(child, signal));
}
child.on("error", error => {
  console.error(error.message);
  process.exitCode = 1;
});
child.on("exit", code => {
  process.exitCode = code ?? 1;
});
