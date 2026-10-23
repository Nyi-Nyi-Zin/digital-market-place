import { NextResponse } from "next/server";
import { z } from "zod";
import { getWishlist, toggleWishlist } from "@marketplace/server/db";
import { requireUser } from "@marketplace/server/next-auth";
import { fail, readJson } from "@marketplace/server/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const user = await requireUser();
    const items = (await getWishlist(user.id)).map(({ product }) => ({
      product: {
        id: product.id,
        title: product.title,
        slug: product.slug,
        shortDescription: product.shortDescription,
        status: product.status,
      },
    }));
    return NextResponse.json({ items });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const { productId } = z
      .object({ productId: z.number().int().positive() })
      .parse(await readJson(request));
    return NextResponse.json({
      wished: await toggleWishlist(user.id, productId),
    });
  } catch (e) {
    return fail(e);
  }
}
