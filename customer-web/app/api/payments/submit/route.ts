import { NextResponse } from "next/server";
import { requireUser } from "@marketplace/server/next-auth";
import { submitEvidence } from "@marketplace/server/marketplace";
import { fail, readJson } from "@marketplace/server/http";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    const user = await requireUser();
    return NextResponse.json(
      await submitEvidence(user.id, await readJson(request)),
      { status: 201 }
    );
  } catch (e) {
    return fail(e);
  }
}
