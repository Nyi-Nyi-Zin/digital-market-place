import { recordActivity } from "@marketplace/server/activity";
import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { requireAdmin } from "@marketplace/server/next-auth";
import { getDb, categories } from "@marketplace/server/db";
import { categoryInput } from "@marketplace/shared/marketplace-validation";
import { fail, readJson, HttpError } from "@marketplace/server/http";
import { insertWithGeneratedSlug } from "@marketplace/server/slugs";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const actor = await requireAdmin();
    return await getDb().transaction(async tx => {
      const input = categoryInput.parse(await readJson(request));
      const category = await insertWithGeneratedSlug(
        input.name,
        140,
        "category",
        async slug => {
          const [created] = await tx
            .insert(categories)
            .values({ ...input, slug })
            .onConflictDoNothing({ target: categories.slug })
            .returning();
          return created;
        }
      );
      await recordActivity(
        tx,
        actor.id,
        "Category created",
        `category:${category.id}`
      );
      return NextResponse.json({ category }, { status: 201 });
    });
  } catch (e) {
    return fail(e);
  }
}
export async function PATCH(request: Request) {
  try {
    const actor = await requireAdmin();
    return await getDb().transaction(async tx => {
      const raw = await readJson(request);
      const input = categoryInput.parse(raw);
      const [category] = await tx
        .update(categories)
        .set(input)
        .where(eq(categories.id, Number(raw.id)))
        .returning();
      if (!category) throw new HttpError(404, "Category not found");
      await recordActivity(
        tx,
        actor.id,
        "Category updated",
        `category:${category.id}`
      );
      return NextResponse.json({ category });
    });
  } catch (e) {
    return fail(e);
  }
}
export async function DELETE(request: Request) {
  try {
    const actor = await requireAdmin();
    return await getDb().transaction(async tx => {
      const id = Number(new URL(request.url).searchParams.get("id"));
      if (!Number.isInteger(id) || id < 1)
        throw new HttpError(400, "Invalid category");
      const [deleted] = await tx
        .delete(categories)
        .where(eq(categories.id, id))
        .returning({ id: categories.id });
      if (!deleted) throw new HttpError(404, "Category not found");
      await recordActivity(tx, actor.id, "Category deleted", `category:${id}`);
      return NextResponse.json({ success: true });
    });
  } catch (e) {
    return fail(e);
  }
}
