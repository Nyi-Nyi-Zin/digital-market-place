import { NextResponse } from "next/server";
import { ZodError } from "zod";
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string
  ) {
    super(message);
  }
}
export function fail(error: unknown) {
  if (error instanceof Response)
    return NextResponse.json(
      {
        error:
          error.status === 401
            ? "Please sign in to continue"
            : "Administrator access required",
      },
      { status: error.status }
    );
  if (error instanceof ZodError)
    return NextResponse.json(
      { error: error.issues[0]?.message ?? "Invalid input" },
      { status: 400 }
    );
  if (error instanceof HttpError)
    return NextResponse.json(
      { error: error.message },
      { status: error.status }
    );
  const cause = (error as { cause?: { code?: string } })?.cause;
  if (cause?.code === "23505")
    return NextResponse.json(
      { error: "That name or slug already exists" },
      { status: 409 }
    );
  if (cause?.code === "23503")
    return NextResponse.json(
      { error: "This item is linked to other records. Unpublish it instead." },
      { status: 409 }
    );
  console.error(
    "Marketplace request failed",
    error instanceof Error ? error.message : "Unknown error"
  );
  return NextResponse.json(
    { error: "Unable to complete this request. Please try again." },
    { status: 500 }
  );
}
export async function readBody(request: Request, max: number) {
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, "Request body required");
  let size = 0;
  const chunks: Uint8Array[] = [];
  while (true) {
    const part = await reader.read();
    if (part.done) break;
    size += part.value.length;
    if (size > max) {
      await reader.cancel();
      throw new HttpError(413, "Request is too large");
    }
    chunks.push(part.value);
  }
  return Buffer.concat(chunks);
}
export async function readJson(request: Request, max = 8 * 1024 * 1024) {
  const body = await readBody(request, max);
  try {
    return JSON.parse(body.toString("utf8"));
  } catch {
    throw new HttpError(400, "Invalid JSON body");
  }
}
