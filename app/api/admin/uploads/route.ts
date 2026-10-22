import { NextResponse } from "next/server";
import { requireAdmin } from "../../../lib/auth";
import { storagePut } from "../../../../server/storage";
import { validateImageBytes } from "../../../../server/validation";
import { fail, HttpError, readBody } from "../../../../server/http";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    await requireAdmin();
    if (Number(request.headers.get("content-length") ?? 0) > 26 * 1024 * 1024)
      throw new HttpError(413, "Upload must be 25 MB or smaller");
    const body = await readBody(request, 26 * 1024 * 1024);
    const form = await new Response(new Uint8Array(body), {
      headers: request.headers,
    }).formData();
    const file = form.get("file");
    const kind = form.get("kind");
    if (!(file instanceof File) || !file.size || file.size > 25 * 1024 * 1024)
      throw new HttpError(400, "Choose a file up to 25 MB");
    const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
    const bytes = Buffer.from(await file.arrayBuffer());
    if (kind === "thumbnail") {
      try {
        validateImageBytes(file.type, bytes);
      } catch (e) {
        throw new HttpError(400, (e as Error).message);
      }
    } else if (
      kind !== "digital" ||
      ![
        "zip",
        "pdf",
        "fig",
        "txt",
        "csv",
        "json",
        "xlsx",
        "docx",
        "pptx",
      ].includes(extension)
    ) {
      throw new HttpError(
        400,
        "Use ZIP, PDF, FIG, TXT, CSV, JSON, XLSX, DOCX, or PPTX for digital files"
      );
    }
    const key = `${kind === "thumbnail" ? "product-thumbnails" : "product-files"}/${crypto.randomUUID()}.${kind === "thumbnail" ? file.type.split("/")[1] : extension}`;
    const stored = await storagePut(
      key,
      bytes,
      file.type || "application/octet-stream"
    );
    return NextResponse.json({
      ...stored,
      fileType: extension.toUpperCase(),
      fileSize: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
    });
  } catch (e) {
    return fail(e);
  }
}
