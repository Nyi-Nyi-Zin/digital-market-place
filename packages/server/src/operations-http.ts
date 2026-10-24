import { NextResponse } from "next/server";
import { requireAdmin, requireUser } from "./next-auth";
import { fail, HttpError, readJson } from "./http";
import { positiveId } from "@marketplace/shared/store";
import {
  orderDetail,
  adminOrderDetail,
  addOrderNote,
  listCustomers,
  customerDetail,
  listActivity,
  salesReport,
  reportCsv,
} from "./operations";
import {
  createTicket,
  listTickets,
  ticketDetail,
  replyToTicket,
  changeTicketStatus,
} from "./support";
import {
  getStoreSettings,
  getStoreDocument,
  saveStoreSettings,
  saveStoreDocument,
} from "./store";

type Context = { params: Promise<{ id?: string }> };
type Actor = Awaited<ReturnType<typeof requireUser>>;
type Run = (request: Request, actor: Actor, id?: number) => Promise<unknown>;
function privateRoute(
  audience: "customer" | "admin",
  run: Run,
  detail?: false
): (request: Request) => Promise<Response>;
function privateRoute(
  audience: "customer" | "admin",
  run: Run,
  detail: true
): (request: Request, context: Context) => Promise<Response>;
function privateRoute(
  audience: "customer" | "admin",
  run: Run,
  detail = false
) {
  return async (request: Request, context?: Context) => {
    let response: Response;
    try {
      const actor = await (audience === "admin"
        ? requireAdmin()
        : requireUser());
      if (!["GET", "HEAD"].includes(request.method)) {
        const configured =
          audience === "admin"
            ? process.env.NEXT_PUBLIC_ADMIN_URL
            : process.env.NEXT_PUBLIC_CUSTOMER_URL;
        const expected = new URL(configured ?? request.url).origin;
        if (
          request.headers.get("sec-fetch-site") === "cross-site" ||
          (request.headers.get("origin") &&
            request.headers.get("origin") !== expected)
        )
          throw new HttpError(403, "Invalid request origin");
      }
      const id = detail
        ? positiveId.parse((await context!.params).id)
        : undefined;
      const value = await run(request, actor, id);
      response = value instanceof Response ? value : NextResponse.json(value);
    } catch (error) {
      response = fail(error);
    }
    response.headers.set("Cache-Control", "private, no-store");
    return response;
  };
}
const query = (request: Request) =>
  Object.fromEntries(new URL(request.url).searchParams);
export function orderHandlers(audience: "customer" | "admin") {
  return {
    GET: privateRoute(
      audience,
      async (_r, actor, id) =>
        audience === "admin"
          ? adminOrderDetail(id!)
          : orderDetail(id!, actor.id),
      true
    ),
    POST: privateRoute(
      "admin",
      async (r, actor, id) =>
        addOrderNote(id!, actor.id, await readJson(r, 32768)),
      true
    ),
  };
}
export const customersHandler = privateRoute("admin", async r =>
  listCustomers(query(r))
);
export const customerHandler = privateRoute(
  "admin",
  async (r, _a, id) => customerDetail(id!, query(r)),
  true
);
export const activityHandler = privateRoute("admin", async r =>
  listActivity(query(r))
);
export const reportsHandler = privateRoute("admin", async r => {
  const report = await salesReport(query(r));
  return new URL(r.url).searchParams.get("format") === "csv"
    ? new Response(reportCsv(report), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="cloud-nine-${report.from}-${report.to}.csv"`,
        },
      })
    : report;
});
export function supportHandlers(audience: "customer" | "admin") {
  return {
    GET: privateRoute(audience, async (r, actor) =>
      listTickets(audience === "admin" ? undefined : actor.id, query(r))
    ),
    POST: privateRoute("customer", async (r, actor) =>
      NextResponse.json(
        { ticket: await createTicket(actor.id, await readJson(r, 32768)) },
        { status: 201 }
      )
    ),
  };
}
export function supportDetailHandlers(audience: "customer" | "admin") {
  return {
    GET: privateRoute(
      audience,
      async (_r, actor, id) =>
        ticketDetail(id!, audience === "admin" ? undefined : actor.id),
      true
    ),
    POST: privateRoute(
      audience,
      async (r, actor, id) =>
        replyToTicket(id!, actor.id, audience, await readJson(r, 32768)),
      true
    ),
    PATCH: privateRoute(
      "admin",
      async (r, actor, id) =>
        changeTicketStatus(id!, actor.id, await readJson(r, 1024)),
      true
    ),
  };
}
export const settingsHandlers = {
  GET: privateRoute("admin", async () => getStoreSettings()),
  PATCH: privateRoute("admin", async (r, actor) =>
    saveStoreSettings(actor.id, await readJson(r, 4096))
  ),
};
export const contentHandlers = {
  GET: privateRoute("admin", async r => {
    const q = query(r);
    return getStoreDocument(q.key, q.locale);
  }),
  PATCH: privateRoute("admin", async (r, actor) =>
    saveStoreDocument(actor.id, await readJson(r, 600000))
  ),
};
