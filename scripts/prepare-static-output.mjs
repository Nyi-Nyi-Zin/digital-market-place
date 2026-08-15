import { cp, mkdir, rm, writeFile } from "node:fs/promises";

const destination = new URL("../dist/public/", import.meta.url);
const nextStatic = new URL("../.next/static/", import.meta.url);
const publicDir = new URL("../public/", import.meta.url);

await rm(destination, { recursive: true, force: true });
await mkdir(destination, { recursive: true });
await cp(nextStatic, new URL("_next/", destination), { recursive: true });
try {
  await cp(publicDir, destination, { recursive: true, force: true });
} catch {
  // A public directory is optional for this application.
}
await writeFile(new URL("deployment-ready.txt", destination), "Cloud Nine Next.js static assets\n");
