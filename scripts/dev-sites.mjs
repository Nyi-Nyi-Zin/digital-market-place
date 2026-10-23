import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { stopProcess } from "./stop-process.mjs";

const launcher = fileURLToPath(new URL("./site.mjs", import.meta.url));
const children = ["customer", "admin"].map(site =>
  spawn(process.execPath, [launcher, site, "dev"], { stdio: "inherit" })
);
let stopping = false;
function stop(signal = "SIGTERM") {
  if (stopping) return;
  stopping = true;
  for (const child of children) stopProcess(child, signal);
}
for (const signal of ["SIGINT", "SIGTERM"])
  process.on(signal, () => stop(signal));
for (const child of children) {
  child.on("error", error => {
    console.error(error.message);
    process.exitCode = 1;
    stop();
  });
  child.on("exit", code => {
    if (!stopping) {
      process.exitCode = code ?? 1;
      stop();
    }
  });
}
