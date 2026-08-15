import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const dist = new URL("../dist/", import.meta.url);
const standalone = new URL("../.next/standalone/", import.meta.url);
const staticFiles = new URL("../.next/static/", import.meta.url);
const publicDir = new URL("../public/", import.meta.url);

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(standalone, dist, { recursive: true });
await cp(staticFiles, new URL(".next/static/", dist), { recursive: true });
try { await cp(publicDir, new URL("public/", dist), { recursive: true, force: true }); } catch {}
await mkdir(new URL("public/", dist), { recursive: true });
await cp(new URL("server.js", dist), new URL("index.js", dist));
await writeFile(new URL("package.json", dist), JSON.stringify({ type: "module" }));
await writeFile(new URL("public/deployment-ready.txt", dist), "Cloud Nine Next.js production assets\n");
