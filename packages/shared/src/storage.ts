// Safe to import in client components. Credentials and signing stay on the server.
export function storageUrl(key: string) {
  return `/storage/${key.split("/").map(encodeURIComponent).join("/")}`;
}
