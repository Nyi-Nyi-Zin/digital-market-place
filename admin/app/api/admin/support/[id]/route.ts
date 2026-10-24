import { supportDetailHandlers } from "@marketplace/server/operations-http";
export const dynamic = "force-dynamic";
export const { GET, POST, PATCH } = supportDetailHandlers("admin");
