import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { assertApprovedDownload } from "../../../../server/validation";
import { getApprovedOrderForProduct, getDb, isApprovedOwner, products, recordDownload } from "../../../../server/db";
import { storageGetSignedUrl } from "../../../../server/storage";
import { requireUser } from "../../../lib/auth";

export const dynamic = "force-dynamic";
export async function POST(_: Request, { params }: { params: Promise<{ productId: string }> }) { try { const user = await requireUser(); const productId = Number((await params).productId); assertApprovedDownload(await isApprovedOwner(user.id, productId)); const db = await getDb(); const product = db ? (await db.select().from(products).where(eq(products.id, productId)).limit(1))[0] : undefined; if (!product?.digitalFileKey) return new NextResponse("Digital file unavailable", { status: 404 }); const order = await getApprovedOrderForProduct(user.id, productId); await recordDownload(user.id, productId, order!.id); return NextResponse.json({ url: await storageGetSignedUrl(product.digitalFileKey) }); } catch (error) { const status = error instanceof Response ? error.status : 403; const message = error instanceof Error ? error.message : "Payment approval required"; return new NextResponse(message, { status }); } }
