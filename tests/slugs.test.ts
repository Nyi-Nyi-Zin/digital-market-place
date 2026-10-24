import { describe, expect, it, vi } from "vitest";
import { insertWithGeneratedSlug } from "@marketplace/server/slugs";

describe("server-generated slugs", () => {
  it("normalizes titles and trims separators", async () => {
    const insert = vi.fn(async (slug: string) => ({ slug }));
    expect(
      await insertWithGeneratedSlug(
        "  Café & Design Kit!  ",
        240,
        "product",
        insert
      )
    ).toEqual({ slug: "cafe-design-kit" });
  });
  it("retries a unique-index collision without losing either product", async () => {
    const slugs = new Set<string>();
    const insert = async (slug: string) => {
      if (slugs.has(slug)) return undefined;
      slugs.add(slug);
      return { slug };
    };
    const results = await Promise.all(
      Array.from({ length: 3 }, () =>
        insertWithGeneratedSlug("Same title", 240, "product", insert)
      )
    );
    expect(new Set(results.map(row => row.slug)).size).toBe(3);
    expect(results[0].slug).toBe("same-title");
  });
  it.each(["မြန်မာစာအုပ်", "日本語", "💜", "---"])(
    "handles non-Latin or empty normalized names: %s",
    async name => {
      const result = await insertWithGeneratedSlug(
        name,
        140,
        "category",
        async slug => ({ slug })
      );
      expect(result.slug).toMatch(/^category-[a-z0-9-]+$/);
    }
  );
  it("reserves space for the suffix on long duplicate names", async () => {
    const insert = vi
      .fn()
      .mockResolvedValueOnce(undefined)
      .mockImplementation(async slug => ({ slug }));
    const result = await insertWithGeneratedSlug(
      "Long title ".repeat(60),
      140,
      "category",
      insert
    );
    expect(result.slug.length).toBeLessThanOrEqual(140);
    expect(result.slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  });
  it("propagates database failures instead of treating them as collisions", async () => {
    const insert = vi.fn().mockRejectedValue(new Error("database unavailable"));
    await expect(
      insertWithGeneratedSlug("Kit", 240, "product", insert)
    ).rejects.toThrow("database unavailable");
    expect(insert).toHaveBeenCalledTimes(1);
  });
});
