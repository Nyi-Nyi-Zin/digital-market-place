import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrder } from "@marketplace/server/db";
import { customerOrders } from "@marketplace/server/customer-orders";
import { requireUser } from "@marketplace/server/next-auth";
import { fail, readJson, HttpError } from "@marketplace/server/http";
export const dynamic = "force-dynamic";
const schema = z.object({
  customerName: z.string().trim().min(2).max(160),
  customerEmail: z.string().email().max(320),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.literal(1),
      })
    )
    .min(1)
    .max(100),
});
export async function GET() {
  try {
    const user = await requireUser();
    return NextResponse.json({ orders: await customerOrders(user.id) });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = schema.parse(await readJson(request));
    let result;
    try {
      result = await createOrder(
        user.id,
        input.customerName,
        input.customerEmail,
        input.items
      );
    } catch (e) {
      throw new HttpError(400, (e as Error).message);
    }
    return NextResponse.json(
      { orderId: result.orderId, total: result.total },
      { status: 201 }
    );
  } catch (e) {
    return fail(e);
  }
}
