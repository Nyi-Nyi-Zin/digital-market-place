import { NextResponse } from "next/server";
import { catalog } from "../../../server/catalog";
import { fail } from "../../../server/http";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    return NextResponse.json(
      await catalog(Object.fromEntries(new URL(request.url).searchParams))
    );
  } catch (error) {
    return fail(error);
  }
}
