export const ALLOWED_SCREENSHOT_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MAX_SCREENSHOT_BYTES = 5 * 1024 * 1024;
export function validateScreenshot(contentType: string, size: number) { if (!(ALLOWED_SCREENSHOT_TYPES as readonly string[]).includes(contentType)) throw new Error("Unsupported screenshot type"); if (size > MAX_SCREENSHOT_BYTES) throw new Error("Screenshot must be 5 MB or smaller"); return true; }
export function calculateServerTotal(items: Array<{ price: number; discountPrice?: number | null; quantity?: number }>) { return items.reduce((sum, item) => sum + (item.discountPrice ?? item.price) * Math.max(1, item.quantity ?? 1), 0); }
