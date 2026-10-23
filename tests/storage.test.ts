import { PassThrough } from "node:stream";
import { createHash } from "node:crypto";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  digitalUploadLimitMB,
  parseStorageKey,
  storageGetSignedUrl,
  storagePut,
} from "@marketplace/server/storage";

const png = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1]);
beforeEach(() => {
  vi.stubEnv("CLOUDINARY_CLOUD_NAME", "test-cloud");
  vi.stubEnv("CLOUDINARY_API_KEY", "test-key");
  vi.stubEnv("CLOUDINARY_API_SECRET", "test-secret");
  vi.stubEnv("CLOUDINARY_MAX_FILE_MB", "10");
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

function mockUpload() {
  return vi
    .spyOn(cloudinary.uploader, "upload_stream")
    .mockImplementation((options, callback) => {
      const stream = new PassThrough();
      stream.resume();
      stream.on("finish", () =>
        callback?.(undefined, {
          public_id: options.public_id,
          resource_type: options.resource_type,
          type: options.type,
          format: "png",
        } as UploadApiResponse)
      );
      return stream as ReturnType<typeof cloudinary.uploader.upload_stream>;
    });
}

describe("Cloudinary storage", () => {
  it("uploads thumbnails publicly and returns an application URL without credentials", async () => {
    const upload = mockUpload();
    const result = await storagePut(
      "product-thumbnails/test.png",
      png,
      "image/png"
    );
    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({
        resource_type: "image",
        type: "upload",
        overwrite: false,
        cloud_name: "test-cloud",
        public_id: expect.stringMatching(
          /^product-thumbnails\/test_[a-f0-9]+$/
        ),
      }),
      expect.any(Function)
    );
    expect(result.key).toMatch(
      /^cloudinary\/image\/upload\/product-thumbnails\/test_[a-f0-9]+\.png$/
    );
    expect(result.url).toBe(`/storage/${result.key}`);
    expect(JSON.stringify(result)).not.toContain("test-secret");
  });
  it("uploads payment evidence as authenticated images", async () => {
    const upload = mockUpload();
    const result = await storagePut(
      "payment-screenshots/1/2.png",
      png,
      "image/png"
    );
    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "authenticated",
        resource_type: "image",
      }),
      expect.any(Function)
    );
    expect(parseStorageKey(result.key).deliveryType).toBe("authenticated");
  });
  it("keeps digital file extensions in authenticated raw public IDs", async () => {
    const upload = mockUpload();
    const result = await storagePut(
      "product-files/book.pdf",
      Buffer.from("pdf"),
      "application/pdf"
    );
    expect(upload).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "authenticated",
        resource_type: "raw",
        public_id: expect.stringMatching(/\.pdf$/),
      }),
      expect.any(Function)
    );
    expect(parseStorageKey(result.key).publicId).toMatch(/\.pdf$/);
  });
  it("does not classify digital files by an untrusted image MIME type", async () => {
    mockUpload();
    const result = await storagePut(
      "product-files/book.zip",
      Buffer.from("zip"),
      "image/png"
    );
    expect(parseStorageKey(result.key).resourceType).toBe("raw");
  });
  it("gives repeated uploads different keys", async () => {
    mockUpload();
    const first = await storagePut(
      "payment-screenshots/1/2.png",
      png,
      "image/png"
    );
    const second = await storagePut(
      "payment-screenshots/1/2.png",
      png,
      "image/png"
    );
    expect(first.key).not.toBe(second.key);
  });
  it("rejects missing credentials before contacting Cloudinary", async () => {
    const upload = mockUpload();
    vi.stubEnv("CLOUDINARY_API_SECRET", "");
    await expect(
      storagePut("product-thumbnails/test.png", png, "image/png")
    ).rejects.toMatchObject({ status: 503 });
    expect(upload).not.toHaveBeenCalled();
  });
  it("rejects spoofed images before uploading", async () => {
    const upload = mockUpload();
    await expect(
      storagePut(
        "payment-screenshots/1/2.png",
        Buffer.from("fake"),
        "image/png"
      )
    ).rejects.toThrow("contents");
    expect(upload).not.toHaveBeenCalled();
  });
  it("enforces the configured raw file limit before uploading", async () => {
    const upload = mockUpload();
    vi.stubEnv("CLOUDINARY_MAX_FILE_MB", "1");
    await expect(
      storagePut("product-files/book.zip", Buffer.alloc(1024 * 1024 + 1))
    ).rejects.toMatchObject({ status: 413 });
    expect(upload).not.toHaveBeenCalled();
  });
  it.each(["0", "26", "NaN", "1.5"])("rejects invalid limit %s", limit => {
    vi.stubEnv("CLOUDINARY_MAX_FILE_MB", limit);
    expect(digitalUploadLimitMB).toThrow("integer from 1 to 25");
  });
  it("sanitizes provider errors", async () => {
    vi.spyOn(cloudinary.uploader, "upload_stream").mockImplementation(
      (_options, callback) => {
        const stream = new PassThrough();
        stream.resume();
        stream.on("finish", () =>
          callback?.({ message: "test-secret", http_code: 401, name: "Error" })
        );
        return stream as ReturnType<typeof cloudinary.uploader.upload_stream>;
      }
    );
    await expect(
      storagePut("product-thumbnails/test.png", png, "image/png")
    ).rejects.toMatchObject({ status: 502 });
    await expect(
      storagePut("product-thumbnails/test.png", png, "image/png")
    ).rejects.not.toThrow("test-secret");
  });
  it("returns an optimized HTTPS CDN URL for public thumbnails", async () => {
    const url = await storageGetSignedUrl(
      "cloudinary/image/upload/product-thumbnails/test.png"
    );
    expect(url).toContain(
      "https://res.cloudinary.com/test-cloud/image/upload/"
    );
    expect(url).toContain("f_auto,q_auto");
    expect(url).not.toContain("signature=");
  });
  it.each([
    [
      "cloudinary/image/authenticated/payment-screenshots/1/2.png",
      "image",
      "payment-screenshots/1/2",
      "png",
    ],
    [
      "cloudinary/raw/authenticated/product-files/book.pdf",
      "raw",
      "product-files/book.pdf",
      null,
    ],
  ])(
    "creates an expiring signed URL for %s",
    async (key, resource, publicId, format) => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-10-23T10:00:00Z"));
      const url = new URL(await storageGetSignedUrl(key));
      expect(url.origin).toBe("https://api.cloudinary.com");
      expect(url.pathname).toBe(`/v1_1/test-cloud/${resource}/download`);
      expect(url.searchParams.get("public_id")).toBe(publicId);
      expect(url.searchParams.get("format")).toBe(format);
      expect(url.searchParams.get("type")).toBe("authenticated");
      expect(Number(url.searchParams.get("expires_at"))).toBe(
        Date.now() / 1000 + 300
      );
      const params = [...url.searchParams]
        .filter(([name]) => name !== "api_key" && name !== "signature")
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([name, value]) => `${name}=${value}`)
        .join("&");
      expect(url.searchParams.get("signature")).toBe(
        createHash("sha256").update(`${params}test-secret`).digest("hex")
      );
      expect(url.toString()).not.toContain("test-secret");
    }
  );
  it.each([
    "product-thumbnails/legacy.png",
    "https://example.com/image.png",
    "cloudinary/image/upload/payment-screenshots/1/2.png",
    "cloudinary/raw/upload/product-files/book.pdf",
    "cloudinary/image/authenticated/../payment.png",
  ])("rejects legacy or unsafe keys: %s", async key => {
    await expect(storageGetSignedUrl(key)).rejects.toMatchObject({
      status: 404,
    });
  });
});
