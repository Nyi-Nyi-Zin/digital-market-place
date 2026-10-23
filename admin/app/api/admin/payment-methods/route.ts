import { NextResponse } from "next/server";
import { requireAdmin } from "@marketplace/server/next-auth";
import { getDb, paymentMethods } from "@marketplace/server/db";
import { paymentMethodInput } from "@marketplace/shared/marketplace-validation";
import { fail, readJson } from "@marketplace/server/http";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({
      methods: await getDb().select().from(paymentMethods),
    });
  } catch (e) {
    return fail(e);
  }
}
export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const { id, ...input } = paymentMethodInput.parse(await readJson(request));
    const [method] = await getDb()
      .insert(paymentMethods)
      .values(input)
      .onConflictDoUpdate({ target: paymentMethods.name, set: input })
      .returning();
    return NextResponse.json({ method });
  } catch (e) {
    return fail(e);
  }
}
