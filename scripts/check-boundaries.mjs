import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const root = fileURLToPath(new URL("../", import.meta.url));
const walk = directory =>
  fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    if (["node_modules", ".next", ".next-dev"].includes(entry.name)) return [];
    const filename = path.join(directory, entry.name);
    return entry.isDirectory()
      ? walk(filename)
      : /\.(ts|tsx|mjs)$/.test(filename)
        ? [filename]
        : [];
  });
const failures = [];
for (const directory of [
  "customer-web",
  "admin",
  "packages/server",
  "packages/shared",
]) {
  const base = path.join(root, directory);
  const manifest = JSON.parse(
    fs.readFileSync(path.join(base, "package.json"), "utf8")
  );
  const declared = new Set(
    Object.keys({
      ...manifest.dependencies,
      ...manifest.devDependencies,
      ...manifest.peerDependencies,
    })
  );
  for (const filename of walk(base)) {
    const source = ts.createSourceFile(
      filename,
      fs.readFileSync(filename, "utf8"),
      ts.ScriptTarget.Latest,
      true
    );
    const report = message =>
      failures.push(`${path.relative(root, filename)}: ${message}`);
    for (const statement of source.statements) {
      if (
        !ts.isImportDeclaration(statement) &&
        !ts.isExportDeclaration(statement)
      )
        continue;
      const specifier = statement.moduleSpecifier;
      if (!specifier || !ts.isStringLiteral(specifier)) continue;
      const value = specifier.text;
      const appAlias =
        value.startsWith("@/") && ["admin", "customer-web"].includes(directory);
      if (value.startsWith(".") || appAlias) {
        const resolved = appAlias
          ? path.resolve(
              directory === "customer-web" ? path.join(base, "app") : base,
              value.slice(2)
            )
          : path.resolve(path.dirname(filename), value);
        if (!resolved.startsWith(base + path.sep)) {
          // Next config may share build tooling, never app implementation.
          if (
            !(
              filename.endsWith("next.config.mjs") &&
              resolved === path.join(root, "scripts/site-config.mjs")
            )
          )
            report(`import escapes its package: ${value}`);
        }
        if (
          ![
            resolved,
            ...[".ts", ".tsx", ".mjs", ".json", "/index.ts"].map(
              ext => resolved + ext
            ),
          ].some(p => fs.existsSync(p))
        )
          report(`missing local import: ${value}`);
      } else if (!value.startsWith("node:") && value !== "server-only") {
        const dependency = value.startsWith("@")
          ? value.split("/").slice(0, 2).join("/")
          : value.split("/")[0];
        if (!declared.has(dependency))
          report(`undeclared dependency: ${dependency}`);
        if (
          directory === "packages/shared" &&
          value.startsWith("@marketplace/server")
        )
          report("shared code must not depend on server code");
        const isType =
          ts.isImportDeclaration(statement) &&
          statement.importClause?.isTypeOnly;
        if (
          source.statements.some(
            s =>
              ts.isExpressionStatement(s) &&
              ts.isStringLiteral(s.expression) &&
              s.expression.text === "use client"
          ) &&
          value.startsWith("@marketplace/server") &&
          !isType
        )
          report("server import in client component must be type-only");
      }
    }
  }
}
if (failures.length) {
  console.error(failures.join("\n"));
  process.exitCode = 1;
} else
  console.log(
    "App/package boundaries, local imports and direct dependency declarations passed."
  );
