import { NextResponse } from "next/server";
import { z } from "zod";
import { getWishlist, toggleWishlist } from "../../../server/db";
import { requireUser } from "../../lib/auth";

export const dynamic = "force-dynamic";
export async function GET() { try { const user = await requireUser(); return NextResponse.json({ items: await getWishlist(user.id) }); } catch (error) { return new NextResponse("Authentication required", { status: error instanceof Response ? error.status : 401 }); } }
export async function POST(request: Request) { try { const user = await requireUser(); const { productId } = z.object({ productId: z.number().int().positive() }).parse(await request.json()); return NextResponse.json({ wished: await toggleWishlist(user.id, productId) }); } catch (error) { return new NextResponse(error instanceof Error ? error.message : "Unable to update wishlist", { status: error instanceof Response ? error.status : 400 }); } }
