import { NextResponse } from "next/server";
import { ENV } from "../../../server/_core/env";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ key: string[] }> }) {
  const key = (await params).key.join("/");
  if (!key || !ENV.forgeApiUrl || !ENV.forgeApiKey) return new NextResponse("Storage proxy is unavailable", { status: 503 });
  try {
    const forgeUrl = new URL("v1/storage/presign/get", `${ENV.forgeApiUrl.replace(/\/+$/, "")}/`);
    forgeUrl.searchParams.set("path", key);
    const presign = await fetch(forgeUrl, { headers: { Authorization: `Bearer ${ENV.forgeApiKey}` } });
    if (!presign.ok) return new NextResponse("Storage backend error", { status: 502 });
    const { url } = await presign.json() as { url?: string };
    if (!url) return new NextResponse("Storage URL is unavailable", { status: 502 });
    return NextResponse.redirect(url, { status: 307, headers: { "Cache-Control": "no-store" } });
  } catch {
    return new NextResponse("Storage proxy error", { status: 502 });
  }
}
