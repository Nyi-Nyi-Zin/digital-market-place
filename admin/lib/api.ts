export async function api<T = Record<string, unknown>>(
  url: string,
  init?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: {
      ...(init?.body instanceof FormData
        ? {}
        : { "content-type": "application/json" }),
      ...init?.headers,
    },
  });
  const text = await response.text();
  let data: Record<string, unknown> = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { error: text };
  }
  if (!response.ok)
    throw new Error(String(data.error ?? "Unable to complete request"));
  return data as T;
}
