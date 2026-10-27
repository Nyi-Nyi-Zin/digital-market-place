import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));

async function stylesheets(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });
  const files = await Promise.all(
    entries.map(entry => {
      const file = path.join(directory, entry.name);
      return entry.isDirectory()
        ? stylesheets(file)
        : entry.name.endsWith(".css")
          ? [file]
          : [];
    })
  );
  return files.flat();
}

let checked = 0;
for (const site of ["customer-web", "admin"]) {
  const require = createRequire(path.join(root, site, "package.json"));
  const tailwind = require("@tailwindcss/postcss");
  const postcss = createRequire(require.resolve("@tailwindcss/postcss"))(
    "postcss"
  );
  const app = path.join(root, site, "app");
  const entry = path.join(app, "tailwind.css");
  const config = JSON.parse(
    await fs.readFile(path.join(root, site, "components.json"), "utf8")
  );
  if (config.tailwind.css !== "app/tailwind.css") {
    throw new Error(`${site}: shadcn must use app/tailwind.css`);
  }
  for (const file of await stylesheets(app)) {
    const source = await fs.readFile(file, "utf8");
    const ast = postcss.parse(source, { from: file });
    if (
      file !== entry &&
      !ast.nodes.some(
        node => node.type === "atrule" && node.name === "reference"
      )
    ) {
      throw new Error(`${file}: missing Tailwind @reference`);
    }
    ast.walkDecls(declaration => {
      if (declaration.prop.startsWith("--")) return;
      for (let parent = declaration.parent; parent; parent = parent.parent) {
        if (
          parent.type === "atrule" &&
          (parent.name === "theme" ||
            parent.name === "font-face" ||
            parent.name === "property" ||
            parent.name.endsWith("keyframes"))
        ) {
          return;
        }
      }
      throw declaration.error(
        "Author page and component styles with Tailwind utilities or @apply."
      );
    });
    const result = await postcss([tailwind({ optimize: false })]).process(
      source,
      {
        from: file,
      }
    );
    if (result.css.includes("@apply ")) {
      throw new Error(`${file}: unresolved Tailwind @apply`);
    }
    checked++;
  }
}

console.log(
  `Tailwind: ${checked} stylesheets compiled across both applications.`
);
