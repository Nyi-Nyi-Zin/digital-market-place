import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@marketplace/server/next-auth";
import {
  listPublicReviews,
  writeReview,
} from "@marketplace/server/marketplace";
import { fail, readJson } from "@marketplace/server/http";
export const dynamic = "force-dynamic";
const schema = z.object({
  productId: z.number().int().positive(),
  rating: z.number().int().min(1).max(5),
  body: z.string().trim().min(2).max(2000),
});
export async function GET(request: Request) {
  try {
    const id = z.coerce
      .number()
      .int()
      .positive()
      .parse(new URL(request.url).searchParams.get("productId"));
    return NextResponse.json({ reviews: await listPublicReviews(id) });
  } catch (e) {
    return fail(e);
  }
}
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    const input = schema.parse(await readJson(request));
    return NextResponse.json(
      await writeReview(user.id, input.productId, input.rating, input.body)
    );
  } catch (e) {
    return fail(e);
  }
}
