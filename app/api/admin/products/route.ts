import { NextResponse } from "next/server";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { getDb, products } from "../../../../server/db";
import { requireAdmin } from "../../../lib/auth";

export const dynamic = "force-dynamic";
const createSchema = z.object({ title: z.string().min(2), slug: z.string().min(2), categoryId: z.number().int().positive(), price: z.string(), status: z.enum(["draft", "published"]).default("draft"), featured: z.boolean().default(false) });
const updateSchema = createSchema.partial().extend({ id: z.number().int().positive(), discountPrice: z.string().optional() });
export async function GET() { try { await requireAdmin(); const db = await getDb(); return NextResponse.json({ products: db ? await db.select().from(products) : [] }); } catch (error) { return new NextResponse("Administrator access required", { status: error instanceof Response ? error.status : 403 }); } }
export async function POST(request: Request) { try { await requireAdmin(); const input = createSchema.parse(await request.json()); const db = await getDb(); if (!db) return new NextResponse("Database unavailable", { status: 503 }); await db.insert(products).values(input); return NextResponse.json({ success: true }, { status: 201 }); } catch (error) { return new NextResponse(error instanceof Error ? error.message : "Unable to create product", { status: 400 }); } }
export async function PATCH(request: Request) { try { await requireAdmin(); const input = updateSchema.parse(await request.json()); const { id, ...changes } = input; const db = await getDb(); if (!db) return new NextResponse("Database unavailable", { status: 503 }); await db.update(products).set(changes).where(eq(products.id, id)); return NextResponse.json({ success: true }); } catch (error) { return new NextResponse(error instanceof Error ? error.message : "Unable to update product", { status: 400 }); } }
export async function DELETE(request: Request) { try { await requireAdmin(); const id = Number(new URL(request.url).searchParams.get("id")); if (!Number.isInteger(id) || id <= 0) return new NextResponse("Invalid product id", { status: 400 }); const db = await getDb(); if (!db) return new NextResponse("Database unavailable", { status: 503 }); await db.delete(products).where(eq(products.id, id)); return NextResponse.json({ success: true }); } catch (error) { return new NextResponse(error instanceof Error ? error.message : "Unable to delete product", { status: error instanceof Response ? error.status : 400 }); } }
