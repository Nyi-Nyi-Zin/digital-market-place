import "dotenv/config";
import { processNotificationBatch } from "../packages/server/src/notification-worker";
import { getDb } from "../packages/server/src/database";

let stopping = false;
process.on("SIGINT", () => {
  stopping = true;
});
process.on("SIGTERM", () => {
  stopping = true;
});
console.log(
  "Notification worker started; checking the delivery queue every five seconds."
);
try {
  do {
    try {
      const result = await processNotificationBatch();
      if (result.processed) console.log("Notification batch", result);
    } catch {
      console.error(
        "Notification worker could not process the queue; retrying."
      );
      if (process.argv.includes("--once")) process.exitCode = 1;
    }
    if (!stopping && !process.argv.includes("--once"))
      await new Promise(resolve => setTimeout(resolve, 5000));
  } while (!stopping && !process.argv.includes("--once"));
} finally {
  await getDb().$client.end();
}
