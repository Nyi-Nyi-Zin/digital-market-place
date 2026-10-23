import { NextResponse } from "next/server";
import { requireAdmin } from "@marketplace/server/next-auth";
import { digitalUploadLimitMB, storagePut } from "@marketplace/server/storage";
import { validateImageBytes } from "@marketplace/server/validation";
import { fail, HttpError, readBody } from "@marketplace/server/http";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  try {
    await requireAdmin();
    const maxFileMB = digitalUploadLimitMB();
    const maxBody = (Math.max(maxFileMB, 5) + 1) * 1024 * 1024;
    if (Number(request.headers.get("content-length") ?? 0) > maxBody)
      throw new HttpError(413, "Upload exceeds the configured file limit");
    const body = await readBody(request, maxBody);
    const form = await new Response(new Uint8Array(body), {
      headers: request.headers,
    }).formData();
    const file = form.get("file");
    const kind = form.get("kind");
    if (!(file instanceof File) || !file.size)
      throw new HttpError(400, "Choose a non-empty file");
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
    if (kind === "digital" && file.size > maxFileMB * 1024 * 1024)
      throw new HttpError(
        413,
        `Digital files must be ${maxFileMB} MB or smaller`
      );
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
