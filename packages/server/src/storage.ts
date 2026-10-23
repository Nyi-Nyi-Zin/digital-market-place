import { randomUUID } from "node:crypto";
import { v2 as cloudinary, type UploadApiResponse } from "cloudinary";
import { storageUrl } from "@marketplace/shared/storage";
import { HttpError } from "./http";
import { validateImageBytes } from "./validation";

function getCloudinaryConfig() {
  const cloud_name = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const api_key = process.env.CLOUDINARY_API_KEY?.trim();
  const api_secret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloud_name || !api_key || !api_secret)
    throw new HttpError(503, "Cloudinary storage is not configured");
  return {
    cloud_name,
    api_key,
    api_secret,
    secure: true,
    signature_algorithm: "sha256",
  };
}

export function digitalUploadLimitMB() {
  const limit = Number(process.env.CLOUDINARY_MAX_FILE_MB ?? 10);
  if (!Number.isInteger(limit) || limit < 1 || limit > 25)
    throw new HttpError(
      503,
      "CLOUDINARY_MAX_FILE_MB must be an integer from 1 to 25"
    );
  return limit;
}

// Keys record provider and delivery type. Old keys are never silently treated as
// Cloudinary assets. Image public IDs omit extensions; raw public IDs include them.
export function parseStorageKey(key: string) {
  const match =
    /^cloudinary\/(image|raw)\/(upload|authenticated)\/([a-zA-Z0-9_/-]+)\.([a-z0-9]+)$/.exec(
      key
    );
  if (!match || key.length > 512 || match[3].split("/").some(part => !part))
    throw new HttpError(
      404,
      "File unavailable. Re-upload legacy files to Cloudinary."
    );
  const [, resourceType, deliveryType, path, format] = match;
  if (
    deliveryType === "upload" &&
    (resourceType !== "image" || !path.startsWith("product-thumbnails/"))
  )
    throw new HttpError(404, "File unavailable");
  return {
    resourceType: resourceType as "image" | "raw",
    deliveryType: deliveryType as "upload" | "authenticated",
    publicId: resourceType === "raw" ? `${path}.${format}` : path,
    format: resourceType === "raw" ? "" : format,
  };
}

export async function storagePut(
  relKey: string,
  data: Buffer | Uint8Array | string,
  contentType = "application/octet-stream"
): Promise<{ key: string; url: string }> {
  const config = getCloudinaryConfig();
  const normalized = relKey.replace(/^\/+/, "");
  if (
    !/^[a-zA-Z0-9_/-]+\.[a-z0-9]+$/.test(normalized) ||
    normalized.includes("//")
  )
    throw new HttpError(400, "Invalid upload key");
  const bytes =
    typeof data === "string" ? Buffer.from(data) : Buffer.from(data);
  const resourceType =
    !normalized.startsWith("product-files/") && contentType.startsWith("image/")
      ? "image"
      : "raw";
  if (resourceType === "image") validateImageBytes(contentType, bytes);
  else if (!bytes.length || bytes.length > digitalUploadLimitMB() * 1024 * 1024)
    throw new HttpError(
      413,
      `Digital files must be ${digitalUploadLimitMB()} MB or smaller`
    );
  const type =
    resourceType === "image" && normalized.startsWith("product-thumbnails/")
      ? "upload"
      : "authenticated";
  const lastDot = normalized.lastIndexOf(".");
  const path = `${normalized.slice(0, lastDot)}_${randomUUID().replaceAll("-", "")}`;
  const publicId =
    resourceType === "raw" ? `${path}${normalized.slice(lastDot)}` : path;
  const result = await new Promise<UploadApiResponse>((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        ...config,
        resource_type: resourceType,
        type,
        public_id: publicId,
        overwrite: false,
        timeout: 60_000,
      },
      (error, response) => {
        if (error || !response) {
          reject(
            new HttpError(
              error?.http_code === 413 ? 413 : 502,
              "Cloudinary upload failed. Check your account limits and storage configuration."
            )
          );
        } else resolve(response);
      }
    );
    stream.on("error", () =>
      reject(new HttpError(502, "Cloudinary upload failed"))
    );
    stream.end(bytes);
  });
  if (
    result.public_id !== publicId ||
    result.resource_type !== resourceType ||
    result.type !== type
  )
    throw new HttpError(502, "Cloudinary returned an unexpected asset");
  const key = `cloudinary/${resourceType}/${type}/${result.public_id}${resourceType === "image" ? `.${result.format}` : ""}`;
  parseStorageKey(key);
  return { key, url: storageUrl(key) };
}

export async function storageGet(
  key: string
): Promise<{ key: string; url: string }> {
  parseStorageKey(key);
  return { key, url: storageUrl(key) };
}

// Call only after checking file ownership/administrator access.
export async function storageGetSignedUrl(key: string): Promise<string> {
  const asset = parseStorageKey(key);
  const config = getCloudinaryConfig();
  if (asset.deliveryType === "upload")
    return cloudinary.url(asset.publicId, {
      cloud_name: config.cloud_name,
      secure: true,
      resource_type: "image",
      type: "upload",
      format: asset.format,
      quality: "auto",
      fetch_format: "auto",
    });
  return cloudinary.utils.private_download_url(asset.publicId, asset.format, {
    ...config,
    resource_type: asset.resourceType,
    type: "authenticated",
    attachment: asset.resourceType === "raw",
    expires_at: Math.floor(Date.now() / 1000) + 300,
  });
}
