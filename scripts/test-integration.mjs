import "dotenv/config";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { spawn } from "node:child_process";
import pg from "pg";
const url = new URL(process.env.DATABASE_URL);
assert.ok(["localhost", "127.0.0.1"].includes(url.hostname));
const name = "workspace_integration_" + randomUUID().replaceAll("-", "");
url.pathname = "/postgres";
const control = new pg.Client({ connectionString: url.toString() });
await control.connect();
try {
  await control.query(`CREATE DATABASE "${name}"`);
  url.pathname = "/" + name;
  const code = await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      ["node_modules/vitest/vitest.mjs", "run"],
      {
        stdio: "inherit",
        windowsHide: true,
        env: { ...process.env, TEST_DATABASE_URL: url.toString() },
      }
    );
    child.on("error", reject);
    child.on("exit", resolve);
  });
  process.exitCode = code;
} finally {
  await control.query(`DROP DATABASE IF EXISTS "${name}" WITH (FORCE)`);
  await control.end();
  console.log("Disposable integration database removed.");
}
