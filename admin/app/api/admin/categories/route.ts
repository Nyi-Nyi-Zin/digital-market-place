import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@marketplace/server/next-auth";
import { getDb, categories } from "@marketplace/server/db";
import { categoryInput } from "@marketplace/shared/marketplace-validation";
import { fail, readJson, HttpError } from "@marketplace/server/http";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const input = categoryInput.parse(await readJson(request));
    const [category] = await getDb()
      .insert(categories)
      .values(input)
      .returning();
    return NextResponse.json({ category }, { status: 201 });
  } catch (e) {
    return fail(e);
  }
}
export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const raw = await readJson(request);
    const input = categoryInput.parse(raw);
    const [category] = await getDb()
      .update(categories)
      .set(input)
      .where(eq(categories.id, Number(raw.id)))
      .returning();
    if (!category) throw new HttpError(404, "Category not found");
    return NextResponse.json({ category });
  } catch (e) {
    return fail(e);
  }
}
export async function DELETE(request: Request) {
  try {
    await requireAdmin();
    const id = Number(new URL(request.url).searchParams.get("id"));
    if (!Number.isInteger(id) || id < 1)
      throw new HttpError(400, "Invalid category");
    await getDb().delete(categories).where(eq(categories.id, id));
    return NextResponse.json({ success: true });
  } catch (e) {
    return fail(e);
  }
}
