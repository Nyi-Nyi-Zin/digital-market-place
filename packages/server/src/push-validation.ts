import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { z } from "zod";

// Only browser push services are accepted. These endpoints are credentials: never log them.
export function validPushEndpoint(value: string) {
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    return (
      value.length <= 2048 &&
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      !url.hash &&
      !url.port &&
      (host === "fcm.googleapis.com" ||
        host === "updates.push.services.mozilla.com" ||
        host.endsWith(".push.services.mozilla.com") ||
        host === "web.push.apple.com" ||
        host.endsWith(".push.apple.com") ||
        host.endsWith(".notify.windows.com"))
    );
  } catch {
    return false;
  }
}
export function publicPushAddress(address: string) {
  if (isIP(address) === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(
      a === 0 ||
      a === 10 ||
      a === 127 ||
      a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 0 || b === 168)) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) ||
      (a === 203 && b === 0)
    );
  }
  // Globally routable IPv6 only; exclude documentation and mapped IPv4 addresses.
  return (
    isIP(address) === 6 &&
    /^[23]/i.test(address) &&
    !/^2001:db8:/i.test(address)
  );
}
export async function assertPublicPushEndpoint(endpoint: string) {
  if (!validPushEndpoint(endpoint)) throw new Error("Invalid push endpoint");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const addresses = await Promise.race([
    lookup(new URL(endpoint).hostname, { all: true }),
    new Promise<never>((_, reject) => {
      timer = setTimeout(
        () => reject(new Error("Push DNS lookup timed out")),
        3000
      );
    }),
  ]).finally(() => clearTimeout(timer));
  if (
    !addresses.length ||
    addresses.some(row => !publicPushAddress(row.address))
  )
    throw new Error("Invalid push endpoint");
}
export const pushSubscriptionInput = z
  .object({
    endpoint: z.string().refine(validPushEndpoint, "Invalid push endpoint"),
    keys: z
      .object({
        p256dh: z
          .string()
          .regex(/^[A-Za-z0-9_-]+={0,2}$/)
          .refine(
            s => Buffer.from(s, "base64url").length === 65,
            "Invalid push key"
          ),
        auth: z
          .string()
          .regex(/^[A-Za-z0-9_-]+={0,2}$/)
          .refine(
            s => Buffer.from(s, "base64url").length === 16,
            "Invalid push key"
          ),
      })
      .strict(),
  })
  .strict();
