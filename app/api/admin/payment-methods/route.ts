import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb } from "../../../../server/db";
import { paymentMethods } from "../../../../drizzle/schema";
import { requireAdmin } from "../../../lib/auth";

export const dynamic = "force-dynamic";
const schema = z.object({ id: z.number().int().positive(), enabled: z.boolean(), accountName: z.string().min(2), accountNumber: z.string().min(3), instructions: z.string().max(1000).optional() });
export async function GET() { try { await requireAdmin(); const db = await getDb(); return NextResponse.json({ methods: db ? await db.select().from(paymentMethods) : [] }); } catch (error) { return new NextResponse("Administrator access required", { status: error instanceof Response ? error.status : 403 }); } }
export async function PATCH(request: Request) { try { await requireAdmin(); const { id, ...changes } = schema.parse(await request.json()); const db = await getDb(); if (!db) return new NextResponse("Database unavailable", { status: 503 }); await db.update(paymentMethods).set(changes).where(eq(paymentMethods.id, id)); return NextResponse.json({ success: true }); } catch (error) { return new NextResponse(error instanceof Error ? error.message : "Unable to update payment method", { status: error instanceof Response ? error.status : 400 }); } }

