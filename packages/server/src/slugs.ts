import { randomUUID } from "node:crypto";

// The unique database index arbitrates concurrent creates; no check-then-insert race.
export async function insertWithGeneratedSlug<T>(
  name: string,
  maxLength: number,
  fallback: string,
  insert: (slug: string) => Promise<T | undefined>
): Promise<T> {
  const base =
    name
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || fallback;
  for (let attempt = 0; attempt < 5; attempt++) {
    const suffix = attempt || base === fallback ? `-${randomUUID()}` : "";
    const slug =
      base.slice(0, maxLength - suffix.length).replace(/-+$/g, "") + suffix;
    const result = await insert(slug);
    if (result !== undefined) return result;
  }
  throw new Error("Could not generate a unique URL. Please try again.");
}
