import { activityLogs } from "./schema";
import type { getDb } from "./database";
type Transaction = Parameters<
  Parameters<ReturnType<typeof getDb>["transaction"]>[0]
>[0];
export async function recordActivity(
  db: Transaction,
  actorId: number,
  action: string,
  target: string
) {
  await db.insert(activityLogs).values({ actorId, action, target });
}
