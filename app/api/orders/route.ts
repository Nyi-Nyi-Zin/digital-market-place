import { NextResponse } from "next/server";
import { z } from "zod";
import { createOrder, getPurchases } from "../../../server/db";
import { requireUser } from "../../lib/auth";

export const dynamic = "force-dynamic";
const schema = z.object({ customerName: z.string().min(2), customerEmail: z.string().email(), items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().positive().max(1) })).min(1) });
export async function GET() { try { const user = await requireUser(); return NextResponse.json({ purchases: await getPurchases(user.id) }); } catch (error) { return new NextResponse("Authentication required", { status: 401 }); } }
export async function POST(request: Request) { try { const user = await requireUser(); const input = schema.parse(await request.json()); return NextResponse.json(await createOrder(user.id, input.customerName, input.customerEmail, input.items), { status: 201 }); } catch (error) { const message = error instanceof z.ZodError ? "Invalid order data" : error instanceof Error ? error.message : "Unable to create order"; const status = error instanceof Response ? error.status : 400; return new NextResponse(message, { status }); } }
