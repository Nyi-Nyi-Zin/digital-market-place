import {
  cp,
  mkdir,
  stat,
  readdir,
  readFile,
  lstat,
  writeFile,
} from "node:fs/promises";
import { fileURLToPath } from "node:url";

const site = process.argv[2];
if (!["customer", "admin"].includes(site))
  throw new Error("Usage: node scripts/package-site.mjs <customer|admin>");
const folder = site === "admin" ? "admin" : "customer-web";
const root = new URL("../", import.meta.url);
const source = new URL(`${folder}/.next/standalone/`, root);
// A fresh output avoids mixing files from a previous app build.
const output = new URL(`dist/${folder}-${Date.now()}/`, root);
await stat(new URL(`${folder}/server.js`, source));
await mkdir(output, { recursive: true });
// Materialize only traced files. Dereferencing pnpm's original directory links
// copies whole installed packages and changes where Node resolves dependencies.
await cp(source, output, {
  recursive: true,
  filter: filename => !filename.split(/[\\/]/).includes("node_modules"),
});
const versions = new Map();
const copyPackage = async directory => {
  if ((await lstat(directory)).isSymbolicLink()) return;
  let pkg;
  try {
    pkg = JSON.parse(
      await readFile(new URL("package.json", directory), "utf8")
    );
  } catch (error) {
    if (error.code === "ENOENT") return;
    throw error;
  }
  if (versions.has(pkg.name)) {
    if (versions.get(pkg.name) !== pkg.version)
      throw new Error(
        `Conflicting traced versions of ${pkg.name}; use the native standalone output on the deployment platform.`
      );
    return;
  }
  versions.set(pkg.name, pkg.version);
  await cp(directory, new URL(`node_modules/${pkg.name}/`, output), {
    recursive: true,
    filter: filename =>
      !filename
        .slice(fileURLToPath(directory).length)
        .split(/[\\/]/)
        .includes("node_modules"),
  });
};
const store = new URL("node_modules/.pnpm/", source);
for (const entry of await readdir(store, { withFileTypes: true })) {
  if (!entry.isDirectory() || entry.name === "node_modules") continue;
  const modules = new URL(`${entry.name}/node_modules/`, store);
  for (const pkg of await readdir(modules, { withFileTypes: true })) {
    if (pkg.name.startsWith("@")) {
      const scope = new URL(`${pkg.name}/`, modules);
      for (const child of await readdir(scope))
        await copyPackage(new URL(`${child}/`, scope));
    } else await copyPackage(new URL(`${pkg.name}/`, modules));
  }
}
await writeFile(
  new URL("package.json", output),
  JSON.stringify({ private: true, type: "module" }) + "\n"
);
await cp(
  new URL(`${folder}/.next/static/`, root),
  new URL(`${folder}/.next/static/`, output),
  { recursive: true }
);
await cp(
  new URL(`${folder}/public/`, root),
  new URL(`${folder}/public/`, output),
  { recursive: true }
);
console.log(`Standalone artifact: ${fileURLToPath(output)}`);
console.log(
  `Included ${versions.size} traced runtime packages; no workspace node_modules links.`
);
console.log(
  `Start: node ${fileURLToPath(new URL(`${folder}/server.js`, output))}`
);
