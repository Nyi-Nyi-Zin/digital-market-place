import { spawn } from "node:child_process";

// Windows does not forward termination signals to a launcher's child processes.
export function stopProcess(child, signal = "SIGTERM") {
  if (!child.pid || child.exitCode !== null) return;
  if (process.platform === "win32") {
    const stop = spawn("taskkill", ["/PID", String(child.pid), "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
    });
    stop.on("error", () => child.kill(signal));
  } else {
    child.kill(signal);
  }
}
