export const ALLOWED_SCREENSHOT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
export function validateScreenshot(contentType: string, size: number) {
  if (!(ALLOWED_SCREENSHOT_TYPES as readonly string[]).includes(contentType))
    throw new Error("Unsupported screenshot type");
  if (size > MAX_SCREENSHOT_BYTES)
    throw new Error("Screenshot must be 5 MB or smaller");
  return true;
}
export const NOTIFICATION_KINDS = [
  "payment_submitted",
  "payment_approved",
  "payment_rejected",
  "product_purchased",
  "product_updated",
] as const;
export function assertApprovedDownload(approved: boolean) {
  if (!approved) throw new Error("Payment approval required");
  return true;
}
export function calculateServerTotal(
  items: Array<{
    price: number;
    discountPrice?: number | null;
    quantity?: number;
  }>
) {
  return items.reduce(
    (sum, item) =>
      sum +
      (item.discountPrice ?? item.price) * Math.max(1, item.quantity ?? 1),
    0
  );
}

export function validateImageBytes(contentType: string, bytes: Uint8Array) {
  validateScreenshot(contentType, bytes.byteLength);
  const data = Buffer.from(bytes);
  const valid =
    contentType === "image/png"
      ? data
          .subarray(0, 8)
          .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
      : contentType === "image/jpeg"
        ? data[0] === 255 && data[1] === 216 && data[2] === 255
        : data.subarray(0, 4).toString() === "RIFF" &&
          data.subarray(8, 12).toString() === "WEBP";
  if (!valid)
    throw new Error("The file contents do not match the selected image format");
  return true;
}
